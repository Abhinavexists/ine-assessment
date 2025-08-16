const express = require('express');
const { User } = require('../models');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

const notifications = new Map();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userNotifications = notifications.get(userId) || [];
    
    res.json({
      notifications: userNotifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        auctionId: notification.auctionId,
        read: notification.read,
        createdAt: notification.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:id/read', authenticateUser, async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.user.id;
    
    const userNotifications = notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.read = true;
    
    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification.id,
        read: notification.read
      }
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

function addNotification(userId, notification) {
  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }
  
  const userNotifications = notifications.get(userId);
  userNotifications.push({
    id: `${Date.now()}-${Math.random()}`,
    ...notification,
    read: false,
    createdAt: new Date().toISOString()
  });
  
  if (userNotifications.length > 50) {
    userNotifications.shift();
  }
}

module.exports = {
  router,
  addNotification
};