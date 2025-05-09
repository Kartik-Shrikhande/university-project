const University = require('../models/universityModel');
const Application = require('../models/applicationModel');
const Course = require('../models/coursesModel');
const jwt = require('jsonwebtoken');
const { isValidObjectId } = require('mongoose');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { uploadFilesToS3 } = require('../utils/s3Upload'); 
const Notification = require('../models/notificationModel'); // Import Notification model
const { sendRejectionEmail ,sendAcceptanceEmailWithAttachment,sendAgencyNotificationEmail} = require('../services/emailService');
const { sendNotification } = require('../services/socketNotification');
const Agency = require('../models/agencyModel');





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

//APPLICATION 


exports.getPendingApplications = async (req, res) => {
  try {
    const universityId = req.user.id; // Get university ID from authenticated user

    // Fetch pending applications with necessary details
    const university = await University.findById(universityId)
      .populate({
        path: 'pendingApplications.applicationId',
        select: 'status submissionDate course createdAt',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'course', select: 'name' }
        ]
      })
      .select('pendingApplications');

    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    // Format response with necessary fields
    const pendingApplications = university.pendingApplications.map(app => ({
      applicationId: app.applicationId._id,
      status: app.applicationId.status,
      submissionDate: app.applicationId.submissionDate,
      dateApplied: app.applicationId.createdAt,
      student: app.applicationId.student
        ? {
            studentId: app.applicationId.student._id,
            firstName: app.applicationId.student.firstName,
            lastName: app.applicationId.student.lastName,
            email: app.applicationId.student.email
          }
        : null,
      course: app.applicationId.course
        ? {
            courseId: app.applicationId.course._id,
            name: app.applicationId.course.name
          }
        : null
    }));

    res.status(200).json({
      success: true,
      total: pendingApplications.length,
      pendingApplications
    });
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


