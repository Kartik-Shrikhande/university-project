const { body } = require("express-validator");

// Validate account number format (8 to 18 digits)
const validateAccountNumber = (accountNumber) => {
  const regex = /^[0-9]{8,18}$/; // Example: 8-18 digits
  return regex.test(accountNumber);
};

// Associate Creation Validation
exports.validateAssociateCreation = [
  body("nameOfAssociate")
    .trim()
    .notEmpty()
    .withMessage("Name of associate is required")
    .isLength({ max: 100 })
    .withMessage("Name of associate must be less than 100 characters"),

  body("email").trim().isEmail().withMessage("Valid email is required"),

  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required"),

  // Address validations
  body("address.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 50 })
    .withMessage("Country must be less than 50 characters"),

  body("address.city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 50 })
    .withMessage("City must be less than 50 characters"),

  body("address.addressLine")
    .trim()
    .notEmpty()
    .withMessage("Address line is required")
    .isLength({ max: 100 })
    .withMessage("Address line must be less than 100 characters"),

  body("address.zip_postalCode")
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage("ZIP/Postal code must be less than 15 characters"),

  body("address.state_province_region")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State/Province/Region must be less than 50 characters"),

  // Bank Details
  body("bankDetails.accountHolderName")
    .trim()
    .notEmpty()
    .withMessage("Account holder name is required")
    .isLength({ max: 50 })
    .withMessage("Account holder name must be less than 50 characters"),

  body("bankDetails.bankName")
    .trim()
    .notEmpty()
    .withMessage("Bank name is required")
    .isLength({ max: 50 })
    .withMessage("Bank name must be less than 50 characters"),

  body("bankDetails.accountNumber")
    .trim()
    .notEmpty()
    .withMessage("Account number is required")
    .custom((value) => {
      if (!validateAccountNumber(value)) {
        throw new Error("Invalid account number format. Must be 8 to 18 digits.");
      }
      return true;
    }),

  body("bankDetails.ifscSwiftCode")
    .trim()
    .notEmpty()
    .withMessage("IFSC/Swift code is required")
    .isLength({ max: 20 })
    .withMessage("IFSC/Swift code must be less than 20 characters"),

  body("bankDetails.iban")
    .optional()
    .trim()
    .isLength({ max: 34 })
    .withMessage("IBAN must be less than 34 characters"),

  // Role validation (default is associate, but can be overridden if needed)
  body("role")
    .optional()
    .trim()
    .isIn(["associate"])
    .withMessage("Invalid role"),
];

exports.validateAssociateUpdate = [
  // Name of Associate (optional in update)
  body("nameOfAssociate")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name of associate cannot be empty if provided")
    .isLength({ max: 100 })
    .withMessage("Name of associate must be less than 100 characters"),

  // Email should not be updated, but included for consistency
  body("email").optional().custom(() => {
    throw new Error("Email cannot be updated");
  }),

  // Phone number (optional in update)
  body("phoneNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone number cannot be empty if provided"),

  // Address validations (optional and partial update)
  body("address.country")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Country cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Country must be less than 50 characters"),

  body("address.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("City must be less than 50 characters"),

  body("address.addressLine")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address line cannot be empty if provided")
    .isLength({ max: 100 })
    .withMessage("Address line must be less than 100 characters"),

  body("address.zip_postalCode")
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage("ZIP/Postal code must be less than 15 characters"),

  body("address.state_province_region")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State/Province/Region must be less than 50 characters"),

  // Bank Details (optional in update)
  body("bankDetails.accountHolderName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Account holder name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Account holder name must be less than 50 characters"),

  body("bankDetails.bankName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Bank name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Bank name must be less than 50 characters"),

  body("bankDetails.accountNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Account number cannot be empty if provided")
    .custom((value) => {
      if (!validateAccountNumber(value)) {
        throw new Error("Invalid account number format. Must be 8 to 18 digits.");
      }
      return true;
    }),

  body("bankDetails.ifscSwiftCode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("IFSC/Swift code cannot be empty if provided")
    .isLength({ max: 20 })
    .withMessage("IFSC/Swift code must be less than 20 characters"),

  body("bankDetails.iban")
    .optional()
    .trim()
    .isLength({ max: 34 })
    .withMessage("IBAN must be less than 34 characters"),

  // Prevent password updates in update API
  body("password").optional().custom(() => {
    throw new Error("Password cannot be updated");
  }),

  // Role validation (optional)
  body("role")
    .optional()
    .trim()
    .isIn(["associate"])
    .withMessage("Invalid role"),
];