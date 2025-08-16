import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

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

  const getNotificationClasses = (type) => {
    const baseClasses = 'mb-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 animate-slide-in';
    
    switch (type) {
      case 'success':
        return `${baseClasses} border-success-200 bg-success-50 text-success-800`;
      case 'error':
        return `${baseClasses} border-danger-200 bg-danger-50 text-danger-800`;
      case 'warning':
        return `${baseClasses} border-warning-200 bg-warning-50 text-warning-800`;
      default:
        return `${baseClasses} border-primary-200 bg-primary-50 text-primary-800`;
    }
  };

  const getIcon = (type) => {
    const iconClasses = 'h-5 w-5 flex-shrink-0';
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-success-600`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-danger-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-warning-600`} />;
      default:
        return <Info className={`${iconClasses} text-primary-600`} />;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={getNotificationClasses(notification.type)}
        >
          <div className="flex items-start">
            <div className="flex">
              {getIcon(notification.type)}
            </div>
            
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
              <p className="mt-1 text-xs opacity-75">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 inline-flex flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}