exports.getAllUniversityApplications = async (req, res) => {
  try {
    const universityId = req.user.id; // Authenticated university ID

    // Find university and fetch all its applications
    const university = await University.findById(universityId)
      .populate({
        path: 'pendingApplications.applicationId',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'course', select: 'name' }
        ],
        select: 'status submissionDate',
      })
      .populate({
        path: 'approvedApplications',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'course', select: 'name' }
        ],
        select: 'status submissionDate',
      });

    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    // Combine pending and approved applications into one list
    const allApplications = [
      ...university.pendingApplications.map(app => ({
        applicationId: app.applicationId._id,
        student: app.applicationId.student,
        course: app.applicationId.course,
        status: app.applicationId.status,
        submissionDate: app.applicationId.submissionDate,
      })),
      ...university.approvedApplications.map(app => ({
        applicationId: app._id,
        student: app.student,
        course: app.course,
        status: app.status,
        submissionDate: app.submissionDate,
      })),
    ];

    res.status(200).json({
      success: true,
      total: allApplications.length,
      applications: allApplications,
    });
  } catch (error) {
    console.error('Error fetching university applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

     if (!mongoose.Types.ObjectId.isValid(applicationId)) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid Application ID" });
          }
      

    // Find application and populate student, course, and university details
    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('course', 'name description fees')
      .populate('university', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

//NOTE IMP :- acceptance letter is stored in extraDocuments of application model (database) 
exports.acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const universityId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    const wasApplicationForThisUniversity =
      university.pendingApplications.some(app => app.applicationId.toString() === applicationId) ||
      university.approvedApplications.some(appId => appId.toString() === applicationId);

    if (!wasApplicationForThisUniversity) {
      return res.status(403).json({ success: false, message: 'This application does not belong to your university' });
    }

    const application = await Application.findById(applicationId).populate('student');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'Processing') {
      return res.status(400).json({ success: false, message: `Application is already ${application.status}` });
    }

    // Step 1: Upload file to S3
    let uploadedFileUrl = null;
    if (req.file) {
      const [url] = await uploadFilesToS3([req.file]);
      uploadedFileUrl = url;

      application.extraDocuments.push(uploadedFileUrl);
    }

    // Step 2: Update status
    application.status = 'Accepted';
    application.reviewDate = new Date();
    await application.save();

    // Step 3: Update university document
    await University.findByIdAndUpdate(universityId, {
      $pull: { pendingApplications: { applicationId } },
      $push: { approvedApplications: applicationId },
    });

    // Step 4: Send email with file link
    await sendAcceptanceEmailWithAttachment(application.student.email, uploadedFileUrl);

    // Step 5: Save in-app notification
    const notificationMessage = `Congratulations! Your application has been accepted.${uploadedFileUrl ? ` You can download your acceptance letter here: ${uploadedFileUrl}` : ''}`;
    await new Notification({
      user: application.student._id,
      message: notificationMessage,
      type: 'Application',
    }).save();

   // Step 6: Notify agency if exists
   const studentName = `${application.student.firstName} ${application.student.lastName}`;
   const studentId = application.student._id;

   if (application.agency) {
     const agency = await Agency.findById(application.agency);
     if (agency) {
       await sendAgencyNotificationEmail(agency.email, studentName, studentId, 'Accepted');

       await new Notification({
         user: agency._id,
         message: `Application for ${studentName} (ID: ${studentId}) has been accepted by the university.`,
         type: 'Application',
       }).save();
     }
   }



    res.status(200).json({
      success: true,
      message: 'Application accepted successfully',
      fileUrl: uploadedFileUrl,
    });
  } catch (error) {
    console.error('Error accepting application:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// exports.acceptApplication = async (req, res) => {
//   try {
//     const { applicationId } = req.params;
//     const universityId = req.user.id; // Get university ID from authenticated user

//     if (!mongoose.Types.ObjectId.isValid(applicationId)) {
//       return res .status(400).json({ success: false, message: "Invalid Application ID" });
//     }

//      // Find the university and check if the application exists in pendingApplications
//      const university = await University.findById(universityId);
//      if (!university) {
//        return res.status(404).json({ success: false, message: 'University not found' });
//      }
//  // Check if the application originally belonged to this university
//  const wasApplicationForThisUniversity =
//  university.pendingApplications.some(app => app.applicationId.toString() === applicationId) ||
//  university.approvedApplications.some(appId => appId.toString() === applicationId);

// if (!wasApplicationForThisUniversity) {
//  return res.status(403).json({
//    success: false,
//    message: 'This application does not belong to your university',
//  });
// }

//     // Find the application
//     const application = await Application.findById(applicationId);
//     if (!application) {
//       return res.status(404).json({ success: false, message: 'Application not found' });
//     }

//     // Check if already accepted/rejected
//     if (application.status !== 'Processing') {
//       return res.status(400).json({ success: false, message: `Application is already ${application.status}` });
//     }

//     // Update application status to 'Accepted'
//     application.status = 'Accepted';
//     application.reviewDate = new Date();
//     await application.save();

//     // Update university's pending and approved applications
//     await University.findByIdAndUpdate(universityId, {
//       $pull: { pendingApplications: { applicationId } },
//       $push: { approvedApplications: applicationId },
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Application accepted successfully',
//     });
//   } catch (error) {
//     console.error('Error accepting application:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//     });
//   }
// };


exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const universityId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    // Find the application and populate student for email
    const application = await Application.findById(applicationId).populate('student');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'Processing') {
      return res.status(400).json({ success: false, message: `Application is already ${application.status}` });
    }
    const studentName = `${application.student.firstName} ${application.student.lastName}`;
    const studentId = application.student._id;
    const studentEmail = application.student.email;
    const message = `Your application has been rejected by the university. Reason: ${reason}`;

    // ✅ Send rejection email first
    await sendRejectionEmail(studentEmail, reason);

    // ✅ Save notification
    await new Notification({
      user: studentId,
      message,
      type: 'Application',
    }).save();

    // ✅ Send real-time notification
    sendNotification(studentId.toString(), message, "Application");

    // ✅ Now safely update application status
    application.status = 'Rejected';
    application.reviewDate = new Date();
   application.isDeleted = true;
    await application.save();

    // ✅ Remove from university's pending applications
    await University.findByIdAndUpdate(universityId, {
      $pull: {
        pendingApplications: {
          applicationId: application._id,
          student: application.student._id,
        },
      },
    });

   // Step 6: Notify agency
   if (application.agency) {
    const agency = await Agency.findById(application.agency);
    if (agency) {
      await sendAgencyNotificationEmail(agency.email, studentName, studentId, 'Rejected');

      await new Notification({
        user: agency._id,
        message: `Application for ${studentName} (ID: ${studentId}) has been rejected by the university.`,
        type: 'Application',
      }).save();
    }
  }

    return res.status(200).json({
      success: true,
      message: 'Application rejected successfully',
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



// exports.rejectApplication = async (req, res) => {
//   try {
//     const { applicationId } = req.params;
//     const { reason } = req.body;
//     const universityId = req.user.id; // Get university ID from authenticated user

//     if (!mongoose.Types.ObjectId.isValid(applicationId)) {
//       return res .status(400).json({ success: false, message: "Invalid Application ID" });
//     }

//     // Find the application
//     const application = await Application.findById(applicationId);
//     if (!application) {
//       return res.status(404).json({ success: false, message: 'Application not found' });
//     }

    
//     // Check if already accepted/rejected
//     if (application.status !== 'Processing') {
//       return res.status(400).json({ success: false, message: `Application is already ${application.status}` });
//     }

//     // Update application status to 'Rejected'
//     application.status = 'Rejected';
//     application.reviewDate = new Date();
//     await application.save();


//     const studentId = application.student._id;
//     const studentEmail = application.student.email;

//     // ✅ Save Notification in MongoDB
//     await new Notification({
//       user: studentId,
//       message: `Your application has been rejected by the university. Reason: ${reason}`,
//       type: 'Application',
//     }).save();

//     // ✅ Send Rejection Email
//     await sendRejectionEmail(studentEmail, reason);
// // ✅ Send real-time notification
// sendNotification(studentId.toString(), notification.message, "Application");
//     // Remove application from university's pending applications
//     await University.findByIdAndUpdate(universityId, {
//       $pull: {
//         pendingApplications: {
//           applicationId: application._id,
//           student: application.student._id,
//         },
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Application rejected successfully',
//     });
//   } catch (error) {
//     console.error('Error rejecting application:', error);
//     res.status(500).json({success: false,message: 'Internal server error'});}
// };




//UNIVERSITY 

exports.universityLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find the university by email
    const university = await University.findOne({ email });
    if (!university) {
      return res.status(404).json({ message: 'Invalid email or password.' });
    }

    // Check if the role is `University`
    if (university.role !== 'University') {
      return res.status(403).json({ message: 'Access denied: Not a university user.' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, university.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: university._id, role: university.role },
      process.env.SECRET_KEY,
      { expiresIn: '1h' } // Token valid for 1 hour
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      university: {
        id: university._id,
        name: university.name,
        email: university.email,
        role: university.role,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update a university

exports.updateUniversity = async (req, res) => {
  try {
    const universityId = req.user.id;

    // Check if the university exists
    let university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Extract fields from request body
    const { name, description, website, phoneNumber, address, institutionType } = req.body;

    // Prevent updating email, password, and isPromoted
    if (req.body.email || req.body.password || req.body.isPromoted) {
      return res.status(400).json({
        message: 'Email, password, and isPromoted cannot be updated.',
      });
    }

    // Handle Image Upload (if provided)
   // Handle Image Upload (if provided)
   let bannerImage = null;
   if (req.file) {
     const uploadedFiles = await uploadFilesToS3([req.file]); // Upload file to S3
     bannerImage = uploadedFiles[0]; // Get the S3 URL
   }
   
    // Update university fields
    university.name = name || university.name;
    university.description = description || university.description;
    university.bannerImage = bannerImage;
    university.website = website || university.website;
    university.phoneNumber = phoneNumber || university.phoneNumber;
    university.address = address
      ? {
          country: address.country || university.address.country,
          city: address.city || university.address.city,
          state: address.state || university.address.state,
          zipCode: address.zipCode || university.address.zipCode,
        }
      : university.address;
    university.institutionType = institutionType || university.institutionType;

    // Save updated university
    await university.save();

    return res.status(200).json({
      message: 'University updated successfully.',
      university: {
        id: university._id,
        name: university.name,
        description: university.description,
        bannerImage: university.bannerImage,
        website: university.website,
        phoneNumber: university.phoneNumber,
        address: university.address,
        institutionType: university.institutionType,
        role: university.role,
        isPromoted: university.isPromoted, // No change allowed
      },
    });
  } catch (error) {
    console.error('Error updating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// exports.updateUniversity = async (req, res) => {
//   try {
//     const universityId = req.user.id; // Retrieve university ID from middleware
//     const updates = req.body;

//     // Validate updates
//     if (!updates || Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: 'No updates provided.'});
//     }

//     const updatedUniversity = await University.findByIdAndUpdate(universityId, updates, { new: true });
//     if (!updatedUniversity) {
//       return res.status(404).json({ message: 'University not found.' });
//     }

//     return res.status(200).json({ 
//       message: 'University updated successfully.', 
//       university: updatedUniversity 
//     });
//   } catch (error) {
//     console.error('Error updating university:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


exports.universityUpdatePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const  universityId  = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
    }

    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
    }

    // Fetch the student
    const getUniversity = await University.findById(universityId).session(session);
    if (!getUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, getUniversity.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }

    // Hash and update the password
    getUniversity.password = await bcrypt.hash(newPassword, 10);
    await getUniversity.save({ session });

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

// Delete a university
// Delete a university with cascading cleanup
exports.deleteUniversity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const universityId = req.universityId; // Retrieve university ID from middleware

    // Fetch the university
    const university = await University.findById(universityId).session(session);
    if (!university) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'University not found.' });
    }

    // Delete all associated courses
    await Course.deleteMany({ university: universityId }).session(session);

    // Delete the university
    await University.findByIdAndDelete(universityId).session(session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ 
      message: 'University and associated courses deleted successfully.' 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//P
 exports.seeUniversityProfile = async (req, res) => {
  try {

    const universityId = req.user.id;

    // Validate if universityId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(universityId)) {
      return res.status(400).json({ success: false, message: 'Invalid University ID' });
    }

    // Fetch university details excluding password
    const university = await University.findById(universityId).select('-password -createdAt -updatedAt -isDeleted -__v');
    // Handle case where university is not found
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    return res.status(200).json({ success: true, university });

  } catch (error) {
    console.error('Error fetching university profile:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




//COURSES

exports.createCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      name, 
      description, 
      description2, 
      description3, 
      fees, 
      ratings, 
      expiryDate, 
      courseType, 
      courseDuration 
    } = req.body;

    const universityId = req.user.id; // Get universityId from the logged-in user

    // Validate University
    const universityRecord = await University.findById(universityId).session(session);
    if (!universityRecord) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'University not found' });
    }

    // Check for duplicate course
    const existingCourse = await Course.findOne({ name, university: universityId }).session(session);
    if (existingCourse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Course with the same name already exists in this university.' });
    }

    // Validate Expiry Date
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid expiry date. It must be a future date.' });
    }

    // Upload files to AWS S3 and get URLs
    let courseImages = [];
    if (req.files && req.files.length > 0) {
      courseImages = await uploadFilesToS3(req.files);
    }

    // Create new course
    const course = new Course({
      name,
      description,
      description2, 
      description3, 
      university: universityId,
      fees,
      ratings,
      expiryDate: expiry,
      courseType,
      courseDuration,
      courseImage: courseImages,
    });

    await course.save({ session });

    // Add course to university's course list
    universityRecord.courses.push(course._id);
    await universityRecord.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Course created successfully',
      course,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const universityId = req.user.id; // Get university ID from logged-in user
    const { courseId } = req.params;
    const {
      name,
      description,
      description2,
      description3,
      fees,
      ratings,
      expiryDate,
      courseType,
      courseDuration,
    } = req.body;

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid course ID format.' });
    }

    // Find course and ensure it belongs to the university
    const course = await Course.findOne({ _id: courseId, university: universityId }).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found or unauthorized to update.' });
    }

    // Prevent updating deleted courses
    if (course.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot update a deleted course.' });
    }

    // Prevent updating expired courses
    if (course.expiryDate && new Date(course.expiryDate) < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot update an expired course.' });
    }

    // Validate Expiry Date
    if (expiryDate) {
      const newExpiryDate = new Date(expiryDate);
      if (isNaN(newExpiryDate.getTime()) || newExpiryDate <= new Date()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Expiry date must be a valid future date (YYYY-MM-DD).' });
      }
      course.expiryDate = newExpiryDate;
    }

    // Validate Fees
    if (fees !== undefined) {
      if (isNaN(fees) || fees <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Fees must be a positive number.' });
      }
      course.fees = fees;
    }

    // Validate Course Type
    const validCourseTypes = ['fulltime', 'parttime', 'online'];
    if (courseType && !validCourseTypes.includes(courseType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Invalid course type. Allowed values: ${validCourseTypes.join(', ')}` });
    }
    if (courseType) course.courseType = courseType;

    // Validate Course Duration
    if (courseDuration !== undefined) {
      if (!/^\d+$/.test(courseDuration)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Course duration must be a positive integer (in months or years).' });
      }
      course.courseDuration = courseDuration;
    }

    // Update only provided fields
    if (name) course.name = name;
    if (description) course.description = description;
    if (description2) course.description2 = description2;
    if (description3) course.description3 = description3;
    if (ratings) course.ratings = ratings;

    // Handle file uploads if any (update course images)
    if (req.files && req.files.length > 0) {
      course.courseImage = await uploadFilesToS3(req.files);
    }

    await course.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Course updated successfully.', course });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const universityId = req.user.id;
    const { courseId } = req.params;

    // Validate Course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid course ID format.' });
    }

    // Find Course
    const course = await Course.findOne({ _id: courseId, university: universityId }).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found or unauthorized to delete.' });
    }

    // Prevent deletion of already deleted courses
    if (course.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Course is already deleted.' });
    }

    // Soft Delete the Course
    course.isDeleted = true;
    await course.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Course deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};





// Get all courses for a university
exports.getAllCourses = async (req, res) => {
  try {
    const universityId = req.user.id;

    // Fetch university with its active and non-deleted courses
    const university = await University.findById(universityId)
      .populate({
        path: 'courses',
        match: { isDeleted: false },
        select: 'name fees description description2 description3 status expiryDate courseType courseDuration courseImage',
      });

    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    if (!university.courses || university.courses.length === 0) {
      return res.status(404).json({ message: 'No active courses found for this university.' });
    }

    // Add days remaining dynamically
    const courses = university.courses.map((course) => ({
      ...course.toObject(),
      daysRemaining: Math.max(0, Math.ceil((new Date(course.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))),
    }));

    return res.status(200).json({
      message: 'Courses fetched successfully.',
      total: courses.length,
      university: {
        id: university._id,
        name: university.name,
      },
      courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Get a specific course by ID for a university
exports.getCourseById = async (req, res) => {
  try {
    const universityId = req.user.id; // Retrieve university ID from middleware
    const { courseId } = req.params; // Course ID is still retrieved from the request parameters

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Fetch the university
    const university = await University.findById(universityId).populate('courses');
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the course exists in the university
    const course = university.courses.find((course) => course._id.toString() === courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found in this university.' });
    }

    // Check if the course is deleted
    if (course.isDeleted) {
      return res.status(404).json({ message: 'This course has been deleted and is no longer exist' });
    }
    return res.status(200).json({
      message: 'Course fetched successfully.',
      course,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

///active course details
exports.getAllactiveCourses = async (req, res) => {
  try {
   const universityId = req.user.id;

    // Validate university ID
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    // Fetch the university and its inactive courses
    const university = await University.findById(universityId).populate({
      path: 'courses',
      match: { isDeleted: false,status: 'Active' }, // Match only inactive courses
      select: 'name fees description status',
    });

    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if there are any inactive courses
    if (!university.courses || university.courses.length === 0) {
      return res.status(404).json({ message: 'No active courses found for this university.' });
    }

    return res.status(200).json({
      message: 'Active courses fetched successfully.',
      total: university.courses.length,
      university: {
        id: university._id,
        name: university.name,
      },
      courses: university.courses,
    });
  } catch (error) {
    console.error('Error fetching inactive courses:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

 //req.params done

///inactive course details
exports.getAllInactiveCourses = async (req, res) => {
  try {
   const universityId = req.user.id;

    // Validate university ID
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    // Fetch the university and its inactive courses
    const university = await University.findById(universityId).populate({
      path: 'courses',
      match: {isDeleted: false, status: 'Inactive' }, // Match only inactive courses
      select: 'name fees description status',
    });

    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if there are any inactive courses
    if (!university.courses || university.courses.length === 0) {
      return res.status(404).json({ message: 'No inactive courses found for this university.' });
    }

    return res.status(200).json({
      message: 'Inactive courses fetched successfully.',
      total: university.courses.length,
      university: {
        id: university._id,
        name: university.name,
      },
      courses: university.courses,
    });
  } catch (error) {
    console.error('Error fetching inactive courses:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//activate course 


exports.activateCourse = async (req, res) => {
  try {
    const universityId = req.user.id;
    const { courseId } = req.params;
    const { expiryDate } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Validate expiryDate format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!expiryDate || !dateRegex.test(expiryDate)) {
      return res.status(400).json({ message: 'Enter expiry date, Expiry date must be in the format YYYY-MM-DD.' });
    }

    // Convert expiryDate to Date object
    const newExpiryDate = new Date(expiryDate);
    const [year, month, day] = expiryDate.split('-').map(Number);

    // Check if expiryDate is a valid real date (e.g., prevents "Feb 30" or "Feb 29 in a non-leap year")
    if (newExpiryDate.getFullYear() !== year || 
        newExpiryDate.getMonth() + 1 !== month || 
        newExpiryDate.getDate() !== day) {
      return res.status(400).json({ message: 'Invalid expiry date. Ensure the date exists.' });
    }

    const now = new Date();
    // Ensure expiryDate is in the future
    if (newExpiryDate <= now) {
      return res.status(400).json({ message: 'Expiry date must be in the future.' });
    }

    // Fetch the course
    const course = await Course.findOne({ _id: courseId, university: universityId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or does not belong to the specified university.' });
    }

    // Check if the course is deleted
    if (course.isDeleted) {
      return res.status(400).json({ message: 'Cannot activate a deleted course.' });
    }

    // Check if the course is already active
    if (course.status === 'Active') {
      return res.status(400).json({ message: 'The course is already active.' });
    }

    // Activate the course and set new expiry date
    course.status = 'Active';
    course.expiryDate = newExpiryDate;
    await course.save();

    return res.status(200).json({
      message: 'Course activated successfully.',
      course,
    });
  } catch (error) {
    console.error('Error activating course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// inactivate course 

exports.inactivateCourse = async (req, res) => {
  try {
    const universityId = req.user.id;
    const { courseId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Fetch the course
    const course = await Course.findOne({ _id: courseId, university: universityId });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or does not belong to the specified university.' });
    }

    // Check if the course is deleted
    if (course.isDeleted) {
      return res.status(400).json({ message: 'Cannot inactivate a deleted course.' });
    }

    // Check if the course is already inactive
    if (course.status === 'Inactive') {
      return res.status(400).json({ message: 'The course is already inactive.' });
    }

    // Inactivate the course
    course.status = 'Inactive';
    await course.save();

    return res.status(200).json({
      message: 'Course inactivated successfully.',
      courseId: course._id,
      status: course.status,
      // expiryDate: course.expiryDate, // Keeping expiry date unchanged
    });

  } catch (error) {
    console.error('Error inactivating course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// exports.acceptApplication = async (req, res) => {

//   exports.rejectApplication = async (req, res) => {