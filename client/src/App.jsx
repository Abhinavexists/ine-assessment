import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuctionDetail from './pages/AuctionDetail';
import SellerConsole from './pages/SellerConsole';
import Notifications from './components/Notifications';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Notifications />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auction/:id" element={<AuctionDetail />} />
        <Route path="/sell" element={<SellerConsole />} />
        
        <Route path="*" element={
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            fontFamily: 'Arial, sans-serif'
          }}>
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/" style={{ color: '#007bff' }}>← Go back to Home</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
