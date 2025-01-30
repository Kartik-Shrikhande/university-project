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
    console.log("No token provided in request.");
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const tokenWithoutBearer = token.split(' ')[1]; // Extract token without "Bearer"
    // console.log("Token extracted:", tokenWithoutBearer);

    const decoded = jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY);
    req.user = decoded; // Attach user details to the request
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};


  // Middleware for role-based access control
  exports.authorizeRoles = (roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Unauthorized role.' });
      }
      next();
    };
  };