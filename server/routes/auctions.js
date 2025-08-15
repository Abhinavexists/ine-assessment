const express = require('express');
const { Op } = require('sequelize');
const { Auction, Bid, User } = require('../models');
const { placeBid, endAuction } = require('../services/bidServices');
const redis = require('../redis');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status = 'live', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    const now = new Date();
    
    switch (status) {
      case 'live':
        whereClause = {
          startAt: { [Op.lte]: now },
          endAt: { [Op.gt]: now },
          status: 'live'
        };
        break;
      case 'scheduled':
        whereClause = {
          startAt: { [Op.gt]: now },
          status: 'scheduled'
        };
        break;
      case 'ended':
        whereClause = {
          endAt: { [Op.lte]: now },
          status: 'ended'
        };
        break;
      default:
        whereClause = { status };
    }
    
    const auctions = await Auction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'displayName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const auctionsWithBids = await Promise.all(
      auctions.rows.map(async (auction) => {
        const auctionData = auction.toJSON();
        
        if (status === 'live') {
          try {
            const highestBidRaw = await redis.get(`auction:${auction.id}:highest`);
            auctionData.currentHighestBid = highestBidRaw || null;
          } catch (error) {
            console.error(`Error fetching highest bid for auction ${auction.id}:`, error);
            auctionData.currentHighestBid = null;
          }
        }
        
        return auctionData;
      })
    );
    
    res.json({
      auctions: auctionsWithBids,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: auctions.count,
        totalPages: Math.ceil(auctions.count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const auction = await Auction.findByPk(id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'displayName', 'email']
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'bidder',
              attributes: ['id', 'displayName']
            }
          ],
          order: [['amount', 'DESC']],
          limit: 10
        }
      ]
    });
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    const auctionData = auction.toJSON();
    
    try {
      const highestBidRaw = await redis.get(`auction:${id}:highest`);
      auctionData.currentHighestBid = highestBidRaw || null;
      
      const auctionStatus = await redis.get(`auction:${id}:status`);
      auctionData.liveStatus = auctionStatus || null;
    } catch (error) {
      console.error(`Error fetching Redis data for auction ${id}:`, error);
      auctionData.currentHighestBid = null;
      auctionData.liveStatus = null;
    }
    
    res.json(auctionData);
    
  } catch (error) {
    console.error('Error fetching auction details:', error);
    res.status(500).json({ error: 'Failed to fetch auction details' });
  }
});

router.post('/:id/bid', async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ 
        error: 'userId and amount are required' 
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Bid amount must be positive' 
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    if (auction.sellerId === userId) {
      return res.status(403).json({ 
        error: 'Cannot bid on your own auction' 
      });
    }
    
    const bid = await placeBid(auctionId, userId, amount);
    
    const highestBidRaw = await redis.get(`auction:${auctionId}:highest`);
    
    const io = req.app.get('io');
    io.to(`auction-${auctionId}`).emit('bid-update', {
      auctionId,
      bid: {
        id: bid.id,
        amount: bid.amount,
        bidderId: bid.bidderId,
        bidderName: user.displayName,
        createdAt: bid.createdAt
      },
      currentHighest: highestBidRaw
    });
    
    res.status(201).json({
      message: 'Bid placed successfully',
      bid: {
        id: bid.id,
        amount: bid.amount,
        auctionId: bid.auctionId,
        bidderId: bid.bidderId,
        createdAt: bid.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error placing bid:', error);
    
    if (error.message === 'BID_LOCKED') {
      return res.status(409).json({ 
        error: 'Another bid is being processed. Please try again.' 
      });
    }
    
    if (error.message === 'AUCTION_NOT_LIVE') {
      return res.status(400).json({ 
        error: 'Auction is not currently live' 
      });
    }
    
    if (error.message === 'AUCTION_OUT_OF_WINDOW') {
      return res.status(400).json({ 
        error: 'Auction is not within the bidding window' 
      });
    }
    
    if (error.message === 'BID_TOO_LOW') {
      return res.status(400).json({ 
        error: 'Bid amount is too low' 
      });
    }
    
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { 
      sellerId, 
      title, 
      description, 
      startingPrice, 
      bidIncrement, 
      startAt, 
      endAt 
    } = req.body;
    
    if (!sellerId || !title || !startingPrice || !bidIncrement || !startAt || !endAt) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }
    
    const seller = await User.findByPk(sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    const now = new Date();
    
    if (startDate <= now) {
      return res.status(400).json({ 
        error: 'Start time must be in the future' 
      });
    }
    
    if (endDate <= startDate) {
      return res.status(400).json({ 
        error: 'End time must be after start time' 
      });
    }
    
    const auction = await Auction.create({
      sellerId,
      title,
      description,
      startingPrice: parseFloat(startingPrice),
      bidIncrement: parseFloat(bidIncrement),
      startAt: startDate,
      endAt: endDate,
      status: 'scheduled'
    });
    
    res.status(201).json({
      message: 'Auction created successfully',
      auction: {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startingPrice: auction.startingPrice,
        bidIncrement: auction.bidIncrement,
        startAt: auction.startAt,
        endAt: auction.endAt,
        status: auction.status,
        sellerId: auction.sellerId
      }
    });
    
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { sellerId } = req.body;
    
    if (!sellerId) {
      return res.status(400).json({ error: 'sellerId is required' });
    }
    
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    if (auction.sellerId !== sellerId) {
      return res.status(403).json({ 
        error: 'Only the auction owner can accept bids' 
      });
    }
    
    const highestBidRaw = await redis.get(`auction:${auctionId}:highest`);
    if (!highestBidRaw) {
      return res.status(400).json({ error: 'No bids to accept' });
    }
    
    await auction.update({ status: 'closed' });
    await endAuction(auctionId);
    
    const io = req.app.get('io');
    io.to(`auction-${auctionId}`).emit('auction-ended', {
      auctionId,
      status: 'closed',
      winningBid: highestBidRaw
    });
    
    res.json({
      message: 'Bid accepted successfully',
      auction: {
        id: auction.id,
        status: 'closed'
      },
      winningBid: highestBidRaw
    });
    
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { sellerId } = req.body;
    
    if (!sellerId) {
      return res.status(400).json({ error: 'sellerId is required' });
    }
    
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    if (auction.sellerId !== sellerId) {
      return res.status(403).json({ 
        error: 'Only the auction owner can reject bids' 
      });
    }
    
    const highestBidRaw = await redis.get(`auction:${auctionId}:highest`);
    
    await auction.update({ status: 'ended' });
    await endAuction(auctionId);
    
    const io = req.app.get('io');
    io.to(`auction-${auctionId}`).emit('auction-ended', {
      auctionId,
      status: 'ended',
      rejectedBid: highestBidRaw
    });
    
    res.json({
      message: 'Bid rejected successfully',
      auction: {
        id: auction.id,
        status: 'ended'
      }
    });
    
  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

module.exports = router;