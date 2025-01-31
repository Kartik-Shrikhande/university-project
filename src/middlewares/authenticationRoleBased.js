const jwt = require('jsonwebtoken');

// exports.authenticateUser = (req, res, next) => {
//     const token = req.header('Authorization');
  
//     if (!token) {
//       return res.status(401).json({ message: 'Access denied. No token provided.' });
//     }
  
//     try {
//       const decoded = jwt.verify(token, process.env.SECRET_KEY);
//       req.user = decoded; // Attach user details to the request
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: 'Invalid token.' });
//     }
//   };

exports.authenticateUser = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const tokenWithoutBearer = token.split(' ')[1]; // Extract token without "Bearer"
    console.log('Token without Bearer:', tokenWithoutBearer); // Log token for debugging

    const decoded = jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY);

    console.log('Decoded Token:', decoded); // Log decoded token for debugging

    // Attach the user info to the request object
    req.user = decoded;

    // Ensure that the token has the necessary 'id' field
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Invalid token. User ID missing.' });
    }

    console.log('User ID:', req.user.id); // Log the user ID for debugging

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    // Handle specific errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid token format.' });
    }

    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Unauthorized role.' });
    }
    next();
  };
};
