require('dotenv').config();

const sequelize = require('./db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Models synced');
  } catch (err) {
    console.error('DB connection failed:', err);
  }
})();
