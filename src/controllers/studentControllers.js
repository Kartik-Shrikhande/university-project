const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');
const university = require('../models/universityModel');
const University = require('../models/universityModel');
const Application = require('../models/applicationModel');
const Course = require('../models/coursesModel');
const { isValidObjectId } = require('mongoose');
const { uploadFilesToS3 } = require('../utils/s3Upload');
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
const Solicitor = require('../models/solicitorModel');
const Agency = require('../models/agencyModel');
const crypto = require('crypto');
const AssociateSolicitor =require('../models/associateModel')
const Notification = require('../models/notificationModel');



//SOLICTOR  
exports.applyForSolicitor = async (req, res) => {
  try {
    const studentId = req.user.id; // From authenticated student
    const { applicationId } = req.params;

    // Verify student exists
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // ✅ Check if solicitor service is paid
    if (!student.solicitorService) {
      return res.status(403).json({ success: false, message: "Solicitor service not available. Please complete the payment first." });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    // Verify the application exists, belongs to the student, and is accepted
    const application = await Application.findOne({ _id: applicationId, student: studentId, status: 'Accepted' });

    if (!application) {
      return res.status(400).json({ success: false, message: "Application must be accepted and belong to the student" });
    }

    // Get associated agency
    const agency = await Agency.findById(application.agency);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Associated agency not found" });
    }

    // Prevent duplicate solicitor requests by Application ID
    if (agency.solicitorRequests.includes(applicationId)) {
      return res.status(400).json({ success: false, message: "Solicitor service request for this application already submitted" });
    }

    // Store applicationId in solicitorRequests
    agency.solicitorRequests.push(applicationId);
    await agency.save();

    res.status(200).json({ success: true, message: "Solicitor service request submitted successfully" });
  } catch (err) {
    console.error("Error applying for solicitor service:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




exports.checkSolicitorStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const studentId = req.user.id;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    // Find application
    const application = await Application.findById(applicationId)
      .populate("assignedSolicitor", "firstName lastName email phoneNumber");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Check if this application belongs to the logged-in student
    if (application.student.toString() !== studentId) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this application" });
    }

    // Check if solicitor service is purchased
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (!student.solicitorService) {
      return res.status(200).json({
        success: true,
        message: "You have not enrolled for solicitor service.",
        status: null,
        isAssigned: false,
        solicitor: null
      });
    }

    // If solicitor is already assigned to this application
    if (application.assignedSolicitor) {
      return res.status(200).json({
        success: true,
        message: "Solicitor has been assigned.",
        status: "Accepted",
        isAssigned: true,
        solicitor: application.assignedSolicitor
      });
    }

    // Check if request is being processed by agency
    const agencyWithRequest = await Agency.findOne({ solicitorRequests: applicationId });
    if (agencyWithRequest) {
      return res.status(200).json({
        success: true,
        message: "Your solicitor request is being processed by the agency.",
        status: "Processing",
        isAssigned: false,
        solicitor: null
      });
    }

    // Check if request is being processed by an associate
    const associateWithRequest = await AssociateSolicitor.findOne({ assignedSolicitorRequests: applicationId });
    if (associateWithRequest) {
      return res.status(200).json({
        success: true,
        message: "Your solicitor request is being processed by the associate.",
        status: "Processing",
        isAssigned: false,
        solicitor: null
      });
    }

    // Check if request is being processed by a solicitor (but not yet assigned)
    const solicitorWithRequest = await Solicitor.findOne({ assignedSolicitorRequests: applicationId });
    if (solicitorWithRequest) {
      return res.status(200).json({
        success: true,
        message: "Your solicitor request is being processed by the solicitor.",
        status: "Processing",
        isAssigned: false,
        solicitor: null
      });
    }

    // Fallback if no one has it and solicitor not assigned
    return res.status(200).json({
      success: true,
      message: "You have not requested for solicitor service.",
      status: null,
      isAssigned: false,
      solicitor: null
    });

  } catch (error) {
    console.error("Error checking solicitor assignment status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



//Notification

exports.getAllNotifications = async (req, res) => {
  try {
    const studentId = req.user.id;

    const notifications = await Notification.find({ user: studentId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getNotificationById = async (req, res) => {
  try {
    const Id = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: Id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Mark as read if it's not already
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Error fetching notification by ID:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteStudentNotificationById = async (req, res) => {
  try {
    const studentId = req.user.id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Ensure the notification belongs to the student
    if (notification.user.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: This notification does not belong to you' });
    }

    await Notification.findByIdAndDelete(notificationId);
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error deleting student notification:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
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
      address,
      documentType,
      mostRecentEducation,
      courseName,
        fromYear,
        toYear,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      // countryApplyingFrom,
      // countryName,
      preferredUniversity,
      NameOfUniversity,
      preferredCourse,
      NameOfCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      testName,
      score,
      referralSource,
      // preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
    } = req.body;


    const isEnglishTestRequired = englishLanguageRequirement.toLowerCase() === 'yes';

    // Validate required fields based on English test requirement
    if (isEnglishTestRequired) {
      if (!testName || !score || !(req.files && req.files['documentUpload'])) {
        return res.status(400).json({
          message: 'Test name, score, and documentUpload are required when English language test is given.',
        });
      }
    }
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


//  // Generate OTP
//  const otpCode = Math.floor(100000 + Math.random() * 900000);
//  const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minutes

//  // Save OTP to the database
//  const newOtp = new Otp({
//    email,
//    otp: otpCode,
//    expiry: otpExpiry,
//  });
//  await newOtp.save({ session });

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
      documentType,
      documentUpload:uploadedDocumentUploads,
      document: uploadedDocuments, // Save document URLs
      mostRecentEducation,
      courseName,
        fromYear,
        toYear,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      // countryApplyingFrom,
      // countryName,
      preferredUniversity,
      NameOfUniversity,
      preferredCourse,
      NameOfCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      testName: isEnglishTestRequired ? testName : undefined,
      score: isEnglishTestRequired ? score : undefined,
      referralSource,
      // preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
      verificationToken,
      address: {  // Updated Address Structure
        country: address.country,
        zip_postalCode: address.zip_postalCode,
        state_province_region: address.state_province_region,
        city: address.city,
        addressLine: address.addressLine,
      },
    });
   
  
    await newStudent.save({ session });
  // Generate JWT Token
  const token = jwt.sign(
    { id: newStudent._id, role: 'student' },
    process.env.SECRET_KEY,
    { expiresIn: '1h' }
  );

  // Set token in HTTP-only cookie
  res.cookie('refreshtoken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.setHeader('Authorization', `Bearer ${token}`)
  
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
  ${process.env.EMAIL_VERIFICATION_SERVER_LINK}/student/verify-email?token=${verificationToken}`,
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

    return res.status(200).json({
       message: 'A verification link has been sent to your email. Please click on the link to verify your email address in order to login.' 
       ,token:token
      });
   
  
  }
   catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.verifyStudentStatus = async (req, res) => {
  try {
    // const token = req.cookies.refreshtoken || req.header('Authorization').replace('Bearer ', '');
    // if (!token) {
    //   return res.status(401).json({ status: false, message: 'Unauthorized: No token provided' });
    // }

    // const decoded = jwt.verify(token, process.env.SECRET_KEY);
    // const student = await Students.findById(decoded.id);
    // if (!student) {
    //   return res.status(404).json({ status: false, message: 'Student not found' });
    // }
    const studentId = req.user.id;

    // Fetch student details from the database
    const student = await Students.findById(studentId).select('isVerified isPaid'); // Only fetch required fields
    if (!student) {
      return res.status(404).json({ status: false, message: 'Student not found' });
    }

    // Extract verification and subscription status directly from database
    const isVerified = student.isVerified; // No default value, taken directly from DB
    const isPaid = student.isPaid; // No default value, taken directly from DB

    return res.status(200).json({
      status: true,
      verification: isVerified,
      subscription: isPaid,
    });
  } catch (error) {
    console.error('Error verifying student status:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
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


//previouse approach in use -08/02/2025

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
      { model: Solicitor, roleName: 'solicitor' },
      { model: Agency, roleName: 'admin' } ,// Updated to match Agency model
      { model: AssociateSolicitor, roleName: 'Associate' } // Added Associate Role
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

       // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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


    // Send JWT in Response Headers
    res.setHeader('Authorization', `Bearer ${token}`);
    
 // **Always Update `loginCompleted` to `true` for Students if it is false**
   // **Ensure `loginCompleted` is Set to `true` for Students Whenever It’s False**
    if (role === "student" && user.loginCompleted === false) {
      await Students.updateOne({ _id: user._id }, { $set: { loginCompleted: true } });
      user.loginCompleted = true; // Update user object for response
    }

  //  **Custom Response for Students**
    if (role === "student") {
      return res.status(200).json({
        message: 'Login successful.',
        role: role,
        token: token,
        // userDetail:user,
        user: {
          id: user._id,
          email: user.email,
          // role: role,
          is_active: true, // Assuming all logged-in users are active
          email_verified: user.isVerified || false,
          platform_fee_paid: user.isPaid || false,
          created_at: user.createdAt,
          // loginCompleted: user.loginCompleted // Now guaranteed to be true if it was false
        },
        platform_access: {
          courses_visible: user.isPaid || false, // Allow course visibility if fee is paid
          payment_required: !user.isPaid, // If not paid, payment is required
          message: user.isPaid
            ? "You have full access to to view universities and courses."
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

if (role === 'solicitor') {
  return res.status(200).json({
    message: 'Login successful.',
    role: role,
    token: token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      visaRequestStatus: user.visaRequestStatus,
      completedVisa: user.completedVisa
    }
  });
}


 // **Custom Response for Associate Solicitor Role**
    if (role === 'Associate') {
      return res.status(200).json({
        message: 'Login successful.',
        role: role,
        token: token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address || '',
          created_at: user.createdAt
        },
        // platform_access: {
        //   allowed_actions: [
        //     "review_applications",
        //     "approve_documents",
        //     "validate_legal_requirements"
        //   ],
        //   blocked_actions: [
        //     "edit_profile",
        //     "apply_to_courses"
        //   ]
        // },
        // notifications: [
        //   {
        //     id: "NOTIF-001",
        //     type: "system",
        //     title: "Welcome to Connect2Uni!",
        //     content: "You have new applications assigned for review.",
        //     is_read: false,
        //     timestamp: new Date().toISOString()
        //   }
        // ],
        // metadata: {
        //   total_applications_reviewed: user.applicationsReviewed?.length || 0,
        //   pending_reviews: user.pendingReviews?.length || 0
        // }
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



///////////////////////////////////////////////////

// exports.appLogin = async (req, res) => {
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
//       { model: Agency, roleName: 'admin' } // Updated to match Agency model
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
//        // Compare password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).json({ message: 'Invalid email or password.' });
//     }
//     //  // Check if email is verified
//     //  if (!user.isVerified) {
//     //   return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
//     // }
//       // **Enforce Email Verification ONLY for Students**
//       if (role === "student" && !user.isVerified) {
//         return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
//       }

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


//     // Send JWT in Response Headers
//     res.setHeader('Authorization', `Bearer ${token}`);

//     // **Default Response for Other Roles**
//     return res.status(200).json({ message: 'Login successful.', role: role, token ,userId: user._id,user:user});

//   } catch (error) {
//     console.error('Login Error:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }
// };





// @desc    Check if a student is verified
// @route   GET /api/students/verify-status/:id
// @access  Public
exports.checkStudentVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if ID is provided
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Student ID is required.'
      });
    }

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid student ID format.'
      });
    }

    // Find student by ID
    const student = await Students.findById(id);

    // If student not found
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    // Check verification status
    return res.status(200).json({
      status: student.isVerified ? 'success' : 'pending',
      message: student.isVerified ? 'Student is verified.' : 'Student is not verified.',
      // studentId: student._id,
      email: student.email,
      isVerified: student.isVerified
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

// Function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

//IN USE
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

     // Check if email is provided
     if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    // Check if the student exists
    const student = await Students.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if the student is already verified
    if (student.isVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Generate a new verification token
    const newVerificationToken = crypto.randomBytes(32).toString('hex');

    // Update the student record with the new token
    student.verificationToken = newVerificationToken;
    await student.save();

    // Configure the email transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification - Resend',
      text: `Click the following link to verify your email: 
      ${process.env.EMAIL_VERIFICATION_SERVER_LINK}/student/verify-email?token=${newVerificationToken}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: 'A new verification link has been sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    // console.log(error)
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//
// exports.resendVerificationEmailAutomated = async (req, res) => {
//   try {
//     // Extract user ID from JWT token
//     const userId = req.user.id;

//     // Find the student in the database
//     const student = await Students.findById(userId);
//     if (!student) return res.status(404).json({ message: 'Student not found.' });

//     if (student.isVerified) return res.status(400).json({ message: 'Email already verified.' });

//     // Generate a new verification token and update expiry
//     const newVerificationToken = crypto.randomBytes(32).toString('hex');
//     student.verificationToken = newVerificationToken;
//     student.verificationTokenExpiry = Date.now() + 15 * 60 * 1000;

//     await student.save();

//     // Send verification email
//     sendVerificationEmail(student.email, newVerificationToken);

//     res.status(200).json({ message: 'Verification email resent successfully.' });

//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error.' });
//   }
// };

//P
exports.seeStudentProfile = async (req, res) => {
  try {

    const studentId = req.user.id;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid Student ID' });
    }

    // Fetch student profile, excluding sensitive & unnecessary fields
    const student = await Students.findById(studentId)
      .select('-password -verificationToken -createdAt -updatedAt -isDeleted -__v');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.status(200).json({ success: true, student });

  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



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



// Update Student


exports.updateStudent = async (req, res) => {
  let session;
  try {
    const studentId = req.user.id;
    let updates = req.body;

    // Remove empty fields from updates
    updates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== '')
    );

    // Restricted fields that cannot be updated
    const restrictedFields = [
      'email',
      'password',
      'visitedUniversities',
      'visitedCourses',
      'enrolledCourses',
    ];

    // Check if any restricted fields are included in updates
    const invalidFields = Object.keys(updates).filter((field) =>
      restrictedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      return res
        .status(400)
        .json({
          message: `Fields ${invalidFields.join(', ')} cannot be updated directly.`,
        });
    }

    // Check if there are valid fields to update or files to upload
    if (
      Object.keys(updates).length === 0 &&
      (!req.files || (!req.files['document'] && !req.files['documentUpload']))
    ) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Start a session for transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Handle document uploads (if any)
    let uploadedDocuments = [];
    let uploadedDocumentUploads = [];

    if (req.files) {
      if (req.files['document']) {
        uploadedDocuments = await uploadFilesToS3(req.files['document']); // Upload 'document' files
      }

      if (req.files['documentUpload']) {
        uploadedDocumentUploads = await uploadFilesToS3(req.files['documentUpload']); // Upload 'documentUpload' files
      }
    }

    // Prepare document uploads for update
    if (uploadedDocuments.length > 0) {
      updates.document = [
        ...(Array.isArray(updates.document) ? updates.document : []),
        ...uploadedDocuments,
      ];
    }

    if (uploadedDocumentUploads.length > 0) {
      updates.documentUpload = [
        ...(Array.isArray(updates.documentUpload)
          ? updates.documentUpload
          : []),
        ...uploadedDocumentUploads,
      ];
    }

    // Update student details
    const updatedStudent = await Students.findByIdAndUpdate(
      studentId,
      { $set: updates }, // Use $set to update specific fields
      { new: true, runValidators: true, session }
    );

    if (!updatedStudent) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Commit transaction if everything succeeds
    await session.commitTransaction();

    return res.status(200).json({
      message: 'Student updated successfully.',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (session) {
      await session.abortTransaction();
    }
    return res
      .status(500)
      .json({ message: 'Internal server error.', error: error.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};



// exports.updateStudent = async (req, res) => {
//   let session;
//   try {
//     const studentId = req.user.id;
//     let updates = req.body;

//     // Remove fields that are empty strings
//     updates = Object.fromEntries(
//       Object.entries(updates).filter(([_, value]) => value !== '')
//     );

    
//     // Restricted fields that cannot be updated
//     const restrictedFields = ['email', 'password', 'visitedUniversities', 'visitedCourses', 'enrolledCourses'];

//     // Check if any restricted field is being updated
//     const invalidFields = Object.keys(updates).filter(field => restrictedFields.includes(field));
//     if (invalidFields.length > 0) {
//       return res.status(400).json({ message: `Fields ${invalidFields.join(', ')} cannot be updated directly.` });
//     }

//     // Check if there are any valid fields left to update
//  // Check if there are any valid fields left to update
//  if (
//   Object.keys(updates).length === 0 &&
//   (!req.files || (!req.files['document'] && !req.files['documentUpload']))
// ) {
//   return res.status(400).json({ message: 'No valid fields to update.' });
// }

//     // Start session only if using transactions
//     session = await mongoose.startSession();
//     session.startTransaction();

//     // Update student details
//     const updatedStudent = await Students.findByIdAndUpdate(
//       studentId,
//       { $set: updates }, // Using $set to update only specific fields
//       { new: true, runValidators: true, session }
//     );

//   // Handle document uploads
// // Handle document uploads
// let uploadedDocuments = [];
// if (req.files && req.files['document']) {
//   uploadedDocuments = await uploadFilesToS3(req.files['document']);  // uploadFilesToS3 handles S3 upload logic for 'documents'
// }
// // console.log(req.files); // Log the incoming file fields


// let uploadedDocumentUploads = [];
// if (req.files && req.files['documentUpload']) {
//   uploadedDocumentUploads = await uploadFilesToS3(req.files['documentUpload']);  // uploadFilesToS3 handles S3 upload logic for 'documentUpload'
// }


//     if (!updatedStudent) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     // Commit transaction only if the update was successful
//     await session.commitTransaction();

//     return res.status(200).json({ message: 'Student updated successfully.', student: updatedStudent,new:true});

//   } catch (error) {
//     console.error('Error updating student:', error);
//     if (session) {
//       await session.abortTransaction();
//     }
//     return res.status(500).json({ message: 'Internal server error.', error: error.message });
//   } finally {
//     if (session) {
//       session.endSession();
//     }
//   }
// };





// exports.updateStudent = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const studentId = req.user.id;
//     const updates = req.body;

//     // Disallow updates to restricted fields
//     const restrictedFields = ['email', 'password', 'visitedUniversities', 'visitedCourses', 'enrolledCourses'];
//     for (const field of restrictedFields) {
//       if (updates[field]) {
//         return res.status(400).json({ message: `Field "${field}" cannot be updated directly.` });
//       }
//     }

//     // Update student details
//     const updatedStudent = await Students.findByIdAndUpdate(studentId, updates, {
//       new: true,
//       runValidators: true,
//       session,
//     });

//     if (!updatedStudent) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     // Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({ message: 'Student updated successfully.', updatedStudent });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error('Error updating student:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



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

    // Validate universityId
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Enter a valid universityId.' });
    }

    // Check if student exists
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch university, ensuring it's not deleted
    const findUniversity = await University.findOne({
      _id: universityId,
      isDeleted: false, // Ensuring we only fetch non-deleted universities
    }).session(session);

    if (!findUniversity) {
      return res.status(404).json({ message: 'University not found or has been deleted.' });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'University fetched successfully.',
      university: findUniversity,
    });
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
    const universities = await University.find({isDeleted:false}).sort({ isPromoted: -1 });
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
    const studentId = req.user.id;

    // Fetch the student
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    // if(student.isPaid) res.status(200).json({message: 'Payment already done for this user'});

    // Simulate payment (mark as paid)
    student.isPaid = true;
    await student.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Payment successful, you can now access the dashboard.',
      // student,
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
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Enter a valid universityId' });
    }

    // Fetch the university and ensure it is not deleted
    const findUniversity = await University.findOne({ _id: universityId, isDeleted: false }).populate('courses', '_id name');
    if (!findUniversity) {
      return res.status(404).json({ message: 'University not found or has been deleted' });
    }

    // Fetch only active courses (excluding deleted courses)
    const courses = await Course.find({
      university: universityId,
      isDeleted: false, // Exclude deleted courses
      status: 'Active' // Only fetch active courses
    }).populate('university', 'name');

    // Check if any active courses are found
    if (!courses.length) {
      return res.status(404).json({ message: 'No active courses found for the given university' });
    }

    // Send response
    return res.status(200).json({
      university_name: findUniversity.name,
      total: courses.length,
      coursesList: courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


//get all courses for student + with filteration

exports.getCoursesWithFilters = async (req, res) => {
  try {
    const { 
      minPrice, 
      maxPrice, 
      country, 
      courseName, 
      universityName, 
      courseType, 
      minDuration, 
      maxDuration, 
      expiryDate 
    } = req.query;

    // Build the filter object dynamically
    const filter = {
      status: 'Active', // Show only active courses
      isDeleted: false, // Exclude soft-deleted courses
    };

    // Validate and apply price filters
    if (minPrice || maxPrice) {
      const min = Number(minPrice);
      const max = Number(maxPrice);

      if (minPrice && isNaN(min)) {
        return res.status(400).json({ message: 'minPrice must be a valid number.' });
      }
      if (maxPrice && isNaN(max)) {
        return res.status(400).json({ message: 'maxPrice must be a valid number.' });
      }
      if ((minPrice && min < 0) || (maxPrice && max < 0)) {
        return res.status(400).json({ message: 'Price values cannot be negative.' });
      }
      if (minPrice && maxPrice && min > max) {
        return res.status(400).json({ message: 'Invalid price range. minPrice cannot be greater than maxPrice.' });
      }

      filter.fees = {};
      if (minPrice) filter.fees.$gte = min;
      if (maxPrice) filter.fees.$lte = max;
    }

    // Fetch universities matching country filter
    if (country) {
      const universitiesInCountry = await University.find({
        'address.country': new RegExp(country, 'i'),
        isDeleted: false, // Exclude deleted universities
      }).select('_id');

      if (!universitiesInCountry.length) {
        return res.status(404).json({ message: 'No universities found in the specified country.' });
      }

      filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
    }

    // Fetch universities matching university name filter
    if (universityName) {
      const universitiesWithName = await University.find({
        name: new RegExp(universityName, 'i'),
        isDeleted: false, // Exclude deleted universities
      }).select('_id');

      if (!universitiesWithName.length) {
        return res.status(404).json({ message: 'No universities found with the specified name.' });
      }

      // If both country and university name are provided, filter matching both
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
    }

    // Apply course name filter
    if (courseName) {
      filter.name = new RegExp(courseName, 'i'); // Case-insensitive search
    }

    // **New: Apply Course Type filter**
    if (courseType) {
      filter.courseType = new RegExp(courseType, 'i'); // Case-insensitive match
    }

    // **New: Apply Course Duration filter**
    if (minDuration || maxDuration) {
      const minDur = Number(minDuration);
      const maxDur = Number(maxDuration);

      if (minDuration && isNaN(minDur)) {
        return res.status(400).json({ message: 'minDuration must be a valid number.' });
      }
      if (maxDuration && isNaN(maxDur)) {
        return res.status(400).json({ message: 'maxDuration must be a valid number.' });
      }
      if ((minDuration && minDur < 0) || (maxDuration && maxDur < 0)) {
        return res.status(400).json({ message: 'Duration values cannot be negative.' });
      }
      if (minDuration && maxDuration && minDur > maxDur) {
        return res.status(400).json({ message: 'Invalid duration range. minDuration cannot be greater than maxDuration.' });
      }

      filter.courseDuration = {};
      if (minDuration) filter.courseDuration.$gte = minDur;
      if (maxDuration) filter.courseDuration.$lte = maxDur;
    }

    // **New: Apply Expiry Date filter**
    if (expiryDate) {
      const parsedExpiryDate = new Date(expiryDate);
      if (isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format. Use YYYY-MM-DD.' });
      }
      filter.expiryDate = { $gte: parsedExpiryDate }; // Show courses that expire on or after the given date
    }

    // Fetch the filtered courses
    const courses = await Course.find(filter)
      .populate({
        path: 'university',
        select: 'name address.country', // Include university details
      })
      .sort({ applicationDate: -1 }); // Sort by latest application date

    if (!courses.length) {
      return res.status(404).json({ message: 'No active courses found matching the criteria.' });
    }

    // Send response
    return res.status(200).json({ total: courses.length, coursesList: courses });
  } catch (error) {
    console.error('Error fetching courses with filters:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// exports.getCoursesWithFilters = async (req, res) => {
//   try {
//     const { minPrice, maxPrice, country, courseName, universityName } = req.query;

//     // Build the filter object dynamically
//     const filter = {};

//     // Filter by fees (minPrice and maxPrice)
//     if (minPrice || maxPrice) {
//       filter.fees = {};
//       if (minPrice) filter.fees.$gte = Number(minPrice);
//       if (maxPrice) filter.fees.$lte = Number(maxPrice);
//     }

//     // Filter by country (for universities)
//     if (country) {
//       const universitiesInCountry = await university
//         .find({ country: new RegExp(country, 'i') })
//         .select('_id');
      
//       if (universitiesInCountry.length) {
//         filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
//       } else {
//         return res.status(404).json({ message: 'No universities found in the specified country.' });
//       }
//     }

//     // Filter by university name
//     if (universityName) {
//       const universitiesWithName = await university
//         .find({ name: new RegExp(universityName, 'i') })
//         .select('_id');
      
//       if (universitiesWithName.length) {
//         if (filter.university && filter.university.$in) {
//           filter.university.$in = filter.university.$in.filter((id) =>
//             universitiesWithName.map((uni) => uni._id.toString()).includes(id.toString())
//           );

//           if (!filter.university.$in.length) {
//             return res.status(404).json({ message: 'No universities found matching both country and name criteria.' });
//           }
//         } else {
//           filter.university = { $in: universitiesWithName.map((uni) => uni._id) };
//         }
//       } else {
//         return res.status(404).json({ message: 'No universities found with the specified name.' });
//       }
//     }

//     // Filter by course name
//     if (courseName) {
//       filter.name = new RegExp(courseName, 'i'); // Case-insensitive search for course name
//     }

//     // Fetch the filtered courses
//     const courses = await Course.find(filter)
//       .populate('university', 'name country') // Include university details
//       .sort({ applicationDate: -1 }); // Sort by application date (newest first)

//     // Check if any courses are found
//     if (!courses.length) {
//       return res.status(404).json({ message: 'No courses found matching the criteria.' });
//     }

//     // Send response
//     return res.status(200).json({ total: courses.length, coursesList: courses });
//   } catch (error) {
//     console.error('Error fetching courses with filters:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id; // Assuming `studentId` is provided via middleware/authentication


    if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
    // Fetch the course and its associated university
    const course = await Course.findOne({ _id: courseId, status:'Active',isDeleted:false}).populate('university', 'name');
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




