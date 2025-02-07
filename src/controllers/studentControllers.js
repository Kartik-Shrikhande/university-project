const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');
const university = require('../models/universityModel');
const University = require('../models/universityModel');
const Application = require('../models/applicationModel');
const Course = require('../models/coursesModel');
const { isValidObjectId } = require('mongoose');
const uploadFileToS3 = require('../utils/s3Upload');
const Otp = require('../models/otpModel');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' })
// const s3 = require('../config/awsConfig');
// const upload = require('../config/multerConfig');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const {uploadFile}=require("../middlewares/uploadMiddleware")
// const multer = require('multer');
const Agents = require('../models/agentModel');
const Solicitors = require('../models/solicitorModel');
const Agency = require('../models/agencyModel');
const crypto = require('crypto');


const { v4: uuidv4 } = require('uuid');

// Create S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to upload files to S3
const uploadFilesToS3 = async (files) => {
  const uploadPromises = files.map(async (file) => {
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params)); // Upload file
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
  });

  return Promise.all(uploadPromises);
};
// Registration
exports.registerStudent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      email,
      confirmEmail,
      password,
      countryCode,
      telephoneNumber,
      presentAddress,
      permanentAddress,
      documentType,
      mostRecentEducation,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      countryApplyingFrom,
      countryName,
      preferredUniversity,
      NameOfUniversity,
      preferredCourse,
      NameOfCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      testName,
      score,
      // referralSource,
      preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
    } = req.body;

    // Check if student already exists
    const existingStudent = await Students.findOne({ email }).session(session);;
    if (existingStudent) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    if (!countryCode) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Country code is required.' });
    }

  // Handle document uploads
  let uploadedDocuments = [];
  if (req.files && req.files['document']) {
    uploadedDocuments = await uploadFilesToS3(req.files['document']);  // uploadFilesToS3 handles S3 upload logic for 'documents'
  }
  // console.log(req.files); // Log the incoming file fields


  let uploadedDocumentUploads = [];
  if (req.files && req.files['documentUpload']) {
    uploadedDocumentUploads = await uploadFilesToS3(req.files['documentUpload']);  // uploadFilesToS3 handles S3 upload logic for 'documentUpload'
  }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);


 // Generate OTP
 const otpCode = Math.floor(100000 + Math.random() * 900000);
 const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minutes

 // Save OTP to the database
 const newOtp = new Otp({
   email,
   otp: otpCode,
   expiry: otpExpiry,
 });
 await newOtp.save({ session });

 const verificationToken = crypto.randomBytes(32).toString('hex'); // Generate a secure token

    // Create student
    const newStudent = new Students({
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      email,
      confirmEmail,
      password: hashedPassword,
      countryCode,
      telephoneNumber,
      presentAddress,
      permanentAddress,
      documentType,
      documentUpload:uploadedDocumentUploads,
      document: uploadedDocuments, // Save document URLs
      mostRecentEducation,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      countryApplyingFrom,
      countryName,
      preferredUniversity,
      NameOfUniversity,
      preferredCourse,
      NameOfCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      testName,
      score,
      // referralSource,
      preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
      verificationToken,
    });
   
  
    await newStudent.save({ session });

    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });


//LINK 
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: 'Email Verification',
  text: `Click the following link to verify your email: 
  https://university-project-m8o9.onrender.com/student/verify-email?token=${verificationToken}`,
};

await transporter.sendMail(mailOptions);

    //OTP
    // const mailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Registration OTP',
    //   text: `Your OTP for registration is: ${otpCode}. It is valid for 1 minutes.`,
    // };

    // await transporter.sendMail(mailOptions);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'A verification email has been successfully sent to your inbox. Please follow the instructions in the email to verify your address and complete the registration process.' });
   
  
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const student = await Students.findOne({ verificationToken: token });

    if (!student) {
      return res.status(400).json({ error: 'Invalid token.' });
    }

    student.isVerified = true;
    student.verificationToken = null;  // Clear the token after successful verification
    await student.save();

    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Error verifying email.' });
  }
};

