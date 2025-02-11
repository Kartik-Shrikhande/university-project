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
    .isIn(['BTech', 'Diploma', 'Degree', 'Masters', 'PhD', 'Other'])
    .withMessage('Most recent education must be one of the following: BTech, Diploma, Degree, Masters, PhD, or Other. Please choose one of these options.'),

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

  // Validate countryApplyingFrom
  body('countryApplyingFrom')
    .notEmpty()
    .withMessage('Country applying from is required.')
    .isIn(['India', 'UK', 'Other'])
    .withMessage('Country applying from must be one of the following: India, UK, or Other. Please choose one of these options.'),

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
    .isIn(['Yes', 'No'])
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


  // // Validate referralSource
  // body('referralSource')
  // .notEmpty()
  // .withMessage('Referral source is required. Choose one from: Social Media, Online Search/Google, Referral from friend/family member, Education fair/exhibition, Advertisement (online/offline), or Other.')
  // .isIn(['Social Media', 'Online Search/Google', 'Referral from friend/family member', 'Education fair/exhibition', 'Advertisement(online/offline)', 'Other'])
  // .withMessage('Referral source must be one of the following: Social Media, Online Search/Google, Referral from friend/family member, Education fair/exhibition, Advertisement (online/offline), or Other. Please choose one of these options.')
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
  
  // validateVerifyOtpForLogin,
  validateResendOtpForLogin,
  validateVerifyOtpForRegistration,
  validateCourseFilters
};





