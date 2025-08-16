import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import socket from '../api/socket';
import Countdown from '../components/Countdown';
import BidBox from '../components/BidBox';

export default function AuctionDetail() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [highest, setHighest] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [counterOffer, setCounterOffer] = useState(null);

  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (userId && !userId.includes('-')) {
      localStorage.removeItem('userId');
      userId = null;
    }
    if (!userId) {
      userId = `temp_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  const deleteBid = async (bidId) => {
    if (!confirm('Are you sure you want to delete this bid?')) {
      return;
    }

    try {
      await api.delete(`/auctions/${id}/bid/${bidId}`);
      
      setBidHistory(prev => prev.filter(bid => bid.id !== bidId));
      
      if (window.addNotification) {
        window.addNotification('Bid deleted successfully!', 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete bid';
      if (window.addNotification) {
        window.addNotification(errorMessage, 'error');
      }
    }
  };

  const loadCounterOffer = async () => {
    try {
      const response = await api.get(`/auctions/${id}/counter-offer`);
      setCounterOffer(response.data.counterOffer);
    } catch (error) {
      setCounterOffer(null);
    }
  };

  const respondToCounterOffer = async (action) => {
    const actionText = action === 'accept' ? 'accept' : 'reject';
    if (!confirm(`Are you sure you want to ${actionText} this counter offer?`)) {
      return;
    }

    try {
      await api.post(`/auctions/${id}/counter-offer/${action}`);
      
      if (window.addNotification) {
        window.addNotification(
          `Counter offer ${action}ed successfully!`, 
          action === 'accept' ? 'success' : 'info'
        );
      }
      
      loadAuctionData();
      loadCounterOffer();
    } catch (error) {
      const errorMessage = error.response?.data?.error || `Failed to ${actionText} counter offer`;
      if (window.addNotification) {
        window.addNotification(errorMessage, 'error');
      }
    }
  };

  useEffect(() => {
    loadAuctionData();
    loadCounterOffer();
  }, [id]);

  useEffect(() => {
    if (!auction) return;

    const userId = getUserId();
    socket.emit('joinAuction', { auctionId: id, userId });
    setConnectionStatus('connected');

    socket.on('auction:status', (data) => {
      console.log('Auction status:', data);
    });

    socket.on('bid:new', (data) => {
      console.log('New bid received:', data);
      
      if (data.auction?.currentHighest) {
        setHighest(data.auction.currentHighest);
      }
      
      setBidHistory(prev => [data.bid, ...prev.slice(0, 9)]);
      
      if (window.addNotification) {
        window.addNotification(
          `New bid: ₹${data.bid.amount} by ${data.bid.bidderName}`,
          'info'
        );
      }
    });

    socket.on('bid:outbid', (data) => {
      if (data.outbidUserId === userId) {
        if (window.addNotification) {
          window.addNotification(
            `You've been outbid! New leading bid: ₹${data.outbidBy?.amount}`,
            'warning'
          );
        }
      }
    });

    socket.on('auction:started', (data) => {
      setAuction(prev => ({ ...prev, status: 'live' }));
      if (window.addNotification) {
        window.addNotification(
          `Auction "${data.auction.title}" is now live!`,
          'success'
        );
      }
    });

    socket.on('auction:ended', (data) => {
      setAuction(prev => ({ ...prev, status: 'ended' }));
      if (window.addNotification) {
        window.addNotification(
          `Auction "${data.auction.title}" has ended!`,
          'info'
        );
      }
    });

    socket.on('seller:decision', (data) => {
      if (data.decision === 'ACCEPTED') {
        setAuction(prev => ({ ...prev, status: 'closed' }));
        if (window.addNotification) {
          window.addNotification(
            data.message,
            'success'
          );
        }
      } else if (data.decision === 'REJECTED') {
        setAuction(prev => ({ ...prev, status: 'ended' }));
        if (window.addNotification) {
          window.addNotification(
            data.message,
            'error'
          );
        }
      }
    });

    socket.on('auction:won', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'success'
        );
      }
    });

    socket.on('bid:rejected', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'error'
        );
      }
    });

    socket.on('viewer:joined', (data) => {
      setViewerCount(data.viewerCount);
    });

    socket.on('viewer:left', (data) => {
      setViewerCount(data.viewerCount);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('counter-offer:made', (data) => {
      setAuction(prev => ({ ...prev, status: 'counter-offer' }));
      loadCounterOffer(); 
      
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'info'
        );
      }
    });

    socket.on('counter-offer:received', (data) => {
      loadCounterOffer(); 
      
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'warning'
        );
      }
    });

    socket.on('counter-offer:accepted', (data) => {
      setAuction(prev => ({ ...prev, status: 'closed' }));
      setCounterOffer(null); 
      
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'success'
        );
      }
    });

    socket.on('counter-offer:rejected', (data) => {
      setAuction(prev => ({ ...prev, status: 'ended' }));
      setCounterOffer(null); 
      
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'info'
        );
      }
    });

    socket.on('counter-offer:success', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'success'
        );
      }
    });

    socket.on('counter-offer:buyer-accepted', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'success'
        );
      }
    });

    socket.on('counter-offer:rejected-confirmed', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'info'
        );
      }
    });

    socket.on('counter-offer:buyer-rejected', (data) => {
      if (window.addNotification) {
        window.addNotification(
          data.message,
          'error'
        );
      }
    });

    return () => {
      socket.emit('leaveAuction', { auctionId: id });
      socket.off('auction:status');
      socket.off('bid:new');
      socket.off('bid:outbid');
      socket.off('auction:started');
      socket.off('auction:ended');
      socket.off('seller:decision');
      socket.off('auction:won');
      socket.off('bid:rejected');
      socket.off('viewer:joined');
      socket.off('viewer:left');
      socket.off('disconnect');
      socket.off('connect');
      socket.off('counter-offer:made');
      socket.off('counter-offer:received');
      socket.off('counter-offer:accepted');
      socket.off('counter-offer:rejected');
      socket.off('counter-offer:success');
      socket.off('counter-offer:buyer-accepted');
      socket.off('counter-offer:rejected-confirmed');
      socket.off('counter-offer:buyer-rejected');
    };
  }, [id, auction]);

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/auctions/${id}`);
      setAuction(response.data);
      setHighest(response.data.currentHighestBid);
    } catch (err) {
      setError('Failed to load auction details');
      console.error('Error loading auction:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return '#28a745';
      case 'ended': return '#dc3545';
      case 'closed': return '#6f42c1';
      case 'scheduled': return '#6c757d';
      case 'counter-offer': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#28a745';
      case 'disconnected': return '#dc3545';
      default: return '#ffc107';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '2rem',
        textAlign: 'center'
      }}>
        Loading auction details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '2rem'
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
        <Link to="/" style={{ color: '#007bff' }}>← Back to Home</Link>
      </div>
    );
  }

  if (!auction) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '2rem',
        textAlign: 'center'
      }}>
        Auction not found
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" style={{ color: '#007bff' }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Back Navigation */}
      <div className="mb-4 sm:mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
        >
          ← <span className="ml-1">Back to Home</span>
        </Link>
      </div>

      {/* Connection Status */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
          }`}></span>
          <span className="text-sm font-medium">
            {connectionStatus === 'connected' ? 'Live Updates Active' : 'Connecting...'}
          </span>
        </div>
        {viewerCount > 0 && (
          <div className="text-sm text-gray-600">
            👥 {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Auction Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        {/* Title and Status */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {auction.title}
          </h1>
          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white self-start ${
            auction.status === 'live' ? 'bg-green-500' :
            auction.status === 'scheduled' ? 'bg-blue-500' :
            auction.status === 'ended' ? 'bg-red-500' : 'bg-gray-500'
          }`}>
            {auction.status.toUpperCase()}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed">
          {auction.description}
        </p>

        {/* Auction Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Starting Price</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPrice(auction.startingPrice)}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Bid Increment</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPrice(auction.bidIncrement)}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg sm:col-span-2 lg:col-span-1">
            <div className="text-sm font-medium text-gray-500 mb-1">Seller</div>
            <div className="text-lg font-semibold text-gray-900">
              {auction.seller?.displayName || 'Anonymous'}
            </div>
          </div>
        </div>

        {/* Countdown for Live Auctions */}
        {auction.status === 'live' && (
          <div className="mt-4">
            <Countdown 
              endAt={auction.endAt} 
              onComplete={() => setAuction(prev => ({ ...prev, status: 'ended' }))}
            />
          </div>
        )}
      </div>

      {/* Current Highest Bid */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 text-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Current Highest Bid
        </h2>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
          {formatPrice(highest?.amount || auction.startingPrice)}
        </div>
        {highest && (
          <div className="text-sm sm:text-base text-gray-600">
            by <span className="font-medium">{highest.displayName}</span> • {new Date(highest.at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Bid Box */}
      <div className="mb-4 sm:mb-6">
        <BidBox 
          auctionId={id} 
          highest={highest} 
          increment={auction.bidIncrement}
          auction={auction}
        />
      </div>

      {/* Counter Offer Section */}
      {counterOffer && counterOffer.buyerId === getUserId() && counterOffer.status === 'pending' && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
            🤝 Counter Offer Received!
          </h3>
          
          <div className="bg-white p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Your Original Bid</div>
                <div className="text-lg font-semibold text-gray-900">
                  ₹{counterOffer.originalBid?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Seller's Counter Offer</div>
                <div className="text-lg font-semibold text-blue-600">
                  ₹{counterOffer.counterOfferAmount?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Expires:</span> {new Date(counterOffer.expiresAt).toLocaleString()}
            </div>
          </div>

          <div className="bg-yellow-100 p-3 rounded-lg mb-4 text-sm text-yellow-800">
            The seller has proposed a different price. You can accept or reject this counter offer.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => respondToCounterOffer('accept')}
              className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Accept Counter Offer
            </button>
            <button
              onClick={() => respondToCounterOffer('reject')}
              className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject Counter Offer
            </button>
          </div>
        </div>
      )}

      {/* Counter Offer Info for Others */}
      {counterOffer && counterOffer.buyerId !== getUserId() && auction?.status === 'counter-offer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-6 text-center">
          <div className="text-blue-800 font-semibold mb-2">
            Counter offer pending buyer response
          </div>
          <div className="text-sm text-blue-700">
            Seller proposed: ₹{counterOffer.counterOfferAmount?.toLocaleString('en-IN')}
          </div>
        </div>
      )}

      {/* Bid History */}
      {bidHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bids</h3>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {bidHistory.map((bid, index) => {
              const isMyBid = bid.bidderId === getUserId();
              const isHighestBid = highest && bid.id === highest.bidId;
              
              return (
                <div 
                  key={bid.id || index}
                  className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg border-b border-gray-100 last:border-b-0 ${
                    isMyBid ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="mb-2 sm:mb-0">
                    <div className="font-semibold text-lg text-gray-900">
                      {formatPrice(bid.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      by <span className="font-medium">{bid.bidderName}</span>
                      {isMyBid && (
                        <span className="text-blue-600 font-semibold ml-1">(You)</span>
                      )}
                      {isHighestBid && (
                        <span className="text-green-600 font-semibold ml-1">(Highest)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(bid.createdAt).toLocaleTimeString()}
                    </span>
                    {isMyBid && !isHighestBid && auction?.status === 'live' && (
                      <button
                        onClick={() => deleteBid(bid.id)}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                        title="Delete your bid"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}