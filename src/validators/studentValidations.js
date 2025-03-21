const { check,body } = require('express-validator');

const validateRegisterStudent = [
  // Validate firstName
  body('firstName')
    .notEmpty()
    .withMessage('First name is required.')
    .isString()
    .withMessage('First name must be a valid string.')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters.'),

  // Validate middleName
  body('middleName')
    .optional()
    .isString()
    .withMessage('Middle name must be a valid string.')
    .isLength({ max: 50 })
    .withMessage('Middle name cannot exceed 50 characters.'),

  // Validate lastName
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required.')
    .isString()
    .withMessage('Last name must be a valid string.')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters.'),

  // Validate dateOfBirth
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required.')
    .isISO8601()
    .withMessage('Date of birth must be in a valid ISO 8601 format (e.g., YYYY-MM-DD).'),

  // Validate gender
  body('gender')
    .notEmpty()
    .withMessage('Gender is required.')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be one of the following: Male, Female, or Other. Please choose one of these options.'),

  // Validate email
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email must be a valid email address.'),

  // Validate confirmEmail
  body('confirmEmail')
    .notEmpty()
    .withMessage('Confirm email is required.')
    .custom((value, { req }) => value === req.body.email)
    .withMessage('Email and confirm email do not match.'),

  // Validate password
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),

  // Validate telephoneNumber
  body('telephoneNumber')
    .notEmpty()
    .withMessage('Telephone number is required.')
    .isString()
    .withMessage('Telephone number must be a valid string.')
    .isLength({ max: 15 })
    .withMessage('Telephone number cannot exceed 15 characters.'),

  // Address validations
  body("address.country").notEmpty().withMessage("Country is required"),
  body("address.zip_postalCode").notEmpty().withMessage("Zip/Postal Code is required"),
  body("address.state_province_region").notEmpty().withMessage("State/Province/Region is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.addressLine").notEmpty().withMessage("Address Line is required"),


  // Validate documentType
  body('documentType')
    .notEmpty()
    .withMessage('Document type is required.')
    .isIn(['Passport'])
    .withMessage('Document type must be Passport. Please choose the correct document type.'),

  // Validate mostRecentEducation
  body('mostRecentEducation')
    .notEmpty()
    .withMessage('Most recent education is required.')
    .isIn(['Bachelors', 'Diploma', 'Degree', 'Masters', 'PhD', 'Other'])
    .withMessage('Most recent education must be one of the following: Bachelors, Diploma, Degree, Masters, PhD, or Other. Please choose one of these options.'),

// Validate mostRecentEducation
body('courseName')
.notEmpty()
.withMessage('courseName is required.')
.isString()
.withMessage('courseName must be a string.'),

 // Validate fromYear (required and valid year >= 1900 and <= current year)
 body('fromYear')
 .isInt({ min: 1900, max: new Date().getFullYear() })
 .withMessage(`fromYear must be between 1900 and ${new Date().getFullYear()}.`),

