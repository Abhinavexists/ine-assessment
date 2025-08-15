import { useState, useEffect } from 'react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  useEffect(() => {
    window.addNotification = addNotification;
    return () => {
      delete window.addNotification;
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyle = (type) => {
    const baseStyle = {
      padding: '12px 16px',
      marginBottom: '8px',
      borderRadius: '4px',
      borderLeft: '4px solid',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      animation: 'slideIn 0.3s ease-out'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, borderLeftColor: '#28a745', backgroundColor: '#d4edda' };
      case 'error':
        return { ...baseStyle, borderLeftColor: '#dc3545', backgroundColor: '#f8d7da' };
      case 'warning':
        return { ...baseStyle, borderLeftColor: '#ffc107', backgroundColor: '#fff3cd' };
      default:
        return { ...baseStyle, borderLeftColor: '#17a2b8', backgroundColor: '#d1ecf1' };
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      case 'warning': return '#856404';
      default: return '#0c5460';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        maxWidth: '350px',
        width: '100%'
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={getNotificationStyle(notification.type)}
            onClick={() => removeNotification(notification.id)}
          >
            <div style={{ 
              color: getTextColor(notification.type),
              fontWeight: '500'
            }}>
              {notification.message}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              opacity: 0.7,
              marginTop: '4px'
            }}>
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}