const jwt = require('jsonwebtoken');
const University = require('../models/universityModel');


exports.authenticateUniversity = async (req, res, next) => {
    try {
      const token = req.header('Authorization').replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
  
      if (decoded.role !== 'University') {
        return res.status(403).json({ message: 'Access denied: Invalid role.' });
      }
  
      const university = await University.findById(decoded.id);
      if (!university) {
        return res.status(404).json({ message: 'University not found.' });
      }
  
      req.universityId = university._id; // Attach universityId to request object
      req.universityRole = university.role;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ message: 'Authentication failed.' });
    }
  };
  


exports.authorizeUniversityRole = (req, res, next) => {
    const { university } = req;
  
    if (!university || university.role !== 'University') {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
  
    next();
  };
  