// Validate toYear (required, must be greater than or equal to fromYear)
body('toYear')
 .isInt({ min: 1900, max: new Date().getFullYear() })
 .withMessage(`toYear must be between 1900 and ${new Date().getFullYear()}.`)
 .custom((value, { req }) => {
   if (value < req.body.fromYear) {
     throw new Error('To year must be greater than or equal to fromYear.');
   }
   return true;
 }),
  // body('yearOfGraduation').notEmpty()
  //   .isInt({ min: 2014, max: new Date().getFullYear() })
  //   .withMessage(`From year must be between 2014 and ${new Date().getFullYear()}.`),

  // Validate programType
  body('programType')
    .notEmpty()
    .withMessage('Program type is required.')
    .isIn(['Graduation', 'Post Graduation', 'Under Graduation', 'PhD', 'Other'])
    .withMessage('Program type must be one of the following: Graduation, Post Graduation, Under Graduation, PhD, or Other. Please choose one of these options.'),

  // Validate discipline
  body('discipline')
    .optional()
    .isIn(['Computers', 'Business', 'Marketing', 'Other'])
    .withMessage('Discipline must be one of the following: Computers, Business, Marketing, or Other. Please choose one of these options.'),

  // // Validate countryApplyingFrom
  // body('countryApplyingFrom')
  //   .notEmpty()
  //   .withMessage('Country applying from is required.')
  //   .isIn(['India', 'UK', 'Other'])
  //   .withMessage('Country applying from must be one of the following: India, UK, or Other. Please choose one of these options.'),

  // Validate preferredUniversity
  body('preferredUniversity')
    .notEmpty()
    .withMessage('Preferred university is required.')
    .isIn(['Yes', 'No'])
    .withMessage('Preferred university must be one of the following: Yes or No. Please choose one of these options.'),

  // Validate preferredCourse
  body('preferredCourse')
    .notEmpty()
    .withMessage('Preferred course is required.')
    .isIn(['Yes', 'No'])
    .withMessage('Preferred course must be one of the following: Yes or No. Please choose one of these options.'),

  // Validate courseStartTimeline
  body('courseStartTimeline')
    .notEmpty()
    .withMessage('Course start timeline is required.')
    .isIn(['3 months', '6 months', '9 months', '1 year'])
    .withMessage('Course start timeline must be one of the following: 3 months, 6 months, 9 months, or 1 year. Please choose one of these options.'),

  // Validate englishLanguageRequirement
  body('englishLanguageRequirement')
    .notEmpty()
    .withMessage('English language requirement is required.')
    .isIn(['Yes', 'No', 'yes','no'])
    .withMessage('English language requirement must be one of the following: Yes or No. Please choose one of these options.'),

  // Validate testName (for language test)
  body('testName')
    .optional()
    .isIn(['TOEFL', 'IELTS', 'Other'])
    .withMessage('Test name must be one of the following: TOEFL, IELTS, or Other. Please choose one of these options.'),

  // Validate score
  body('score')
    .optional()
    .isString()
    .withMessage('Score must be a valid string.'),

  // Validate terms and conditions
  body('termsAndConditionsAccepted')
    .notEmpty()
    .withMessage('Terms and conditions must be accepted.')
    .equals('true')
    .withMessage('Terms and conditions must be explicitly accepted.'),

  // Validate GDPR compliance
  body('gdprAccepted')
    .notEmpty()
    .withMessage('GDPR compliance must be accepted.')
    .equals('true')
    .withMessage('GDPR compliance must be explicitly accepted.'),


    // body('NameOfUniversity').notEmpty().withMessage('Name Of University is required'),
    // body('preferredCommunicationMethod').notEmpty().withMessage('preferred communication method is required'),
    body('preferredUniversity').notEmpty().withMessage('preferredUniversity is required')
  
    // // Validate referralSource
  // body('referralSource')
  // .notEmpty()
  // .withMessage('Referral source is required. Choose one from: Social Media, Online Search/Google, Referral from friend/family member, Education fair/exhibition, Advertisement (online/offline), or Other.')
  // .isIn(['Social Media', 'Online Search/Google', 'Referral from friend/family member', 'Education fair/exhibition', 'Advertisement(online/offline)', 'Other'])
  // .withMessage('Referral source must be one of the following: Social Media, Online Search/Google, Referral from friend/family member, Education fair/exhibition, Advertisement (online/offline), or Other. Please choose one of these options.')
];



const validateUpdateStudent = [
  body('firstName').optional().isString().trim().isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters.'),
  body('middleName').optional().isString().trim().isLength({ max: 50 }).withMessage('Middle name cannot exceed 50 characters.'),
  body('lastName').optional().isString().trim().isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters.'),

  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD.'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other.'),

  body('telephoneNumber').optional().isString().trim().isLength({ max: 15 }).withMessage('Telephone number cannot exceed 15 characters.'),

  // Address validation (optional but must be valid if provided)
  body("address.country").optional().isString().trim().withMessage("Invalid country."),
  body("address.zip_postalCode").optional().isString().trim().withMessage("Invalid Zip/Postal Code."),
  body("address.state_province_region").optional().isString().trim().withMessage("Invalid State/Province/Region."),
  body("address.city").optional().isString().trim().withMessage("Invalid City."),
  body("address.addressLine").optional().isString().trim().withMessage("Invalid Address Line."),

  body('documentType').optional().isIn(['Passport']).withMessage('Document type must be Passport.'),

  body('mostRecentEducation').optional().isIn(['BTech', 'Diploma', 'Degree', 'Masters', 'PhD', 'Other'])
    .withMessage('Most recent education must be BTech, Diploma, Degree, Masters, PhD, or Other.'),

  // body('yearOfGraduation').optional().isInt({ min: 2014, max: new Date().getFullYear() })
  //   .withMessage(`Year of graduation must be between 2014 and ${new Date().getFullYear()}.`),
