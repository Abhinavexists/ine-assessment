const express = require('express');
const { User } = require('../models');
const router = express.Router();

router.post('/guest', async (req, res) => {
  try {
    const { displayName, email } = req.body;
    
    if (!displayName || !email) {
      return res.status(400).json({ 
        error: 'displayName and email are required' 
      });
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }
    
    const user = await User.create({
      displayName,
      email,
      userType: 'guest'
    });
    
    res.status(201).json({
      id: user.id,
      displayName: user.displayName,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error creating guest user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: ['id', 'displayName', 'email', 'userType', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;