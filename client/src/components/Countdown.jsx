import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export default function Countdown({ endAt, onComplete }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = dayjs();
      const end = dayjs(endAt);
      const diff = end.diff(now);

      if (diff <= 0) {
        setTimeLeft('Ended');
        setIsExpired(true);
        if (onComplete) onComplete();
        return;
      }

      const duration = dayjs.duration(diff);
      const days = Math.floor(duration.asDays());
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      let timeString = '';
      
      if (days > 0) {
        timeString = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        timeString = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeString = `${minutes}m ${seconds}s`;
      } else {
        timeString = `${seconds}s`;
      }

      setTimeLeft(timeString);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endAt, onComplete]);

  const getColor = () => {
    if (isExpired) return '#dc3545';
    
    const now = dayjs();
    const end = dayjs(endAt);
    const diff = end.diff(now);
    const minutes = dayjs.duration(diff).asMinutes();
    
    if (minutes < 5) return '#dc3545';
    if (minutes < 30) return '#fd7e14';
    return '#28a745';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: getColor(),
      fontWeight: 'bold',
      fontSize: '0.9rem'
    }}>
      <span>⏰</span>
      <span>{isExpired ? 'Auction Ended' : `Ends in: ${timeLeft}`}</span>
    </div>
  );
}