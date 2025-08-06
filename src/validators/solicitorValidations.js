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
  .custom((value) => {
    // Simple custom check, for example: must contain "@" and "."
    if (!value.includes('@') || !value.includes('.')) {
      throw new Error('Email must contain @ and .');
    }
    return true;
  }),


  body('address')
    .notEmpty()
    .withMessage('Address is required.')
    .isString()
    .withMessage('Address must be a string.')
    .trim(),


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

  body('address')
    .optional()
    .isString()
    .withMessage('Address must be a string.')
    .trim(),

  body('phoneNumber')
    .optional()
    .isString()
    .withMessage('Phone number must be a string.'),
];

