const redisClient = require("../utils/redis");

// Cache middleware for ALL GET APIs
module.exports = async function cache(req, res, next) {
  try {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = req.originalUrl;  // Unique key for each route + query
    const cachedData = await redisClient.get(key);

    if (cachedData) {
      console.log("CACHE HIT =>", key);

      return res.status(200).json({
        cached: true,
        data: JSON.parse(cachedData)
      });
    }

    console.log("CACHE MISS =>", key);

    // Monkey patch res.json to cache the data before sending
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      redisClient.setEx(key, 300, JSON.stringify(body)); // TTL = 300 sec (5 min)
      return originalJson(body);
    };

    next();

  } catch (error) {
    console.log("Redis Cache Error:", error);
    next(); // fail gracefully
  }
};
