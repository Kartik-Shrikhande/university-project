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
// const validateResult = (req, res, next) => {
//   const errors = validationResult(req).formatWith(({ msg, param, location, value }) => ({
//     field: param,        // Field that failed validation
//     parameter: param,    // Parameter name (explicitly added)
//     message: msg,        // Error message (renamed from "msg")
//     location: location,  // Where the validation failed (e.g., body, params, query)
//     value: value !== undefined ? value : "Not provided" // Invalid input value or fallback
//   }));

//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   next();
// };
// Validation rules for creating a university
const validateUniversity = [
  check('name').trim().notEmpty().withMessage('University name is required.'),
  check('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email format.'),
  // check('password').trim().notEmpty().withMessage('Password is required.').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  check('website').trim().notEmpty().withMessage('Website is required.').isURL().withMessage('Invalid website URL.'),
  check('phoneNumber').trim().notEmpty().withMessage('Phone number is required.').isNumeric().withMessage('Invalid phone number format.'),
  check('address.country').trim().notEmpty().withMessage('Country is required.'),
  check('address.city').trim().notEmpty().withMessage('City is required.'),
  check('address.state').trim().optional(),
  check('address.zipCode').trim().notEmpty().withMessage('Zip Code is required.').isPostalCode('any').withMessage('Invalid Zip Code.'),
  check('institutionType').trim().notEmpty().withMessage('Institution Type is required.').isIn(['Public', 'Private']).withMessage('Institution Type must be either Public or Private.'),
  validateResult, // Call the generic validation handler
];

// Validation rules for university login
const validateUniversityLogin = [
  check('email').isEmail().withMessage('Invalid email format').notEmpty().withMessage('Email is required'),
  check('password').notEmpty().withMessage('Password is required'),
  validateResult, // Call the generic validation handler
];

// Validation rules for updating a university
// const validateUpdateUniversity = [
//   check('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid University ID'),
//   check('email').optional().isEmail().withMessage('Invalid email format'),
//   check('isPromoted').optional().isIn(['YES', 'NO']).withMessage('isPromoted must be either "YES" or "NO"'),
//   validateResult, // Call the generic validation handler
// ];

// Validation rules for updating a university
const validateUniversityUpdate = [
  // checkEmptyBody,
  check('email').not().exists().withMessage('Email cannot be updated.'),
  check('password').not().exists().withMessage('Password cannot be updated.'),
  check('isPromoted').not().exists().withMessage('isPromoted cannot be updated.'),

  check('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  check('website').optional().trim().isURL().withMessage('Invalid website URL.'),
  check('phoneNumber').optional().trim().isMobilePhone().withMessage('Invalid phone number.'),

  check('institutionType')
    .optional()
    .isIn(['Public', 'Private'])
    .withMessage('Institution Type must be either Public or Private.'),

  check('address.country').optional().trim().notEmpty().withMessage('Country cannot be empty.'),
  check('address.city').optional().trim().notEmpty().withMessage('City cannot be empty.'),
  check('address.state').optional().trim().notEmpty().withMessage('State cannot be empty.'),
  check('address.zipCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Zip Code cannot be empty.')
    .isPostalCode('any')
    .withMessage('Invalid Zip Code.'),

  validateResult, // Generic validation handler
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

