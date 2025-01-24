const { check, validationResult } = require('express-validator');

// Validation rules for creating a university
const validateCreateUniversity = [
  check('name').notEmpty().withMessage('Name is required'),
  check('email')
    .isEmail().withMessage('Invalid email format')
    .notEmpty().withMessage('Email is required'),
  check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .notEmpty().withMessage('Password is required'),
  check('country').notEmpty().withMessage('Country is required'),
  check('isPromoted')
    .optional()
    .isIn(['YES', 'NO']).withMessage('isPromoted must be either "YES" or "NO"'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation rules for university login
const validateUniversityLogin = [
  check('email')
    .isEmail().withMessage('Invalid email format')
    .notEmpty().withMessage('Email is required'),
  check('password')
    .notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation rules for updating a university
const validateUpdateUniversity = [
  check('id').custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid University ID'),
  check('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  check('isPromoted')
    .optional()
    .isIn(['YES', 'NO']).withMessage('isPromoted must be either "YES" or "NO"'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateUniversityId = [
  check('universityId')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid University ID'),
];

const validateCourseId = [
  check('courseId')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Course ID'),
];


// Validation rules for deleting a university
const validateDeleteUniversity = [
  check('id').custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid University ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateCreateUniversity,
  validateUniversityLogin,
  validateUpdateUniversity,
  validateDeleteUniversity,
  validateUniversityId,
  validateCourseId,
 
};

