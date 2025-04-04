const { check, body, param, validationResult } = require('express-validator');

// Validation for creating a new solicitor
exports.validateCreateSolicitor = [
  body('firstName')
    .notEmpty()
    .withMessage('First name is required.')
    .isString()
    .withMessage('First name must be a string.')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters.')
    .trim(),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required.')
    .isString()
    .withMessage('Last name must be a string.')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters.')
    .trim(),

  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email format.')
    .trim(),

//   body('password')
//     .notEmpty()
//     .withMessage('Password is required.')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters long.'),

  body('address')
    .notEmpty()
    .withMessage('Address is required.')
    .isString()
    .withMessage('Address must be a string.')
    .trim(),

  // body('countryCode')
  //   .notEmpty()
  //   .withMessage('Country code is required.')
  //   .isString()
  //   .withMessage('Country code must be a string.')
  //   .isLength({ max: 5 })
  //   .withMessage('Country code cannot exceed 5 characters.'),

  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required.')
    .isString()
    .withMessage('Phone number must be a string.'),
];

// Validation for updating a solicitor
exports.validateUpdateSolicitor = [

  body('firstName')
    .optional()
    .isString()
    .withMessage('First name must be a string.')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters.')
    .trim(),

  body('lastName')
    .optional()
    .isString()
    .withMessage('Last name must be a string.')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters.')
    .trim(),

//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Invalid email format.')
//     .trim(),

  body('address')
    .optional()
    .isString()
    .withMessage('Address must be a string.')
    .trim(),

  // body('countryCode')
  //   .optional()
  //   .isString()
  //   .withMessage('Country code must be a string.')
  //   .isLength({ max: 5 })
  //   .withMessage('Country code cannot exceed 5 characters.'),

  body('phoneNumber')
    .optional()
    .isString()
    .withMessage('Phone number must be a string.'),
];

// // Middleware to handle validation errors
// exports.handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   next();
// };
