// const multer = require('multer');

// const storage = multer.memoryStorage(); // Store files in memory buffer

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
//   fileFilter: (req, file, cb) => {
//     const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];

//     if (allowedMimeTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only PDF, JPEG, and PNG files are allowed.'));
//     }
//   },
// });

// module.exports = upload;

const multer = require('multer');

const storage = multer.memoryStorage(); // Store files in memory buffer

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
