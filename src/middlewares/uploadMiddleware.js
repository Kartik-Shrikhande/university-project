const multer = require('multer');

const storage = multer.memoryStorage(); // Store files in memory buffer

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
