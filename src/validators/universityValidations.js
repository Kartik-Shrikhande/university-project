const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');


// Middleware to check if the request body is empty
const checkEmptyBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'No update data provided. Please enter at least one field to update.' });
  }
  next();
}

// Generic validation handler for all validation rules
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for creating a university
const validateUniversity = [
  check('name').trim().notEmpty().withMessage('University name is required.'),
  check('email')
    .notEmpty().withMessage('Email is required.')
    .custom((value) => {
      if (!value.includes('@') || !value.includes('.')) {
        throw new Error('Email must contain @ and .');
      }
      return true;
    }),
  check('website').trim().notEmpty().withMessage('Website is required.').isURL().withMessage('Invalid website URL.'),
  check('address.addressline').trim().notEmpty().withMessage('Address line is required.'),  // 👈 Added this
  check('address.country').trim().notEmpty().withMessage('Country is required.'),
  check('address.city').trim().notEmpty().withMessage('City is required.'),
  check('address.state').optional(),
  check('address.zipCode').trim().notEmpty().withMessage('Zip Code is required.'),
  validateResult,
];


// Validation rules for updating a university
const validateUniversityUpdate = [
  check('email').not().exists().withMessage('Email cannot be updated.'),
  check('password').not().exists().withMessage('Password cannot be updated.'),
  check('isPromoted').not().exists().withMessage('isPromoted cannot be updated.'),
  check('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  check('website').optional().trim().isURL().withMessage('Invalid website URL.'),
  check('address.addressline').optional().trim().notEmpty().withMessage('Address line cannot be empty.'),  // 👈 Added this
  check('address.country').optional().trim().notEmpty().withMessage('Country cannot be empty.'),
  check('address.city').optional().trim().notEmpty().withMessage('City cannot be empty.'),
  check('address.state').optional().trim(),
  check('address.zipCode').optional().trim().notEmpty().withMessage('Zip Code cannot be empty.'),
  validateResult,
];

// Validation rules for university login
const validateUniversityLogin = [
  check('email')
  .notEmpty()
  .withMessage('Email is required.')
  .custom((value) => {
    // Simple custom check, for example: must contain "@" and "."
    if (!value.includes('@') || !value.includes('.')) {
      throw new Error('Email must contain @ and .');
    }
    return true;
  }),
  check('password').notEmpty().withMessage('Password is required'),
  validateResult, // Call the generic validation handler
];
// Validation rules for university ID
const validateUniversityId = [
  check('universityId').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid University ID'),
  validateResult, // Call the generic validation handler
];

// Validation rules for course ID
const validateCourseId = [
  check('courseId').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid Course ID'),
  validateResult, // Call the generic validation handler
];

// Validation rules for deleting a university
const validateDeleteUniversity = [
  check('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid University ID'),
  validateResult, // Call the generic validation handler
];

module.exports = {
  validateUniversity,
  validateUniversityLogin,
  validateUniversityUpdate,
  validateUniversityId,
  validateCourseId,
  validateDeleteUniversity,
};

