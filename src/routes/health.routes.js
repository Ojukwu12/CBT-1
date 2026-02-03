const express = require('express');
const mongoose = require('mongoose');
const { env } = require('../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    success: true,
    message: 'Server is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.status(200).json(healthcheck);
});

module.exports = router;
