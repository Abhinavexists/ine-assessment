import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';
import RequireAuth from '../components/RequireAuth';

export default function SellerConsole() {
  const [form, setForm] = useState({
    sellerId: '',
    title: '',
    description: '',
    startingPrice: '',
    bidIncrement: '',
    startAt: '',
    endAt: ''
  });
  const [myAuctions, setMyAuctions] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [showCounterOfferFor, setShowCounterOfferFor] = useState(null);

  const getUserId = () => localStorage.getItem('userId');

  const createUserIfNeeded = async () => {
    let userId = localStorage.getItem('userId');
    
    if (userId && !userId.includes('-')) {
      localStorage.removeItem('userId');
      userId = null;
    }
    
    if (!userId) {
      try {
        const response = await api.post('/users/guest', {
          displayName: `Seller ${Math.random().toString(36).substr(2, 6)}`,
          email: `seller_${Math.random().toString(36).substr(2, 6)}@example.com`
        });
        
        userId = response.data.id;
        localStorage.setItem('userId', userId);
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        console.log('Created new user:', userId);
      } catch (error) {
        console.error('Failed to create user:', error);
        throw new Error('Failed to create user. Please try again.');
      }
    }
    
    return userId;
  };

  useEffect(() => {
    const initializeUser = async () => {
      const userId = await createUserIfNeeded();
      setForm(prev => ({ ...prev, sellerId: userId }));
      
      const now = dayjs();
      const start = now.add(1, 'hour');
      const end = start.add(24, 'hours');
      
      setForm(prev => ({
        ...prev,
        startAt: start.format('YYYY-MM-DDTHH:mm'),
        endAt: end.format('YYYY-MM-DDTHH:mm')
      }));

      loadMyAuctions();
    };

    initializeUser();
  }, []);

  const loadMyAuctions = async () => {
    try {
      setLoading(true);
      const userId = getUserId();

      const [liveResponse, scheduledResponse, endedResponse] = await Promise.all([
        api.get('/auctions?status=live'),
        api.get('/auctions?status=scheduled'),
        api.get('/auctions?status=ended')
      ]);
      
      const allAuctions = [
        ...(liveResponse.data.auctions || []),
        ...(scheduledResponse.data.auctions || []),
        ...(endedResponse.data.auctions || [])
      ];
      const sellerAuctions = allAuctions.filter(a => a.sellerId === userId);
      
      setMyAuctions(sellerAuctions);
    } catch (err) {
      console.error('Error loading auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setCreateError('');
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.description.trim()) return 'Description is required';
    if (!form.startingPrice || form.startingPrice <= 0) return 'Valid starting price is required';
    if (!form.bidIncrement || form.bidIncrement <= 0) return 'Valid bid increment is required';
    if (!form.startAt) return 'Start time is required';
    if (!form.endAt) return 'End time is required';
    
    const start = dayjs(form.startAt);
    const end = dayjs(form.endAt);
    const now = dayjs();
    
    if (start.isBefore(now)) return 'Start time must be in the future';
    if (end.isBefore(start)) return 'End time must be after start time';
    if (end.diff(start, 'minutes') < 30) return 'Auction must run for at least 30 minutes';
    
    return null;
  };

  const createAuction = async () => {
    const validationError = validateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const auctionData = {
        ...form,
        startingPrice: parseFloat(form.startingPrice),
        bidIncrement: parseFloat(form.bidIncrement)
      };

      await api.post('/auctions', auctionData);
      
      setCreateSuccess('Auction created successfully!');
      
      const userId = getUserId();
      const now = dayjs();
      const start = now.add(1, 'hour');
      const end = start.add(24, 'hours');
      
      setForm({
        sellerId: userId,
        title: '',
        description: '',
        startingPrice: '',
        bidIncrement: '',
        startAt: start.format('YYYY-MM-DDTHH:mm'),
        endAt: end.format('YYYY-MM-DDTHH:mm')
      });

      loadMyAuctions();

      setTimeout(() => setCreateSuccess(''), 5000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create auction';
      setCreateError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAuctionAction = async (auctionId, action) => {
    try {
      await api.post(`/auctions/${auctionId}/${action}`, {
        sellerId: getUserId()
      });
      
      if (window.addNotification) {
        window.addNotification(
          `Auction ${action}ed successfully!`,
          'success'
        );
      }

      loadMyAuctions();
    } catch (err) {
      const errorMessage = err.response?.data?.error || `Failed to ${action} auction`;
      if (window.addNotification) {
        window.addNotification(errorMessage, 'error');
      }
    }
  };

  const deleteAuction = async (auctionId) => {
    if (!confirm('Are you sure you want to delete this auction? This will permanently remove the auction and all its bids. This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/auctions/${auctionId}`, {
        data: { sellerId: getUserId() }
      });
      
      if (window.addNotification) {
        window.addNotification('Auction deleted successfully!', 'success');
      }

      loadMyAuctions();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete auction';
      if (window.addNotification) {
        window.addNotification(errorMessage, 'error');
      }
    }
  };

  const makeCounterOffer = async (auctionId) => {
    if (!counterOfferAmount || parseFloat(counterOfferAmount) <= 0) {
      if (window.addNotification) {
        window.addNotification('Please enter a valid counter offer amount', 'error');
      }
      return;
    }

    try {
      await api.post(`/auctions/${auctionId}/counter-offer`, {
        sellerId: getUserId(),
        counterOfferAmount: parseFloat(counterOfferAmount)
      });
      
      if (window.addNotification) {
        window.addNotification('Counter offer sent successfully!', 'success');
      }
      
      setShowCounterOfferFor(null);
      setCounterOfferAmount('');
      loadMyAuctions();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to send counter offer';
      if (window.addNotification) {
        window.addNotification(errorMessage, 'error');
      }
    }
  };

  const showCounterOfferForm = (auctionId) => {
    setShowCounterOfferFor(auctionId);
    setCounterOfferAmount('');
  };

  const cancelCounterOffer = () => {
    setShowCounterOfferFor(null);
    setCounterOfferAmount('');
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

  return (
    <RequireAuth fallback={
      <div style={{ 
        maxWidth: '600px', 
        margin: '2rem auto', 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h1 style={{ color: '#495057', marginBottom: '1rem' }}>Seller Console</h1>
        <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
          Please sign in to create and manage your auctions
        </p>
        <Link to="/" style={{ 
          color: '#007bff', 
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #007bff',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          ← Back to Home
        </Link>
      </div>
    }>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Seller Console</h1>
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
          >
            ← <span className="ml-1">Back to Home</span>
          </Link>
        </div>

        {/* Create New Auction Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Create New Auction</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Vintage Guitar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting Price (₹) *
              </label>
              <input
                type="number"
                value={form.startingPrice}
                onChange={(e) => handleInputChange('startingPrice', e.target.value)}
                placeholder="1000"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bid Increment (₹) *
              </label>
              <input
                type="number"
                value={form.bidIncrement}
                onChange={(e) => handleInputChange('bidIncrement', e.target.value)}
                placeholder="50"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => handleInputChange('startAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => handleInputChange('endAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 sm:mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the item..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            />
          </div>

          {createError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{createError}</p>
            </div>
          )}

          {createSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{createSuccess}</p>
            </div>
          )}

          <button
            onClick={createAuction}
            disabled={isCreating}
            className={`mt-4 sm:mt-6 w-full sm:w-auto px-6 py-3 font-semibold rounded-lg transition-colors ${
              isCreating 
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCreating ? 'Creating...' : 'Create Auction'}
          </button>
        </div>
      
        {/* My Auctions Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
            My Auctions ({myAuctions.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-600">
              Loading your auctions...
            </div>
          ) : myAuctions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              You haven't created any auctions yet.
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {myAuctions.map(auction => (
                <div 
                  key={auction.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-gray-50"
                >
                  {/* Title and Status */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{auction.title}</h4>
                    <div 
                      className={`inline-flex px-2 py-1 rounded text-xs font-semibold text-white self-start ${
                        auction.status === 'live' ? 'bg-green-500' :
                        auction.status === 'scheduled' ? 'bg-blue-500' :
                        auction.status === 'ended' ? 'bg-red-500' :
                        auction.status === 'counter-offer' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}
                    >
                      {auction.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {auction.description}
                  </p>

                  {/* Auction Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                    <div>
                      <div className="text-gray-500 font-medium">Starting</div>
                      <div className="font-semibold">{formatPrice(auction.startingPrice)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 font-medium">Increment</div>
                      <div className="font-semibold">{formatPrice(auction.bidIncrement)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 font-medium">Starts</div>
                      <div className="font-semibold">{dayjs(auction.startAt).format('MMM D, HH:mm')}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 font-medium">Ends</div>
                      <div className="font-semibold">{dayjs(auction.endAt).format('MMM D, HH:mm')}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link 
                      to={`/auction/${auction.id}`}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </Link>

                    <button
                      onClick={() => deleteAuction(auction.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                      title="Delete this auction"
                    >
                      Delete
                    </button>

                    {auction.status === 'ended' && (
                      <>
                        <button
                          onClick={() => handleAuctionAction(auction.id, 'accept')}
                          className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          Accept Bid
                        </button>
                        <button
                          onClick={() => showCounterOfferForm(auction.id)}
                          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          Counter Offer
                        </button>
                        <button
                          onClick={() => handleAuctionAction(auction.id, 'reject')}
                          className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                        >
                          Reject All
                        </button>
                      </>
                    )}

                    {auction.status === 'counter-offer' && (
                      <div className="px-3 py-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                        ⏰ Counter offer pending buyer response
                      </div>
                    )}

                    {/* Counter Offer Form */}
                    {showCounterOfferFor === auction.id && (
                      <div className="mt-3 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Make Counter Offer
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            value={counterOfferAmount}
                            onChange={(e) => setCounterOfferAmount(e.target.value)}
                            placeholder="Enter counter offer amount"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => makeCounterOffer(auction.id)}
                              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              Send
                            </button>
                            <button
                              onClick={cancelCounterOffer}
                              className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}