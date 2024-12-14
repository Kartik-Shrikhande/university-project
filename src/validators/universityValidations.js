const { body, param } = require('express-validator');

exports.createUniversityValidator = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('description').optional(),
  body('location').optional(),
  body('isPromoted').optional().isIn(['YES', 'NO']).withMessage('isPromoted must be either "YES" or "NO".'),
];

exports.updateUniversityValidator = [
  param('id').isMongoId().withMessage('Invalid university ID.'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
  body('description').optional(),
  body('location').optional(),
  body('isPromoted').optional().isIn(['YES', 'NO']).withMessage('isPromoted must be either "YES" or "NO".'),
];



