const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');

exports.authenticateUser = (req, res, next) => {
  try {
    const token = req.cookies.refreshtoken; // Extract token from cookies

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Attach user details (ID & role) to request object
    req.user = {
      id: decoded.id,       // Extract user ID
      role: decoded.role,   // Extract user role
      exp: decoded.exp,     // Token expiration time
      iat: decoded.iat      // Token issued time
    };

    next(); // Proceed to the next middleware
  } catch (error) {
    // console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid token. Please log in again.' });
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token is not active yet. Please try again later.' });
    }

    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// exports.authenticateUser = (req, res, next) => {
//   try {
//     const token = req.cookies.refreshtoken

//     if (!token) {
//       return res.status(401).json({ message: 'Access denied. No token provided.' });
//     }

//     // const tokenWithoutBearer = token.split(' ')[1]; // Remove "Bearer" prefix
//     const decoded = jwt.verify(token, process.env.SECRET_KEY);

//     // console.log("Decoded Token:", decoded);  // Debugging: See decoded payload

//     // Attach user details (ID & role) to request object for further processing
//     req.user = {
//       id: decoded.id,       // Extract user ID
//       role: decoded.role,   // Extract user role
//       exp: decoded.exp,     // Token expiration time
//       iat: decoded.iat      // Token issued time
//     };

//     next();
//   } catch (error) {
//     console.error('Token verification error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };

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

// exports.authenticateUser = async(req, res, next) => {
//   const token = req.header('Authorization');

//   if (!token) {
//     return res.status(401).json({ message: 'Access denied. No token provided.' });
//   }

//   try {
//     const tokenWithoutBearer = token.split(' ')[1]; // Extract token without "Bearer"
//     console.log('Token without Bearer:', tokenWithoutBearer); // Log token for debugging

//     const decoded = jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY);

//     console.log('Decoded Token:', decoded); // Log decoded token for debugging


   
//     const user = decoded;
//     console.log('user:',user);

    
//       // Find the student using the token's `id`
//       const student = await Students.findById(user.id);
//       if (!student) {
//         return res.status(404).json({ message: 'Student not found' });
//       }
//       req.studentId = student._id;

//     // Ensure that the token has the necessary 'id' field
//     if (!user || !user.id) {
//       return res.status(401).json({ message: 'Invalid token. User ID missing.' });
//     }

//     console.log('User ID:', user.id); // Log the user ID for debugging

//     next();
//   } catch (error) {
//     console.error('Token verification error:', error);

//     // Handle specific errors
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({ message: 'Token has expired. Please log in again.' });
//     }

//     if (error.name === 'JsonWebTokenError') {
//       return res.status(400).json({ message: 'Invalid token format.' });
//     }

//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Unauthorized role.' });
    }
    next();
  };
};


exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    jwt.verify(refreshToken, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid refresh token.' });
      }

      const newAccessToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );

      return res.status(200).json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
      }

      const { id, role } = decoded;

      // **Check if the role is student, and fetch additional student details**
      let userDetails = null;
      let platformAccess = null;
      let notifications = [];
      let paymentStatus = null;

      if (role === "student") {
        const student = await Students.findById(id);

        if (!student) {
          return res.status(404).json({ message: "Student not found." });
        }

        // **Notifications Based on Payment Status**
        if (!student.isPaid) {
          notifications.push({
            id: "NOTIF-001",
            type: "system",
            title: "Welcome! Verify & Pay to Continue",
            content: "Your profile is locked. Pay the £100 platform fee to access courses.",
            is_read: false,
            timestamp: new Date().toISOString()
          });
        }

        if (student.isPaid) {
          notifications.push({
            id: "NOTIF-001",
            type: "system",
            title: "Welcome!you have access to dashboard",
            timestamp: new Date().toISOString()
          });
        }
        // **Student Response Data**
        userDetails = {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          platform_fee_paid: student.isPaid,
          profile_editable: !student.isPaid, // If not paid, profile cannot be edited
        };

        // **Platform Access Information**
        platformAccess = {
          courses_visible: student.isPaid, // Courses visible only if fee is paid
          allowed_actions: student.isPaid ? ["view_profile", "apply_to_courses"] : ["view_profile", "pay_platform_fee"],
          blocked_actions: student.isPaid ? [] : ["edit_profile", "apply_to_courses"]
        };

        // **Payment Status**
        paymentStatus = student.isPaid
          ? { platform_fee: "paid" }
          : {
              platform_fee: {
                amount: 100,
                currency: "GBP",
                description: "One-time platform access fee",
                payment_url: "/api/payments/platform-fee",
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7-day deadline
              }
            };
      }

      // **Final Response**
      return res.status(200).json({
        message: 'Token is valid.',
        userId: id,
        role: role,
        ...(userDetails && { user: userDetails }), // Include user details if student
        ...(platformAccess && { platform_access: platformAccess }), // Include platform access if student
        ...(notifications.length > 0 && { notifications }), // Include notifications if any
        ...(paymentStatus && { payment_status: paymentStatus }) // Include payment status if student
      });
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// exports.verifyToken = async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];

//     if (!token) {
//       return res.status(401).json({ message: 'No token provided.' });
//     }

//     jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
//       if (err) {
//         return res.status(403).json({ message: 'Invalid or expired token.' });
//       }

//       return res.status(200).json({
//         message: 'Token is valid.',
//         userId: decoded.id,
//         role: decoded.role
//       });
//     });
//   } catch (error) {
//     console.error('Verify token error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };

// module.exports = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ message: 'Unauthorized. No token provided.' });
//   }

//   const token = authHeader.split(' ')[1]; // Extract token

//   jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
//     if (err) {
//       return res.status(403).json({ message: 'Invalid or expired token.' });
//     }

//     req.user = decoded; // Attach decoded user info to request
//     next();
//   });
// };
// Token Verification API
