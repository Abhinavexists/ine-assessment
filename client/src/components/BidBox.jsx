import { useState, useEffect } from 'react';
import { Gavel, TrendingUp, DollarSign, AlertCircle, Loader2, CheckCircle, Lock } from 'lucide-react';
import api from '../api/axios';

export default function BidBox({ auctionId, highest, increment, auction }) {
  const [amount, setAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const currentHighest = highest?.amount || auction?.startingPrice || 0;
    const minimumBid = currentHighest + (increment || 1);
    setAmount(minimumBid);
  }, [highest, increment, auction]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

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

  const placeBid = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/auctions/${auctionId}/bid`, {
        userId: getUserId(),
        amount: amount
      });

      setSuccess('Bid placed successfully! 🎉');
      
      const newMinimum = amount + (increment || 1);
      setAmount(newMinimum);

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error placing bid';
      setError(errorMessage);
      
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value);
    setAmount(value);
    setError('');
  };

  const quickBidOptions = (minBid) => {
    return [
      minBid,
      minBid + increment,
      minBid + (increment * 2),
      minBid + (increment * 5)
    ];
  };

  const currentHighest = highest?.amount || auction?.startingPrice || 0;
  const minimumBid = currentHighest + (increment || 1);
  const isValidBid = amount >= minimumBid;

  const isActive = auction?.status === 'live';
  const isOwnAuction = auction?.sellerId === getUserId();

  if (!isActive) {
    return (
      <div className="card">
        <div className="card-content text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
            <Lock className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Auction Inactive
          </h3>
          <p className="text-slate-600">
            This auction is no longer accepting bids
          </p>
        </div>
      </div>
    );
  }

  if (isOwnAuction) {
    return (
      <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-warning-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-warning-800">
              Cannot Bid on Own Auction
            </h3>
            <p className="text-sm text-warning-700">
              You cannot place bids on your own auction
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-content">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
            <Gavel className="h-5 w-5 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Place Your Bid
          </h3>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Current Highest</span>
            <span className="font-semibold text-slate-900">{formatPrice(currentHighest)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
            <span className="text-sm text-primary-700">Minimum Bid</span>
            <span className="font-bold text-primary-900">{formatPrice(minimumBid)}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quick Bid Options
          </label>
          <div className="grid grid-cols-2 gap-2">
            {quickBidOptions(minimumBid).map((bidAmount, index) => (
              <button
                key={index}
                onClick={() => setAmount(bidAmount)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  amount === bidAmount
                    ? 'border-primary-300 bg-primary-100 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {formatPrice(bidAmount)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Custom Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              min={minimumBid}
              step={increment || 1}
              className={`input pl-10 ${
                !isValidBid ? 'border-danger-300 focus-visible:ring-danger-500' : ''
              }`}
              placeholder={`Min: ${formatPrice(minimumBid)}`}
            />
          </div>
          {!isValidBid && (
            <p className="mt-1 text-sm text-danger-600">
              Bid must be at least {formatPrice(minimumBid)}
            </p>
          )}
        </div>

        <button
          onClick={placeBid}
          disabled={!isValidBid || isLoading}
          className={`w-full flex items-center justify-center gap-2 ${
            isValidBid && !isLoading 
              ? 'btn btn-primary btn-lg' 
              : 'btn btn-lg bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Placing Bid...
            </>
          ) : (
            <>
              <TrendingUp className="h-5 w-5" />
              Place Bid {formatPrice(amount)}
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-danger-600 mr-2" />
              <p className="text-sm text-danger-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-lg bg-success-50 border border-success-200">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-success-600 mr-2" />
              <p className="text-sm text-success-800">{success}</p>
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-900 mb-2">Bidding Guidelines</h4>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Bids must be in increments of {formatPrice(increment)}</li>
            <li>• All bids are final and cannot be retracted</li>
            <li>• Highest bid when auction ends wins</li>
          </ul>
        </div>
      </div>
    </div>
  );
}