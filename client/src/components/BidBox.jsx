import { useState, useEffect } from 'react';
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
    if (!userId) {
      userId = `user_${Math.random().toString(36).substr(2, 9)}`;
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

  const currentHighest = highest?.amount || auction?.startingPrice || 0;
  const minimumBid = currentHighest + (increment || 1);
  const isValidBid = amount >= minimumBid;

  const isActive = auction?.status === 'live';
  const isOwnAuction = auction?.sellerId === getUserId();

  if (!isActive) {
    return (
      <div style={{
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6c757d', margin: 0 }}>
          This auction is no longer active
        </p>
      </div>
    );
  }

  if (isOwnAuction) {
    return (
      <div style={{
        padding: '1rem',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        backgroundColor: '#fff3cd',
        textAlign: 'center'
      }}>
        <p style={{ color: '#856404', margin: 0 }}>
          You cannot bid on your own auction
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff'
    }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Place Your Bid</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0.5rem 0', color: '#666' }}>
          Current Highest: <strong>{formatPrice(currentHighest)}</strong>
        </p>
        <p style={{ margin: '0.5rem 0', color: '#666' }}>
          Minimum Bid: <strong>{formatPrice(minimumBid)}</strong>
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem',
          fontWeight: 'bold'
        }}>
          Your Bid Amount:
        </label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          min={minimumBid}
          step={increment || 1}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: `1px solid ${isValidBid ? '#ddd' : '#dc3545'}`,
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        {!isValidBid && (
          <small style={{ color: '#dc3545' }}>
            Bid must be at least {formatPrice(minimumBid)}
          </small>
        )}
      </div>

      <button
        onClick={placeBid}
        disabled={!isValidBid || isLoading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: isValidBid && !isLoading ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: isValidBid && !isLoading ? 'pointer' : 'not-allowed'
        }}
      >
        {isLoading ? 'Placing Bid...' : `Place Bid ${formatPrice(amount)}`}
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}
    </div>
  );
}