exports.verifyOtpForRegistration = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email, otp } = req.body;

    // Check if student exists
    const student = await Students.findOne({ email }).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'No student found with this email.' });
    }
    // Check if OTP exists and matches
    const otpRecord = await Otp.findOne({ email, otp }).session(session);
    if (!otpRecord) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiry) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // Check if OTP is already used
    if (otpRecord.isUsed) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'OTP has already been used.' });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save({ session });

    

    // Activate the student's account (add isVerified field to schema if necessary)
    student.isVerified = true;
    await student.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Registration completed successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = null;
    let role = null;

    // Role collections for login
    const roleCollections = [
      { model: University, roleName: 'University' },
      { model: Students, roleName: 'student' },
      { model: Agents, roleName: 'agent' },
      { model: Solicitors, roleName: 'solicitor' },
      { model: Agency, roleName: 'admin' } // Updated to match Agency model
    ];

    // Check each role collection
    for (const { model, roleName } of roleCollections) {
      user = await model.findOne({ email });
      if (user) {
        role = roleName;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    //  // Check if email is verified
    //  if (!user.isVerified) {
    //   return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
    // }
      // **Enforce Email Verification ONLY for Students**
      if (role === "student" && !user.isVerified) {
        return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
      }
  

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, role: role }, process.env.SECRET_KEY, { expiresIn: '1h' });

    // Set token in HTTP-only cookie
    res.cookie('refreshtoken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 604800000, // 7 days in milliseconds
      path: '/'
    });


  //  **Custom Response for Students**
    if (role === "student") {
      return res.status(200).json({
        message: 'Login successful.',
        role: role,
        token: token,
        user: {
          id: user._id,
          email: user.email,
          // role: role,
          is_active: true, // Assuming all logged-in users are active
          email_verified: user.isVerified || false,
          platform_fee_paid: user.isPaid || false,
          created_at: user.createdAt
        },
        platform_access: {
          courses_visible: user.isPaid || false, // Allow course visibility if fee is paid
          payment_required: !user.isPaid, // If not paid, payment is required
          message: user.isPaid
            ? "You have access to all platform features."
            : "Pay the platform fee to view universities and courses."
        },
        notifications: [
          {
            id: "NOTIF-001",
            type: "system",
            title: "Welcome to Connect2Uni!",
            content: "Complete your profile and pay the platform fee to proceed.",
            is_read: false,
            timestamp: new Date().toISOString()
          }
        ],
        applications: user.applications || [],
        visa_status: null, // You can modify this based on actual visa status logic
        payment_prompt: !user.isPaid
          ? {
              type: "platform_fee",
              amount: 100.0,
              currency: "GBP",
              payment_url: "/api/payments/platform-fee"
            }
          : null
      });
    }
 // **Custom Response for Agent Role**
 if (role === "agent") {
  return res.status(200).json({
    message: 'Login successful.',
    role: role,
    token: token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contactNumber: user.contactPhone || '',
      agencyId: user.agency || '', // Reference to agency (can be an ID)
      created_at: user.createdAt
    },
    platform_access: {
      allowed_actions: [
        "view_student_applications",
        "approve_applications",
        "reject_applications",
        "assign_associates"
      ],
      blocked_actions: [
        "edit_profile",
        "apply_to_courses" // Agents cannot apply to courses
      ]
    },
    notifications: [
      {
        id: "NOTIF-001",
        type: "system",
        title: "New Application Received",
        content: "A new application has been submitted by Jane Smith.",
        is_read: false,
        timestamp: new Date().toISOString()
      }
    ],
    metadata: {
      total_students: user.assignedStudents?.length || 0, // Number of students assigned to this agent
      pending_applications: user.pendingApplications?.length || 0, // Pending applications (can be an array of IDs)
      approved_applications: user.approvedApplications?.length || 0 // Approved applications (can be an array of IDs)
    }
  });
}


    // **Custom Response for Agency Role**
    if (role === 'admin') {
      const agencyResponse = {
        message: 'Login successful.',
        role: role,
        token: token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          contactNumber: user.contactPhone || '',
          address: user.address || '',
          created_at: user.createdAt
        },
        platform_access: {
          allowed_actions: [
            "create_agents",
            "view_agents",
            "view_student_applications",
            "assign_associates"
          ],
          blocked_actions: [
            "edit_profile",
            "apply_to_courses" // Agencies cannot apply to courses
          ]
        },
        // notifications: [
        //   {
        //     id: "NOTIF-001",
        //     type: "system",
        //     title: "New Agent Created",
        //     content: "A new agent has been created.",
        //     is_read: false,
        //     timestamp: new Date().toISOString()
        //   }
        // ],
        metadata: {
          total_agents: user?.agents?.length || 0,
          total_students: user?.students?.length || 0,
          pending_applications: user?.pendingApplications?.length || 0,
          approved_applications: user?.sentApplicationsToUniversities?.length || 0
        }
      };
      return res.status(200).json(agencyResponse);
    }


 // **Custom Response for University Role**
 if (role === 'University') {
  return res.status(200).json({
    message: 'Login successful.',
    role: role,
    token: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      contactNumber: user.contactPhone || '',
      address: user.address || '',
      created_at: user.createdAt
    },
  
  
    platform_access: {
      allowed_actions: [
        "view_applications",
        "approve_applications",
        "reject_applications",
        "validate_payments"
      ],
      blocked_actions: [
        "edit_profile",
        "apply_to_courses"
      ]
    },
    // "notifications": [
    //   {
    //     "id": "NOTIF-001",
    //     "type": "system",
    //     "title": "New Application Received",
    //     "content": "A new application has been submitted by John Doe.",
    //     "is_read": false,
    //     "timestamp": "2025-02-04T09:34:29.082Z"
    //   }],

    metadata: {
      total_applications: (user.pendingApplications?.length || 0) + (user.sentApplicationsToUniversities?.length || 0),
      pending_applications: user.pendingApplications?.length || 0,
      approved_applications: user.approvedApplications?.length || 0
    }
  });
}

    // **Default Response for Other Roles**
    return res.status(200).json({ message: 'Login successful.', role: role, token });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};



// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     let user = null;
//     let role = null;

//     // Role collections for login
//     const roleCollections = [
//       { model: University, roleName: 'University' },
//       { model: Students, roleName: 'student' },
//       { model: Agents, roleName: 'agent' },
//       { model: Solicitors, roleName: 'solicitor' },
//       { model: Agencies, roleName: 'admin' }
//     ];

//     // Check each role collection
//     for (const { model, roleName } of roleCollections) {
//       user = await model.findOne({ email });
//       if (user) {
//         role = roleName;
//         break;
//       }
//     }

//     if (!user) {
//       return res.status(400).json({ message: 'Invalid email or password.' });
//     }

//     // Compare password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).json({ message: 'Invalid email or password.' });
//     }

//     // Generate JWT Token
//     const token = jwt.sign({ id: user._id, role: role }, process.env.SECRET_KEY, { expiresIn: '1h' });

//     // Set token in HTTP-only cookie
//     res.cookie('refreshtoken', token, {
//       httpOnly: true,
//       secure: true,
//       sameSite: 'None',
//       maxAge: 604800000, // 7 days in milliseconds
//       path: '/'
//     });

//     // **Custom Response for Students**
//     if (role === "student") {
//       return res.status(200).json({
//         user: {
//           id: user._id,
//           email: user.email,
//           role: role,
//           is_active: true, // Assuming all logged-in users are active
//           email_verified: user.isVerified || false,
//           platform_fee_paid: user.isPaid || false,
//           created_at: user.createdAt
//         },
//         platform_access: {
//           courses_visible: user.isPaid || false, // Allow course visibility if fee is paid
//           payment_required: !user.isPaid, // If not paid, payment is required
//           message: user.isPaid
//             ? "You have access to all platform features."
//             : "Pay the platform fee to view universities and courses."
//         },
//         notifications: [
//           {
//             id: "NOTIF-001",
//             type: "system",
//             title: "Welcome to Connect2Uni!",
//             content: "Complete your profile and pay the platform fee to proceed.",
//             is_read: false,
//             timestamp: new Date().toISOString()
//           }
//         ],
//         applications: user.applications || [],
//         visa_status: null, // You can modify this based on actual visa status logic
//         payment_prompt: !user.isPaid
//           ? {
//               type: "platform_fee",
//               amount: 100.0,
//               currency: "GBP",
//               payment_url: "/api/payments/platform-fee"
//             }
//           : null
//       });
//     }

//     // **For Other Roles (University, Agent, Solicitor, Admin)**
//     return res.status(200).json({
//       message: 'Login successful.',
//       user: {
//         id: user._id,
//         email: user.email,
//         role: role
//       },
//       token
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };




