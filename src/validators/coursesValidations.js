const { check,body, param, validationResult } = require('express-validator');

// Validation for creating a new course
exports.validateCreateCourse = [

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

    body('description2')
    .optional()
    .isString()
    .withMessage('Description2 must be a string.')
    .trim(),

  body('description3')
    .optional()
    .isString()
    .withMessage('Description3 must be a string.')
    .trim(),
  body('fees')
    .notEmpty()
    .withMessage('Course fees are required.')
    .isFloat({ min: 0 })
    .withMessage('Course fees must be a positive number.'),

     body('courseDuration')
    .notEmpty()
    .withMessage('Course duration is required.')
    .isString()
    .withMessage('Course duration must be a string.'),
 body('courseType')
    .notEmpty()
    .withMessage('Course type is required.')
    .isIn(['fulltime', 'parttime', 'online'])
    .withMessage('Course type must be one of: fulltime, parttime, or online.'),

  body('expiryDate')
    .notEmpty()
    .withMessage('Expiry date is required.')
    .isISO8601()
    .withMessage('Expiry date must be a valid date.'),

body('UCSA')
  .notEmpty()
  .withMessage('UCSA is required.')
  .isString()
  .withMessage('UCSA must be a string.'),

body('level')
  .notEmpty()
  .withMessage('Level is required.')
  .isIn(['Undergraduate', 'Postgraduate', 'Foundation', 'ResearchDegree'])
  .withMessage('Level must be one of: Undergraduate, Postgraduate, Foundation, ResearchDegree.'),


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
  
       body('description2')
    .optional()
    .isString()
    .withMessage('Description2 must be a string.')
    .trim(),

  body('description3')
    .optional()
    .isString()
    .withMessage('Description3 must be a string.')
    .trim(),

    // Validate fees (if provided in the body)
    check('fees')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fees must be a positive number.'),


        body('courseDuration')
    .optional()
    .isString()
    .withMessage('Course duration must be a string.'),

  body('courseType')
    .optional()
    .isIn(['fulltime', 'parttime', 'online'])
    .withMessage('Course type must be one of: fulltime, parttime, or online.'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date.'),

body('UCSA')
  .optional()
  .isString()
  .withMessage('UCSA must be a string.'),

body('level')
  .optional()
  .isIn(['Undergraduate', 'Postgraduate', 'Foundation', 'ResearchDegree'])
  .withMessage('Level must be one of: Undergraduate, Postgraduate, Foundation, ResearchDegree.'),




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
