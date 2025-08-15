require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const sequelize = require('./db');

const userRoutes = require('./routes/users');
const auctionRoutes = require('./routes/auctions');
const notificationRoutes = require('./routes/notifications');
const cronRoutes = require('./routes/cron');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cron', cronRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const { initSockets } = require('./ws');
const { setIO } = require('./utils/broadcast');

initSockets(io);
setIO(io);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Models synced');
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('DB connection failed:', err);
    process.exit(1);
  }
})();