exports.resendOtpForLogin = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email exists in the Students collection
    const student = await Students.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Generate a new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minutes

    // Replace any existing unused OTPs for the email
    await Otp.deleteMany({ email, isUsed: false });

    const newOtp = new Otp({
      email,
      otp: otpCode,
      expiry: otpExpiry,
    });

    await newOtp.save();

    // Send the OTP to the email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your received OTP',
      text: `Your OTP is: ${otpCode}. It is valid for 1 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'OTP resent successfully. Please check your email.' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// exports.verifyOtpforLogin = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     // Find student by email
//     const student = await Students.findOne({ email });
//     if (!student) {
//       return res.status(400).json({ message: 'Invalid email.' });
//     }

//     // Check if student is verified
//     if (!student.isVerified) {
//       return res.status(400).json({ message: 'Account is not verified. Please complete registration first.' });
//     }

//     // Find OTP record
//     const otpRecord = await Otp.findOne({ email, otp });
//     if (!otpRecord) {
//       return res.status(400).json({ message: 'Invalid OTP.' });
//     }

//     // Check if OTP is expired
//     if (new Date() > otpRecord.expiry) {
//       return res.status(400).json({ message: 'OTP has expired.' });
//     }

//     // Mark OTP as used
//     otpRecord.isUsed = true;
//     await otpRecord.save();

//     // Generate token
//     const token = jwt.sign({ id: student._id }, process.env.SECRET_KEY, { expiresIn: '5h' });

//     return res.status(200).json({ message: 'OTP verified successfully. Login completed.',role:student.role, token });
//   } catch (error) {
//     console.error('Error verifying OTP:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// Update Student
exports.updateStudent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const studentId = req.studentId;
    const updates = req.body;

    // Disallow updates to restricted fields
    const restrictedFields = ['email', 'password', 'visitedUniversities', 'visitedCourses', 'enrolledCourses'];
    for (const field of restrictedFields) {
      if (updates[field]) {
        return res.status(400).json({ message: `Field "${field}" cannot be updated directly.` });
      }
    }

    // Update student details
    const updatedStudent = await Students.findByIdAndUpdate(studentId, updates, {
      new: true,
      runValidators: true,
      session,
    });

    if (!updatedStudent) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Student updated successfully.', updatedStudent });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating student:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.updatePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const studentId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
    }

    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
    }

    // Fetch the student
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }

    // Hash and update the password
    student.password = await bcrypt.hash(newPassword, 10);
    await student.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// exports.updateStudent = async (req, res) => {
//   try {
//     const id  = req.studentId;
//     const updates = req.body;

//     // Prevent updating password directly
//     if (updates.password) {
//       updates.password = await bcrypt.hash(updates.password, 10);
//     }

//     const updatedStudent = await Students.findByIdAndUpdate(id, updates, { new: true });
//     if (!updatedStudent) {
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     return res.status(200).json({ message: 'Student updated successfully.', updatedStudent });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };





// Delete Student



exports.deleteStudent = async (req, res) => {
  try {
    const id  = req.studentId;
    const deletedStudent = await Students.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.status(200).json({ message: 'Student deleted successfully.' });
  } 
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Get University by ID
exports.getUniversityById = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { universityId } = req.params;
    const studentId = req.user.id; // Extract studentId from authenticated user
//     const role =req.user.role
  


// if (role !== 'student') {
//   return res.status(403).json({ message: 'Access denied. Unauthorized role fdg.' });
// }
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Enter valid universityId.' });
    }
     
const student = await Students.findById(studentId).session(session);
    if (!student) {
      return res.status(200).json({ message: 'Student not found.' });
    }

    // Fetch university
    const findUniversity = await University.findById(universityId).session(session);
    if (!findUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }



    // Ensure visitedUniversities is initialized
    student.visitedUniversities = student.visitedUniversities || [];

    // Add university to visitedUniversities if not already present
    if (!student.visitedUniversities.includes(universityId)) {
      student.visitedUniversities.push(universityId);
      await student.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ University_Details: findUniversity });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error fetching university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Get All Universities
exports.getUniversities = async (req, res) => {
  try {
    // const studentId = req.user.id;
    // const student = await Students.findById(studentId).session(session);
    // if (!student) {
    //   return res.status(404).json({ message: 'Student not found from.' });
    // }
    const universities = await University.find().sort({ isPromoted: -1 });
    if (universities.length === 0) {
      return res.status(404).json({ message: 'No universities found.' });
    }
    return res.status(200).json({ Total: universities.length, universities });
  } catch (error) {
    console.error('Error fetching universities:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Create Payment
exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const studentId = req.studentId;

    // Fetch the student
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Simulate payment (mark as paid)
    student.isPaid = true;
    await student.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Payment successful, you can now access the dashboard.',
      student,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing payment:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//COURSES 

// Get all courses for a specific university
exports.getAllUniversityCourses = async (req, res) => {
  try {
    const { universityId } = req.params; // University ID is required

    // Validate universityId
    if (!isValidObjectId(universityId)) return res.status(400).json({ message: 'Enter a valid universityId' });
    

    // Fetch the university and check if it exists
    const finduniversity = await university.findById(universityId).populate('courses', '_id');
    if (!finduniversity) return res.status(404).json({ message: 'University not found' })

    // Check if the university has any courses
    if (!finduniversity.courses || finduniversity.courses.length === 0) {
      return res.status(404).json({ message: 'This university does not have any courses' });
    }

    // Fetch courses for the specified university
    const courses = await Course.find({ university: universityId }).populate('university', 'name');

    // Check if any courses are found
    if (!courses.length) {
      return res.status(404).json({ message: 'No courses found for the given university' });
    }

    // Send response
    return res.status(200).json({total: courses.length,coursesList: courses});
  } 
  catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getCoursesWithFilters = async (req, res) => {
  try {
    const { minPrice, maxPrice, country, courseName, universityName } = req.query;

    // Build the filter object dynamically
    const filter = {};

    // Filter by fees (minPrice and maxPrice)
    if (minPrice || maxPrice) {
      filter.fees = {};
      if (minPrice) filter.fees.$gte = Number(minPrice);
      if (maxPrice) filter.fees.$lte = Number(maxPrice);
    }

    // Filter by country (for universities)
    if (country) {
      const universitiesInCountry = await university
        .find({ country: new RegExp(country, 'i') })
        .select('_id');
      
      if (universitiesInCountry.length) {
        filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
      } else {
        return res.status(404).json({ message: 'No universities found in the specified country.' });
      }
    }

    // Filter by university name
    if (universityName) {
      const universitiesWithName = await university
        .find({ name: new RegExp(universityName, 'i') })
        .select('_id');
      
      if (universitiesWithName.length) {
        if (filter.university && filter.university.$in) {
          filter.university.$in = filter.university.$in.filter((id) =>
            universitiesWithName.map((uni) => uni._id.toString()).includes(id.toString())
          );

          if (!filter.university.$in.length) {
            return res.status(404).json({ message: 'No universities found matching both country and name criteria.' });
          }
        } else {
          filter.university = { $in: universitiesWithName.map((uni) => uni._id) };
        }
      } else {
        return res.status(404).json({ message: 'No universities found with the specified name.' });
      }
    }

    // Filter by course name
    if (courseName) {
      filter.name = new RegExp(courseName, 'i'); // Case-insensitive search for course name
    }

    // Fetch the filtered courses
    const courses = await Course.find(filter)
      .populate('university', 'name country') // Include university details
      .sort({ applicationDate: -1 }); // Sort by application date (newest first)

    // Check if any courses are found
    if (!courses.length) {
      return res.status(404).json({ message: 'No courses found matching the criteria.' });
    }

    // Send response
    return res.status(200).json({ total: courses.length, coursesList: courses });
  } catch (error) {
    console.error('Error fetching courses with filters:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.studentId; // Assuming `studentId` is provided via middleware/authentication


    if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
    // Fetch the course and its associated university
    const course = await Course.findById(courseId).populate('university', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Fetch the student record
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if the course is already in `visitedCourses`
    if (!student.visitedCourses.includes(courseId)) {
      student.visitedCourses.push(courseId);
      await student.save();
    }
    return res.status(200).json({ Course_Details:course });
  } 
  catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



exports.enrollCourse = async (req, res) => {
  const { courseId } = req.params; // Extract courseId from route parameters
  const studentId = req.studentId; // Extract studentId from middleware (set in req object)

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res.status(400).json({ message: 'Enter a valid courseId' });
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate student existence
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Student not found' });
    }

    // Validate course existence
    const course = await Course.findById(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    if (student.enrolledCourses.includes(courseId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Add course to enrolledCourses
    student.enrolledCourses.push(courseId);
    await student.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Successfully enrolled in the course',
      CourseDetails: course,
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    console.error('Error enrolling in course:', error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
};




//Application 

// exports.getStudentApplications = async (req, res) => {
//   try {
//     const studentId = req.studentId; // Retrieved from authentication middleware

//     // Validate `studentId`
//     if (!mongoose.Types.ObjectId.isValid(studentId)) {
//       return res.status(400).json({ message: 'Invalid student ID provided.' });
//     }

//     // Fetch student applications with populated data
//     const student = await Students.findById(studentId)
//       .populate({
//         path: 'applications.applicationId',
//         select: 'university course status submissionDate financialAid',
//         populate: [
//           { path: 'university', select: 'name country' },
//           { path: 'course', select: 'name fees' },
//           { path: 'agency', select: 'name contactEmail' },
//           { path: 'assignedAgent', select: 'name email' },
//         ],
//       })
//       .select('firstName lastName email applications');

//     if (!student) {
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     // Check if applications exist
//     if (!student.applications || student.applications.length === 0) {
//       return res.status(404).json({ message: 'No applications found for this student.' });
//     }

//     // Directly return populated applications
//     return res.status(200).json({
//       message: 'Successfully fetched student applications.',
//       total:student.applications.length,
//       student: {
//         id: student._id,
//         name: `${student.firstName} ${student.lastName}`,
//         email: student.email,
//       },
//       applications: student.applications.map((app) => app.applicationId), // Directly include the populated application data
//     });
//   } catch (error) {
//     console.error('Error fetching student applications:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };




exports.applyForUniversity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { universityId, courseId } = req.body;
    const { documents } = req.files || {}; // Assuming file upload middleware is used
    const studentId = req.studentId; // Retrieved from authentication middleware

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(universityId) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({ message: 'Invalid IDs provided.' });
    }

    // Fetch the student
    const student = await Students.findById(studentId).session(session).select(
      'firstName middleName lastName dateOfBirth gender email telephoneNumber presentAddress permanentAddress documentType ' +
      'documentUpload mostRecentEducation otherEducationName yearOfGraduation collegeUniversity programType otherProgramName ' +
      'discipline otherDisciplineName countryApplyingFrom applications isPaid referralSource assignedAgent preferredCommunicationMethod'
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch the university
    const getUniversity = await University.findById(universityId).session(session).select('courses');
    if (!getUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the course exists in the university
    const courseExists = getUniversity.courses.some((course) =>
      course.toString() === courseId
    );
    if (!courseExists) {
      return res.status(400).json({ message: 'The selected course does not exist in the specified university.' });
    }

    // Check if the student already applied to the same course at the university
    const existingApplication = await Application.findOne({
      student: studentId,
      university: universityId,
      course: courseId,
    }).session(session);
    if (existingApplication) {
      return res.status(400).json({ message: 'Application already exists for this course at the selected university.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
    if (!defaultAgency) {
      return res.status(500).json({ message: 'Default agency not found.' });
    }

    // Prepare document metadata if documents are uploaded
    const uploadedDocuments = documents
      ? documents.map((doc) => ({
          fileName: doc.originalname,
          fileType: doc.mimetype,
          fileUrl: doc.path,
        }))
      : [];

    // Create a new application
    const newApplication = new Application({
      student: studentId,
      university: universityId,
      course: courseId,
      documents: uploadedDocuments,
      agency: defaultAgency._id, // Assign default agency
      assignedAgent: student.assignedAgent, // Retain assigned agent from student record
    });

    // Save the application
    await newApplication.save({ session });

    // Update the student's application list
    student.applications.push({ applicationId: newApplication._id });
    await student.save({ session });

    // Update the agency's pending applications list
    defaultAgency.pendingApplications.push(newApplication._id);
    await defaultAgency.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Application submitted successfully.',
      application: {
        id: newApplication._id,
        status: newApplication.status,
        submissionDate: newApplication.submissionDate,
        university: newApplication.university,
        course: newApplication.course,
      },
      student: {
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        email: student.email,
        telephoneNumber: student.telephoneNumber,
        presentAddress: student.presentAddress,
        permanentAddress: student.permanentAddress,
        documentType: student.documentType,
        documentUpload: student.documentUpload,
        mostRecentEducation: student.mostRecentEducation,
        otherEducationName: student.otherEducationName,
        yearOfGraduation: student.yearOfGraduation,
        collegeUniversity: student.collegeUniversity,
        programType: student.programType,
        otherProgramName: student.otherProgramName,
        discipline: student.discipline,
        otherDisciplineName: student.otherDisciplineName,
        countryApplyingFrom: student.countryApplyingFrom,
        referralSource: student.referralSource,
        assignedAgent: student.assignedAgent,
        preferredCommunicationMethod: student.preferredCommunicationMethod,
        isPaid: student.isPaid,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error applying for university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.getStudentApplications = async (req, res) => {
  try {
    const studentId = req.studentId; // Retrieved from authentication middleware

    // Validate `studentId`
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID provided.' });
    }


    // Fetch the student and their applications
    const student = await Students.findById(studentId)
      .populate({
        path: 'applications.applicationId',
        populate: [
          { path: 'university', select: 'name country' },
          { path: 'course', select: 'name fees' },
          { path: 'agency', select: 'name contactEmail' },
          { path: 'assignedAgent', select: 'name email' },
        ],
      })
      .select('applications firstName lastName email');

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if the student has any applications
    if (!student.applications || student.applications.length === 0) {
      return res.status(404).json({ message: 'No applications found for this student.' });
    }

    // Prepare the response data
    const applications = student.applications
      .filter((app) => app.applicationId) // Ensure applicationId exists before accessing its fields
      .map((app) => ({
        applicationId: app.applicationId._id,
        university: app.applicationId.university ? app.applicationId.university.name : 'Unknown',
        country : app.applicationId.university.country,
        course: app.applicationId.course ? app.applicationId.course.name : 'Unknown',
        status: app.applicationId.status,
        submissionDate: app.applicationId.submissionDate ? app.applicationId.submissionDate.toLocaleDateString() : null,
        submissionTime: app.applicationId.submissionDate ? app.applicationId.submissionDate.toISOString().slice(11, 19) : null, 
        // reviewDate: app.applicationId.reviewDate || 'Not reviewed yet',
        notes: app.applicationId.notes || 'No notes provided',
        // // documents: app.applicationId.documents || [],
        // financialAid: app.applicationId.financialAid || 'Not specified',
        // agency: app.applicationId.agency ? app.applicationId.agency.name : 'Default Agency',
        // assignedAgent: app.applicationId.assignedAgent
        //   ? { name: app.applicationId.assignedAgent.name, email: app.applicationId.assignedAgent.email }
        //   : 'Not assigned',
      }));

    // If no valid applications are available
    if (applications.length === 0) {
      return res.status(404).json({ message: 'No valid application data found.' });
    }

    return res.status(200).json({
      total:applications.length,
      message: 'Successfully fetched student applications.',
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
      },
      applications,
    });
  } catch (error) {
    console.error('Error fetching student applications:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.getApplicationByIdForStudent = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const studentId = req.studentId; // Retrieved from authentication middleware

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    const application = await Application.findById(applicationId)
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('agency', 'name email')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You do not have access to this application.' });
    }

    // Debugging: Log the populated data
    console.log('Populated Application:', application);

    const response = {
      applicationId: application._id,
      university: application.university ? application.university.name : 'Unknown',
      country: application.university ? application.university.country : 'Unknown',
      course: application.course ? application.course.name : 'Unknown',
      courseFees: application.course ? application.course.fees : 'Unknown',
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      documents: application.documents || [],
      financialAid: application.financialAid || 'Not specified',
      agency: application.agency
        ? { name: application.agency.name, email: application.agency.email }
        : { name: 'Default Agency', email: 'N/A' },
      assignedAgent: application.assignedAgent
        ? { name: application.assignedAgent.name, email: application.assignedAgent.email }
        : { name: 'Not assigned', email: 'N/A' },
    };

    return res.status(200).json({
      message: 'Application details fetched successfully.',
      application: response,
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
