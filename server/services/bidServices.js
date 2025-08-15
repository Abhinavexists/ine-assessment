const redis = require('../redis');
const { Auction, Bid, User } = require('../../models');

async function setAuctionStatus(auctionId, status) {
  await redis.set(`auction:${auctionId}:status`, status);
}

async function cleanupAuction(auctionId) {
  await redis.del(`auction:${auctionId}:highest`);
  await redis.del(`auction:${auctionId}:lock`);
  await redis.del(`auction:${auctionId}:status`);
}

async function placeBid(auctionId, userId, amount) {
  const lockKey = `auction:${auctionId}:lock`;
  const lockToken = `${Date.now()}-${Math.random()}`;

  const lockAcquired = await redis.set(lockKey, lockToken, { nx: true, px: 2000 });
  if (lockAcquired !== 'OK') {
    throw new Error('BID_LOCKED');
  }

  try {
    const status = await redis.get(`auction:${auctionId}:status`);
    if (status !== 'live') throw new Error('AUCTION_NOT_LIVE');

    const highestRaw = await redis.get(`auction:${auctionId}:highest`);
    const highest = highestRaw ? JSON.parse(highestRaw) : null;

    const auction = await Auction.findByPk(auctionId);
    const now = new Date();
    if (now < auction.startAt || now > auction.endAt) throw new Error('AUCTION_OUT_OF_WINDOW');

    const minAmount = Math.max(auction.startingPrice, highest?.amount || 0) + Number(auction.bidIncrement);
    if (Number(amount) < minAmount) throw new Error('BID_TOO_LOW');

    const bid = await Bid.create({ auctionId, bidderId: userId, amount });

    await redis.set(`auction:${auctionId}:highest`, JSON.stringify({
      amount: Number(amount),
      bidId: bid.id,
      userId,
      displayName: (await User.findByPk(userId)).displayName,
      at: Date.now(),
    }));

    return bid;
  } finally {
    const val = await redis.get(lockKey);
    if (val === lockToken) await redis.del(lockKey);
  }
}

async function initializeAuction(auctionId) {
  await setAuctionStatus(auctionId, 'live');
  const auction = await Auction.findByPk(auctionId);
  if (auction.startingPrice > 0) {
    await redis.set(`auction:${auctionId}:highest`, JSON.stringify({
      amount: auction.startingPrice,
      bidId: null,
      userId: null,
      displayName: 'Starting Price',
      at: Date.now(),
    }));
  }
}

async function endAuction(auctionId) {
  await setAuctionStatus(auctionId, 'ended');
  await cleanupAuction(auctionId);
}

module.exports = { 
  placeBid, 
  setAuctionStatus, 
  cleanupAuction, 
  initializeAuction, 
  endAuction 
};
