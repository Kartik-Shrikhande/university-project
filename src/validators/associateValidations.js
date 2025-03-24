const { body } = require('express-validator');

// Validate account number format (8 to 18 digits)
const validateAccountNumber = (accountNumber) => {
  const regex = /^[0-9]{8,18}$/; // Example: 8-18 digits
  return regex.test(accountNumber);
};

// Associate Creation Validation
exports.validateAssociateCreation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),

 
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Valid phone number is required'),

  // Address validations
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must be less than 50 characters'),

  body('address.zip_postalCode')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('ZIP/Postal code must be less than 15 characters'),

  body('address.state_province_region')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State/Province/Region must be less than 50 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),

  body('address.addressLine')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Address line must be less than 100 characters'),

  // Bank Details
  body('bankDetails.accountHolderName')
    .trim()
    .notEmpty()
    .withMessage('Account holder name is required')
    .isLength({ max: 50 })
    .withMessage('Account holder name must be less than 50 characters'),

  body('bankDetails.bankName')
    .trim()
    .notEmpty()
    .withMessage('Bank name is required')
    .isLength({ max: 50 })
    .withMessage('Bank name must be less than 50 characters'),

  body('bankDetails.accountNumber')
    .trim()
    .notEmpty()
    .withMessage('Account number is required')
    .custom((value) => {
      if (!validateAccountNumber(value)) {
        throw new Error('Invalid account number format');
      }
      return true;
    }),

  body('bankDetails.ifscSwiftCode')
    .trim()
    .notEmpty()
    .withMessage('IFSC/Swift code is required')
    .isLength({ max: 20 })
    .withMessage('IFSC/Swift code must be less than 20 characters'),

  body('bankDetails.iban')
    .optional()
    .trim()
    .isLength({ max: 34 })
    .withMessage('IBAN must be less than 34 characters'),

  // Role validation (default is associate, but can be overridden if needed)
  body('role')
    .optional()
    .trim()
    .isIn(['associate'])
    .withMessage('Invalid role'),
];

// Associate Update Validation
exports.validateAssociateUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),

  body('phoneNumber')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),

  // Address validations
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must be less than 50 characters'),

  body('address.zip_postalCode')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('ZIP/Postal code must be less than 15 characters'),

  body('address.state_province_region')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State/Province/Region must be less than 50 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),

  body('address.addressLine')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Address line must be less than 100 characters'),

  // Bank Details
  body('bankDetails.accountHolderName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Account holder name must be less than 50 characters'),

  body('bankDetails.bankName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Bank name must be less than 50 characters'),

  body('bankDetails.accountNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !validateAccountNumber(value)) {
        throw new Error('Invalid account number format');
      }
      return true;
    }),

  body('bankDetails.ifscSwiftCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('IFSC/Swift code must be less than 20 characters'),

  body('bankDetails.iban')
    .optional()
    .trim()
    .isLength({ max: 34 })
    .withMessage('IBAN must be less than 34 characters'),
];
