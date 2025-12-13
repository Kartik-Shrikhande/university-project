// rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../utils/redis');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,

  store: new RedisStore({
    sendCommand: async (...args) => redisClient.sendCommand(args)
  }),

  message: {
    status: 429,
    message: "Too many requests, try again after 1 minute."
  }
});

module.exports = apiRateLimiter;
