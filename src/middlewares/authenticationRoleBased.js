const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');
const Agents = require('../models/agentModel');
const Solicitor = require("../models/solicitorModel");
const AssociateSolicitor = require('../models/associateModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');
const PaymentConfig = require('../models/paymentConfigModel');

//Previouse approach - in use
exports.authenticateUser = (req, res, next) => {
  try {
    const token = req.cookies.refreshtoken|| req.header('Authorization')?.split(' ')[1]; // Extract token from cookies

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Attach user details (ID & role) to request object
    req.user = {
      id: decoded.id,       // Extract user ID
      role: decoded.role,   // Extract user role
      agency: decoded.agency,
      exp: decoded.exp,     // Token expiration time
      iat: decoded.iat      // Token issued time
    };

    next(); // Proceed to the next middleware
  } catch (error) {

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
    const token = req.cookies?.refreshtoken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
      }

      const { id, role } = decoded;

      // Map roles to corresponding models
      const roleModels = {
        'student': Students,
        'agent': Agents,
        'solicitor': Solicitor,
        'Associate': AssociateSolicitor,
        'admin': Agency,
        'University': University
      };

      const UserModel = roleModels[role];
      if (!UserModel) {
        return res.status(400).json({ message: 'Invalid role.' });
      }

      // Fetch user
      const user = await UserModel.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({ message: `${role} not found.` });
      }

      // Check if token matches the user's current active token
      if (user.currentToken !== token) {
        return res.status(401).json({ message: 'Session expired. Please login again.' });
      }

    // ✅ Fetch current payment configuration dynamically
   // ✅ Get latest payment configuration
      const config = await PaymentConfig.findOne();
      const platformFee = config?.platformFee ?? 500; // use stored value directly
      const currency = config?.currency || 'GBP';


      // **Custom Response for Student Role**
      if (role === 'student') {
        return res.status(200).json({
          message: 'Token is valid.',
          role: role,
          token: token,
          user: {
            id: user._id,
            email: user.email,
            is_active: true,
            email_verified: user.isVerified || false,
            platform_fee_paid: user.isPaid || false,
            created_at: user.createdAt
          },
          platform_access: {
            courses_visible: user.isPaid || false,
            payment_required: !user.isPaid,
            message: user.isPaid
              ? 'You have access to all platform features.'
              : 'Pay the platform fee to view universities and courses.'
          },
          notifications: [
            {
              id: 'NOTIF-001',
              type: 'system',
              title: 'Welcome to Connect2Uni!',
              content: 'Complete your profile and pay the platform fee to proceed.',
              is_read: false,
              timestamp: new Date().toISOString()
            }
          ],
          applications: user.applications || [],
          visa_status: null,
        payment_prompt: !user.isPaid
            ? {
                type: 'platform_fee',       // ✅ added type field
                amount: platformFee,         // ✅ dynamically fetched
                currency,                    // ✅ dynamically fetched
              }
            : null
        });
      }

      // **Generic Response for Other Roles**
      return res.status(200).json({
        message: 'Token is valid.',
        userId: id,
        role: role
      });

    });

  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// added below function for providing access to all agency to agent
// Attach agencyId dynamically based on role

exports.resolveAgencyContext = async (req, res, next) => {
  try {
    // Only run for agent or admin roles
    if (req.user.role === 'agent') {
      const agent = await Agents.findById(req.user.id);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found.' });
      }
      // Overwrite req.user.id with agency id for all controllers to use transparently
      req.user.id = agent.agency.toString();
    }

    // admin already has their id as agencyId — no change needed

    next();
  } catch (error) {
    console.error('Error resolving agency context:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
