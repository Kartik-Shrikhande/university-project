const { check,body, param, validationResult } = require('express-validator');

// Validation for creating a new course
exports.validateCreateCourse = [
  // param('universityId')
  //   .notEmpty()
  //   .withMessage('University ID is required.')
  //   .isMongoId()
  //   .withMessage('Invalid University ID format.'),
  body('name')
    .notEmpty()
    .withMessage('Course name is required.')
    .isString()
    .withMessage('Course name must be a string.')
    .trim(),
  body('description')
  .notEmpty()
    .isString()
    .withMessage('Description must be a string.')
    .trim(),
  body('fees')
    .notEmpty()
    .withMessage('Course fees are required.')
    .isFloat({ min: 0 })
    .withMessage('Course fees must be a positive number.'),
  body('ratings')
    .optional()
    .isArray()
    .withMessage('Ratings must be an array.')
    .custom((ratings) => {
      if (!ratings.every((rating) => typeof rating === 'number')) {
        throw new Error('All ratings must be numbers.');
      }
      return true;
    }),
];

exports.validateUpdateCourse = [
    // Validate universityId
    // check('universityId')
    // .isMongoId()
    //   .withMessage('Invalid university ID.'),
  
    // Validate courseId
    check('courseId')
    .isMongoId()
      .withMessage('Invalid course ID.'),
  
    // Validate course name (if provided in the body)
    check('name')
      .optional()
      .isString()
      .withMessage('Course name must be a string.')
      .isLength({ min: 3, max: 100 })
      .withMessage('Course name must be between 3 and 100 characters.'),
  
    // Validate description (if provided in the body)
    check('description')
      .optional()
      .isString()
      .withMessage('Description must be a string.')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters.'),
  
    // Validate fees (if provided in the body)
    check('fees')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fees must be a positive number.'),
  
    // Validate ratings (if provided in the body)
    check('ratings')
      .optional()
      .isArray()
      .withMessage('Ratings must be an array.')
      .custom((ratings) =>
        ratings.every((rating) => typeof rating === 'number' && rating >= 0 && rating <= 5)
      )
      .withMessage('Each rating must be a number between 0 and 5.'),
  
    // Middleware to handle validation errors
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ];
// Validation for deleting a course
exports.validateDeleteCourse = [
  param('courseId')
    .notEmpty()
    .withMessage('Course ID is required.')
    .isMongoId()
    .withMessage('Invalid Course ID format.'),
];

// Middleware to check for validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
