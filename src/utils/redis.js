// redis.js
require("dotenv").config();
const { createClient } = require("redis");

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redisClient.connect().catch((err) => {
  console.error("❌ Redis connection failed:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis Cloud");
});

module.exports = redisClient;
