import { Link } from 'react-router-dom';
import Countdown from './Countdown';

export default function AuctionCard({ auction }) {
  const statusColors = {
    scheduled: '#6c757d',
    live: '#28a745',
    ended: '#dc3545',
    closed: '#6f42c1'
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1rem',
      minWidth: '300px',
      maxWidth: '350px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: statusColors[auction.status] || '#6c757d',
        marginBottom: '0.5rem'
      }}>
        {auction.status.toUpperCase()}
      </div>

      <h3 style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>
        {auction.title}
      </h3>
      
      <p style={{ 
        color: '#666', 
        fontSize: '0.9rem', 
        margin: '0.5rem 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {auction.description}
      </p>

      <div style={{ margin: '0.5rem 0' }}>
        <strong>Starting Price: </strong>
        {formatPrice(auction.startingPrice)}
      </div>

      <div style={{ margin: '0.5rem 0' }}>
        <strong>Bid Increment: </strong>
        {formatPrice(auction.bidIncrement)}
      </div>

      {auction.status === 'live' && (
        <div style={{ margin: '0.5rem 0' }}>
          <Countdown endAt={auction.endAt} />
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <Link 
          to={`/auction/${auction.id}`}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          {auction.status === 'live' ? 'Join Auction' : 'View Details'}
        </Link>
      </div>
    </div>
  );
}