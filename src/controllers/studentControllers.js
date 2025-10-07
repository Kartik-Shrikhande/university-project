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
const checkEmailExists = require('../utils/checkEmailExists');
const { sendVerificationEmail } = require('../services/emailService');
const { generateEmailTemplate, sendEmail,sendAccountDeletionOtpEmail ,sendEmailWithLogo,sendLoginOtpEmail} = require('../services/emailService');

const path = require("path");
const logoPath = path.join(__dirname, "../images/logo.png"); // Adjusted path to logo


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

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    // Verify the application exists, belongs to the student, and is accepted
    const application = await Application.findOne({ _id: applicationId, student: studentId, status: 'Accepted' });

    if (!application) {
      return res.status(400).json({ success: false, message: "Application must be accepted and belong to the student" });
    }

    // ✅ Check if solicitor service is paid for this application
    if (!application.solicitorPaid) {
      return res.status(403).json({ success: false, message: "Solicitor service not available for this application. Please complete the payment first." });
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

      // ✅ Update student's solicitorService status to true
    student.solicitorService = true;
    await student.save();

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

    if (!application.solicitorPaid) {
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

  
exports.checkMailStudent = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const existingRole = await checkEmailExists(email); // No session needed here
    if (existingRole) {
      return res.status(400).json({status:false, message: `This email is already in use.` });
    }

    return res.json({status:true, message: "Email is available." });

  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


// Registration
exports.registerStudent = async (req, res) => {

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
      solicitorService
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
 const existingRole = await checkEmailExists(email, null);
if (existingRole) {
   return res.status(400).json({ message: `This email is already in use.` });
}

    if (!countryCode) {
   
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
       solicitorService,
      verificationToken,
      address: {  // Updated Address Structure
        country: address.country,
        zip_postalCode: address.zip_postalCode,
        state_province_region: address.state_province_region,
        city: address.city,
        addressLine: address.addressLine,
      },
    });
   
  
    await newStudent.save();
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
  
  // Email content
  await sendVerificationEmail(newStudent);
    //OTP
    // const mailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Registration OTP',
    //   text: `Your OTP for registration is: ${otpCode}. It is valid for 1 minutes.`,
    // };

    // await transporter.sendMail(mailOptions);

    // Commit the transaction

    return res.status(200).json({
       message: 'A verification link has been sent to your email. Please click on the link to verify your email address in order to login.' 
       ,token:token
      });
   
  
  }
   catch (error) {
  
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.verifyStudentStatus = async (req, res) => {
  try {

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


const generateWebPageTemplate = (title, message, color, actionButton = null) => `
  <html>
    <head>
      <title>${title}</title>
    </head>
    <body style="font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;margin:0;padding:30px;">
      <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.12);border:1px solid #ddd;">
        <div style="text-align:center;padding:30px 20px 10px;">
          <img src="${process.env.SERVER_URL}/images/logo.png" alt="Connect2Uni" style="margin-bottom:20px;max-height:60px;">
          <h1 style="color:#004AAC;font-size:24px;font-weight:600;margin:0 0 10px;">${title}</h1>
        </div>
        <div style="padding:0 30px 30px;font-size:16px;color:#333;line-height:1.6;text-align:center;">
          <p style="color:${color}; font-size:18px; margin: 20px 0;">${message}</p>

          ${
            actionButton
              ? `<div style="margin-top:30px;">
                  <a href="${actionButton.link}" 
                    style="background-color:#004AAC; color:#ffffff; padding:10px 40px; border-radius:5px; text-decoration:none; font-weight:400; display:inline-block;">
                    ${actionButton.text}
                  </a>
                </div>`
              : ""
          }

          <p style="margin-top:40px;color:#888;font-size:14px;">&copy; ${new Date().getFullYear()} Connect2Uni. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
`;



const isMobileDevice = (userAgent) => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const userAgent = req.get('User-Agent') || '';

    const student = await Students.findOne({ verificationToken: token });

    if (!student) {
      return res.status(400).send(
        generateWebPageTemplate(
          "Email Verification",
          "Invalid or expired verification link.",
          "red"
        )
      );
    }

    student.isVerified = true;
    student.verificationToken = null;
    await student.save();

    // Check if it's a mobile device
    const isMobile = isMobileDevice(userAgent);
    
    // For mobile devices, redirect to app deep link
    // For desktop/tablet, redirect to web login
    const loginUrl = isMobile 
      ? `connect2uni://login?email=${encodeURIComponent(student.email)}&verified=true`
      : `${process.env.CLIENT_LOGIN_PAGE}`;

    // If it's a mobile device, try to redirect directly to the app
    if (isMobile) {
      // First try to redirect to the app
      res.status(200).send(`
        <html>
          <head>
            <title>Email Verified!</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;margin:0;padding:30px;">
            <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.12);border:1px solid #ddd;">
              <div style="text-align:center;padding:30px 20px 10px;">
                <img src="${process.env.SERVER_URL}/images/logo.png" alt="Connect2Uni" style="margin-bottom:20px;max-height:60px;">
                <h1 style="color:#004AAC;font-size:24px;font-weight:600;margin:0 0 10px;">Email Verified!</h1>
              </div>
              <div style="padding:0 30px 30px;font-size:16px;color:#333;line-height:1.6;text-align:center;">
                <p style="color:#00AA55; font-size:18px; margin: 20px 0;">Your email has been successfully verified. Opening the app...</p>
                <div style="margin-top:30px;">
                  <a href="${loginUrl}" 
                    style="background-color:#004AAC; color:#ffffff; padding:10px 40px; border-radius:5px; text-decoration:none; font-weight:400; display:inline-block;">
                    Open App
                  </a>
                </div>
                <p style="margin-top:20px;color:#888;font-size:14px;">If the app doesn't open, <a href="${process.env.CLIENT_LOGIN_PAGE}" style="color:#004AAC;">click here to login on web</a></p>
                <p style="margin-top:40px;color:#888;font-size:14px;">&copy; ${new Date().getFullYear()} Connect2Uni. All rights reserved.</p>
              </div>
            </div>
            <script>
              // Try to open the app immediately
              setTimeout(function() {
                window.location.href = "${loginUrl}";
              }, 1000);
            </script>
          </body>
        </html>
      `);
    } else {
      // For desktop/tablet, show the normal web page
      res.status(200).send(
        generateWebPageTemplate(
          "Email Verified!",
          "Your email has been successfully verified. You can now login to your Connect2Uni account.",
          "#00AA55",
          {
            text: "Go to Login",
            link: loginUrl,
          }
        )
      );
    }
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).send(
      generateWebPageTemplate(
        "Something Went Wrong",
        "An error occurred while verifying your email. Please try again later.",
        "red"
      )
    );
  }
};

// Unsubscribe student from reminder emails
exports.unsubscribeStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).send(`
        <h2 style="font-family:sans-serif;color:#d9534f;">Student not found.</h2>
      `);
    }

    if (!student.emailSubscribed) {
      return res.send(`
        <h2 style="font-family:sans-serif;color:#28a745;">You are already unsubscribed from reminder emails.</h2>
      `);
    }

    student.emailSubscribed = false;
    await student.save();

   return res.send(`
  <h2 style="font-family:sans-serif;color:#000000;">You have successfully unsubscribed from future reminder emails.</h2>
`);


  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).send(`
      <h2 style="font-family:sans-serif;color:#d9534f;">An error occurred while unsubscribing. Please try again later.</h2>
    `);
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