// Validate mostRecentEducation
body('courseName')
.optional()
.isString()
.withMessage('courseName must be a string.'),

// Validate fromYear (optional and valid year >= 1900 and <= current year)
body('fromYear')
.optional()
.isInt({ min: 1900, max: new Date().getFullYear() })
.withMessage(`fromYear must be between 1900 and ${new Date().getFullYear()}.`),

// Validate toYear (optional, must be greater than or equal to fromYear)
body('toYear')
.optional()
.isInt({ min: 1900, max: new Date().getFullYear() })
.withMessage(`toYear must be between 1900 and ${new Date().getFullYear()}.`)
.custom((value, { req }) => {
  if (value && value < req.body.fromYear) {
    throw new Error('To year must be greater than or equal to fromYear.');
  }
  return true;
}),


  body('programType').optional().isIn(['Graduation', 'Post Graduation', 'Under Graduation', 'PhD', 'Other'])
    .withMessage('Program type must be Graduation, Post Graduation, Under Graduation, PhD, or Other.'),

  body('discipline').optional().isIn(['Computers', 'Business', 'Marketing', 'Other'])
    .withMessage('Discipline must be Computers, Business, Marketing, or Other.'),

  body('preferredUniversity').optional().isIn(['Yes', 'No']).withMessage('Preferred university must be Yes or No.'),
  body('preferredCourse').optional().isIn(['Yes', 'No']).withMessage('Preferred course must be Yes or No.'),

  body('courseStartTimeline').optional().isIn(['3 months', '6 months', '9 months', '1 year'])
    .withMessage('Course start timeline must be 3 months, 6 months, 9 months, or 1 year.'),

  body('englishLanguageRequirement').optional().isIn(['Yes', 'No', 'yes', 'no'])
    .withMessage('English language requirement must be Yes or No.'),

  body('testName').optional().isIn(['TOEFL', 'IELTS', 'Other']).withMessage('Test name must be TOEFL, IELTS, or Other.'),
  body('score').optional().isString().trim().withMessage('Score must be a valid string.')
];


const validateLoginStudent = [
  // Validate email
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email must be a valid email address.'),

  // Validate password
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),
];



const validateVerifyOtpForLogin = [
  // Validate email
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email format.'),

  // Validate OTP
  body('otp')
    .notEmpty()
    .withMessage('OTP is required.')
    .isNumeric()
    .withMessage('OTP must be a numeric value.')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be a 6-digit number.'),
];

const validateResendOtpForLogin = [
  // Validate email
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email format.'),
];

const validateCourseFilters = [
  check('minPrice')
    .optional()
    .isNumeric().withMessage('minPrice must be a number'),
  check('maxPrice')
    .optional()
    .isNumeric().withMessage('maxPrice must be a number'),
  check('country')
    .optional()
    .isString().withMessage('Country must be a string'),
  check('courseName')
    .optional()
    .isString().withMessage('Course name must be a string'),
  check('universityName')
    .optional()
    .isString().withMessage('University name must be a string'),
];


const validateVerifyOtpForRegistration = [
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email format.'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required.')
    .isNumeric()
    .withMessage('OTP must be numeric.')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be a 6-digit code.'),
];




module.exports = { 
  validateRegisterStudent,
  validateLoginStudent,
  validateUpdateStudent,
  // validateVerifyOtpForLogin,
  validateResendOtpForLogin,
  validateVerifyOtpForRegistration,
  validateCourseFilters
};





