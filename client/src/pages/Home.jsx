import { useEffect, useState } from 'react';
import api from '../api/axios';
import socket from '../api/socket';
import AuctionCard from '../components/AuctionCard';

export default function Home() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('live');

  useEffect(() => {
    loadAuctions();
  }, [filter]);

  useEffect(() => {
    socket.on('auction:system:started', (data) => {
      if (window.addNotification) {
        window.addNotification(
          `New auction started: "${data.title}"`,
          'info'
        );
      }
      if (filter === 'live') {
        loadAuctions();
      }
    });

    socket.on('auction:system:ended', (data) => {
      if (window.addNotification) {
        window.addNotification(
          `Auction ended: "${data.title}"`,
          'info'
        );
      }
      loadAuctions();
    });

    return () => {
      socket.off('auction:system:started');
      socket.off('auction:system:ended');
    };
  }, [filter]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/auctions?status=${filter}`);
      setAuctions(response.data.auctions || []);
    } catch (err) {
      setError('Failed to load auctions. Please try again.');
      console.error('Error loading auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    { value: 'live', label: 'Live Auctions' },
    { value: 'scheduled', label: 'Upcoming' },
    { value: 'ended', label: 'Ended' },
    { value: 'closed', label: 'Sold' }
  ];

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>
          Live Auction Platform
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a 
            href="/sell" 
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            + Create Auction
          </a>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: filter === option.value ? '#007bff' : '#fff',
              color: filter === option.value ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: filter === option.value ? 'bold' : 'normal'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: '#666'
        }}>
          <div>Loading auctions...</div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
          <button 
            onClick={loadAuctions}
            style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {auctions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: '#666',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <h3>No {filter} auctions found</h3>
              <p>
                {filter === 'live' 
                  ? 'There are no live auctions at the moment. Check back soon!'
                  : `No ${filter} auctions available.`
                }
              </p>
              {filter !== 'live' && (
                <button 
                  onClick={() => setFilter('live')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View Live Auctions
                </button>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}>
              {auctions.map(auction => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && auctions.length > 0 && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          Showing {auctions.length} {filter} auction{auctions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}