exports.logout = async (req, res) => {
  try {
    // Clear the JWT token cookie
    res.clearCookie('refreshtoken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/' // Important: match the cookie path from login
    });

    return res.status(200).json({ message: 'Logout successful.' });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
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
   
      // **Enforce Email Verification ONLY for Students**
      if (role === "student" && !user.isVerified) {
        return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
      }


    // Generate JWT Token
    const token = jwt.sign({ id: user._id, role: role }, process.env.SECRET_KEY, { expiresIn: '1h' });

    // Invalidate previous session: Remove old token
    await roleCollections.find(r => r.roleName === role).model.updateOne(
      { _id: user._id },
      { $set: { currentToken: token } }
    );

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
// Student login branch inside exports.login
if (role === "student") {
  // ✅ Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // ✅ Save OTP & expiry (5 min)
  user.loginOtp = otp;
  user.loginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  user.loginOtpAttempts = 0;
  await user.save();

  // ✅ Send OTP email using your existing email template + sendEmail()
  const html = generateEmailTemplate(
    "Your Login OTP",
    "#004AAC",
    `<p style="font-size:16px;color:#333;">Hi ${user.firstName || "there"},</p>
    <p style="font-size:16px;color:#555;">Your Connect2Uni login OTP is:</p>
    <h2 style="text-align:center; font-size:28px; margin:20px 0;">${otp}</h2>
    <p style="font-size:14px;color:#888;">This OTP will expire in 5 minutes.</p>`
  );

  await sendEmail({
    to: user.email,
    subject: "Your Connect2Uni Login OTP",
    html,
  });

  return res.status(200).json({
    message: "OTP sent to your email. Please verify to complete login.",
    step: "OTP_REQUIRED",
  });
}

 // **Custom Response for Agent Role**
if (role === "agent") {
  const token = jwt.sign(
    { id: user._id, role: role, agency: user.agency,email: user.email },
    process.env.SECRET_KEY,
    { expiresIn: '1h' }
  );

  await roleCollections.find(r => r.roleName === role).model.updateOne(
    { _id: user._id },
    { $set: { currentToken: token } }
  );

  res.cookie('refreshtoken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 604800000, // 7 days
    path: '/'
  });

  res.setHeader('Authorization', `Bearer ${token}`);

  return res.status(200).json({
    message: 'Login successful.',
    role: role,
    token: token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      agencyId: user.agency || '',
      created_at: user.createdAt
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

exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const student = await Students.findOne({ email });

    if (!student || !student.loginOtp) {
      return res.status(400).json({ message: "OTP not found. Please login again." });
    }

    // Check OTP expiry
    if (student.loginOtpExpiry < new Date()) {
      student.loginOtp = null;
      student.loginOtpExpiry = null;
      await student.save();
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    // Validate OTP
    if (student.loginOtp !== otp) {
      student.loginOtpAttempts += 1;
      await student.save();

      if (student.loginOtpAttempts >= 3) {
        student.loginOtp = null;
        student.loginOtpExpiry = null;
        await student.save();
        return res.status(400).json({ message: "Too many wrong attempts. Please login again." });
      }

      return res.status(400).json({ message: "Invalid OTP. Try again." });
    }

    // ✅ OTP verified — clear OTP & reset attempts
    student.loginOtp = null;
    student.loginOtpExpiry = null;
    student.loginOtpAttempts = 0;
    await student.save();

    // ✅ Generate JWT & store token
    const token = jwt.sign(
      { id: student._id, role: "student" },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
    await Students.updateOne({ _id: student._id }, { $set: { currentToken: token } });

    res.cookie("refreshtoken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 604800000,
      path: "/",
    });

    res.setHeader("Authorization", `Bearer ${token}`);

    // ✅ Map student to user like verifyToken middleware does
    const user = {
      _id: student._id,
      email: student.email,
      isVerified: student.isVerified || false,
      isPaid: student.isPaid || false,
      createdAt: student.createdAt,
      applications: student.applications || []
    };

    return res.status(200).json({
      message: "Login successful.",
      role: "student",
      token: token,
      user: {
        id: user._id,
        email: user.email,
        is_active: true,
        email_verified: user.isVerified,
        platform_fee_paid: user.isPaid,
        created_at: user.createdAt,
      },
      platform_access: {
        courses_visible: user.isPaid,
        payment_required: !user.isPaid,
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
      applications: user.applications,
      visa_status: null,
      payment_prompt: !user.isPaid
        ? {
            type: "platform_fee",
            amount: 20,
            currency: "GBP",
            payment_url: "/api/payments/platform-fee"
          }
        : null
    });

  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Students.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // ✅ Prevent abuse: max 3 OTPs within 10 min
    if (student.loginOtpExpiry && student.loginOtpExpiry > new Date()) {
      return res.status(429).json({
        message: "OTP already sent. Wait until it expires or try again later."
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    student.loginOtp = otp;
    student.loginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    student.loginOtpAttempts = 0;
    await student.save();

    const html = generateEmailTemplate(
      "Your Login OTP",
      "#004AAC",
      `<p style="font-size:16px;color:#333;">Hi ${student.firstName || "there"},</p>
      <p style="font-size:16px;color:#555;">Your new Connect2Uni login OTP is:</p>
      <h2 style="text-align:center; font-size:28px; margin:20px 0;">${otp}</h2>
      <p style="font-size:14px;color:#888;">This OTP will expire in 5 minutes.</p>`
    );

    await sendEmail({
      to: student.email,
      subject: "Your Connect2Uni Login OTP (Resent)",
      html,
    });

    return res.status(200).json({
      message: "OTP resent successfully. Please check your email.",
      step: "OTP_REQUIRED"
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////////////////////

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
 

    // Email content
  await sendVerificationEmail(student);


    return res.status(200).json({
      message: 'A new verification link has been sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    // console.log(error)
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


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


    // Check that new password is not the same as current password
    const isSameAsCurrent = await bcrypt.compare(newPassword, student.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ message: 'New password must be different from current password.' });
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


/**
 * 1️⃣ Send OTP for account deletion
 */
exports.sendDeleteAccountOtp = async (req, res) => {
  try {
    const studentId = req.user.id; // assuming authenticated student
    const student = await Students.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    student.loginOtp = otp;
    student.loginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins validity
    await student.save();

    // Send email
    await sendAccountDeletionOtpEmail(student.email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email address.",
      expiresIn: "5 minutes",
    });
  } catch (error) {
    console.error("Error sending delete OTP:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * 2️⃣ Resend OTP (only if expired)
 */
exports.resendDeleteAccountOtp = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Students.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  


    // If existing OTP still valid, deny resend
    if (student.loginOtpExpiry && student.loginOtpExpiry > Date.now()) {
      const remainingMs = student.loginOtpExpiry - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
      });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    student.loginOtp = otp;
    student.loginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await student.save();

    await sendAccountDeletionOtpEmail(student.email, otp);

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully to your email.",
      expiresIn: "5 minutes",
    });
  } catch (error) {
    console.error("Error resending delete OTP:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * 3️⃣ Verify OTP & Soft Delete Account
 */
exports.verifyDeleteAccountOtp = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

    const student = await Students.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    if (!student.loginOtp || student.loginOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (student.loginOtpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // ✅ Hard delete
    await Students.findByIdAndDelete(studentId);

    return res.status(200).json({ success: true, message: "Your profile has been deleted successfully." });
  } catch (error) {
    console.error("Error verifying delete OTP:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// // Delete Student
// exports.deleteStudent = async (req, res) => {
//   try {
//     const id  = req.studentId;
//     const deletedStudent = await Students.findByIdAndDelete(id);

//     if (!deletedStudent) {
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     return res.status(200).json({ message: 'Student deleted successfully.' });
//   } 
//   catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


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
    }).select('-password').session(session);

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
    const universities = await University.find({isDeleted:false}).select('-password').sort({ isPromoted: -1 });
    if (universities.length === 0) {
      return res.status(404).json({ message: 'No universities found.' });
    }
    return res.status(200).json({ Total: universities.length, universities });
  } catch (error) {
    console.error('Error fetching universities:', error);
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
      expiryDate,
      level
    } = req.query;

    const filter = {
      status: 'Active',
      isDeleted: false,
    };

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

    if (country) {
      const universitiesInCountry = await University.find({
        'address.country': new RegExp(country, 'i'),
        isDeleted: false,
      }).select('_id');

      if (!universitiesInCountry.length) {
        return res.status(404).json({ message: 'No universities found in the specified country.' });
      }

      filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
    }

    if (universityName) {
      const universitiesWithName = await University.find({
        name: new RegExp(universityName, 'i'),
        isDeleted: false,
      }).select('_id');

      if (!universitiesWithName.length) {
        return res.status(404).json({ message: 'No universities found with the specified name.' });
      }

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

    if (courseName) {
      filter.name = new RegExp(courseName, 'i');
    }

    if (courseType) {
      filter.courseType = new RegExp(courseType, 'i');
    }

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

    if (expiryDate) {
      const parsedExpiryDate = new Date(expiryDate);
      if (isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format. Use YYYY-MM-DD.' });
      }
      filter.expiryDate = { $gte: parsedExpiryDate };
    }

    // Level filter
    if (level) {
      const allowedLevels = ['Undergraduate', 'Postgraduate', 'Foundation', 'ResearchDegree'];
      if (!allowedLevels.includes(level)) {
        return res.status(400).json({ message: `Invalid level. Allowed values: ${allowedLevels.join(', ')}` });
      }
      filter.level = level;
    }

    const courses = await Course.find(filter)
      .populate({
        path: 'university',
        select: 'name address.country',
      })
      .sort({ applicationDate: -1 });

    if (!courses.length) {
      return res.status(404).json({ message: 'No active courses found matching the criteria.' });
    }

    return res.status(200).json({ total: courses.length, coursesList: courses });
  } catch (error) {
    console.error('Error fetching courses with filters:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



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





