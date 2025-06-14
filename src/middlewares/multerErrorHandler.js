const multer = require('multer');

const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size should not exceed 5MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Other generic errors (optional)
  return res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

module.exports = globalErrorHandler;
