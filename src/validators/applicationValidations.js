// const { body, validationResult } = require('express-validator');

// const validateApplication = [
//   body('previousDegree')
//     .isIn(['Masters', 'Bachelors', 'Others'])
//     .withMessage('Previous degree must be either Masters, Bachelors, or Others.'),

//   body('grades')
//     .isIn(['Cgpa', 'Grades'])
//     .withMessage('Grades must be either Cgpa or Grades.'),

//   body('marks')
//     .notEmpty()
//     .withMessage('Marks are required.'),

//   body('fromYear')
//     .isInt({ min: 1900, max: new Date().getFullYear() })
//     .withMessage(`From year must be between 1900 and ${new Date().getFullYear()}.`),

//   body('toYear')
//     .isInt({ min: 1900, max: new Date().getFullYear() })
//     .withMessage(`To year must be between 1900 and ${new Date().getFullYear()}.`)
//     .custom((value, { req }) => {
//       if (value < req.body.fromYear) {
//         throw new Error('To year must be greater than or equal to From year.');
//       }
//       return true;
//     }),

//   // ✅ Error Handling Middleware
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     next();
//   }
// ];

// module.exports = validateApplication;
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// ✅ Validation for creating a new application
const validateApplication = [
  // body('previousDegree')
  //   .isIn(['Masters', 'Bachelors', 'Others'])
  //   .withMessage('Previous degree must be either Masters, Bachelors, or Others.'),

  body('grades')
    .isIn(['CGPA', 'Percentage'])
    .withMessage('Grades must be either CGPA or Percentage.'),

  body('marks')
    .notEmpty()
    .withMessage('Marks are required.'),

  // body('fromYear')
  //   .isInt({ min: 1900, max: new Date().getFullYear() })
  //   .withMessage(`From year must be between 1900 and ${new Date().getFullYear()}.`),

  // body('toYear')
  //   .isInt({ min: 1900, max: new Date().getFullYear() })
  //   .withMessage(`To year must be between 1900 and ${new Date().getFullYear()}.`)
  //   .custom((value, { req }) => {
  //     if (value < req.body.fromYear) {
  //       throw new Error('To year must be greater than or equal to From year.');
  //     }
  //     return true;
  //   }),

  // ✅ Error Handling Middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// ✅ Validation for updating an existing application
const validateUpdateApplication = [
  param('applicationId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid application ID.');
      }
      return true;
    }),

  // body('previousDegree')
  //   .optional()
  //   .isIn(['Masters', 'Bachelors', 'Others'])
  //   .withMessage('Previous degree must be either Masters, Bachelors, or Others.'),

  body('grades')
    .optional()
    .isIn(['CGPA', 'Percentage'])
    .withMessage('Grades must be either CGPA or Percentage.'),

  body('marks')
    .optional()
    .notEmpty()
    .withMessage('enter valid marks.'),

  // body('fromYear')
  //   .optional()
  //   .isInt({ min: 1900, max: new Date().getFullYear() })
  //   .withMessage(`From year must be between 1900 and ${new Date().getFullYear()}.`),

  // body('toYear')
  //   .optional()
  //   .isInt({ min: 1900, max: new Date().getFullYear() })
  //   .withMessage(`To year must be between 1900 and ${new Date().getFullYear()}.`)
  //   .custom((value, { req }) => {
  //     if (req.body.fromYear && value < req.body.fromYear) {
  //       throw new Error('To year must be greater than or equal to From year.');
  //     }
  //     return true;
  //   }),

  // ✅ Error Handling Middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateApplication,
  validateUpdateApplication
};
