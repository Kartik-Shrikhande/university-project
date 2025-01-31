// const jwt = require('jsonwebtoken');
// const Agent = require('../models/agentModel');

// const authentication = async (req, res, next) => {
//   try {
//     let token = req.headers.authorization;

//     // Check if token is present
//     if (!token) {
//       return res.status(401).json({ message: 'Token is not present' });
//     }

//     // Remove 'Bearer' prefix if present
//     token = token.split(' ')[1];

//     // Verify the token
//     jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
//       if (err) {
//         return res.status(401).json({ message: 'Invalid or expired token' });
//       }

//       // Find the agent using the token's `id`
//       const agent = await Agent.findById(decodedToken.id);
//       if (!agent) {
//         return res.status(404).json({ message: 'Agent not found' });
//       }

//       req.agentId = agent._id;
//       next();
//     });
//   } catch (error) {
//     console.error('Authentication Error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };




// // const authorization = async (req, res, next) => {
// //   try {
// //     const agentId = req.agentId; // Retrieved from authentication middleware

// //     // Validate `agentId`
// //     if (!mongoose.Types.ObjectId.isValid(agentId)) {
// //       return res.status(400).json({ message: 'Invalid agent ID provided.' });
// //     }

// //     // Fetch the agent
// //     const agent = await agentModel.findById(agentId);

// //     if (!agent) {
// //       return res.status(404).json({ message: 'Agent not found.' });
// //     }

// //     // Check if the user has the 'Admin' role
// //     if (agent.role !== 'Admin') {
// //       return res.status(403).json({
// //         message: 'Unauthorized access. Only Admin agents can access this route.',
// //       });
// //     }

// //     next(); // Proceed to the route handler if the agent is an admin
// //   } catch (error) {
// //     console.error('Authorization Error:', error);
// //     return res.status(500).json({ message: 'Internal server error.' });
// //   }
// // };

// // module.exports = authorization;



// module.exports = { authentication };
