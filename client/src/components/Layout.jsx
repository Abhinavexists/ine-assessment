import { Link, useLocation } from 'react-router-dom';
import { Gavel, Plus, Home, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  useEffect(() => {
    const handleNewNotification = (message, type = 'info') => {
      const notification = {
        id: Date.now() + Math.random(),
        message,
        type,
        timestamp: new Date()
      };
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    };

    window.addNotification = handleNewNotification;
    return () => {
      delete window.addNotification;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown')) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="navbar">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Gavel className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-slate-900">
                AuctionHub
              </span>
            </Link>
    
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'text-primary-600' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Auctions</span>
              </Link>
              
              <Link
                to="/sell"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive('/sell') 
                    ? 'text-primary-600' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Sell</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative notification-dropdown">
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-danger-500 text-xs text-white flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 leading-relaxed">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-slate-200">
                        <button
                          onClick={() => setNotifications([])}
                          className="w-full text-xs text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link to="/sell" className="btn btn-primary btn-md hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Link>
              
              <Link to="/sell" className="btn btn-primary btn-md sm:hidden">
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="md:hidden border-t border-slate-200 pt-4 pb-3">
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Auctions</span>
              </Link>
              
              <Link
                to="/sell"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/sell') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Sell</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600 text-white">
                <Gavel className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-600">
                © 2024 AuctionHub. All rights reserved.
              </span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-slate-600">
              <a href="#" className="hover:text-slate-900">Privacy</a>
              <a href="#" className="hover:text-slate-900">Terms</a>
              <a href="#" className="hover:text-slate-900">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}