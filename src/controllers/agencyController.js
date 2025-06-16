const Agency = require('../models/agencyModel');
const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const { uploadFilesToS3 } = require('../utils/s3Upload'); 
const Students = require('../models/studentsModel');
const University = require('../models/universityModel');
const Agent = require('../models/agentModel');
const bcrypt = require('bcrypt');
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const Course = require('../models/coursesModel');
const university = require('../models/universityModel');
const Notification = require('../models/notificationModel');
const AssociateSolicitor = require('../models/associateModel');
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
const { sendRejectionEmail,sendSolicitorRequestApprovedEmail } = require('../services/emailService');
const { sendNotification } = require('../services/socketNotification');
const { isValidObjectId } = require('mongoose');
require('dotenv').config()


//AGENT APIS

exports.createAgent = async (req, res) => {
  try {
    const {
      username,
      email,
      phoneNumber,
      address
    } = req.body;

    const agencyId = req.user.id; // Assuming agencyId is in req.user via your auth middleware

    if (!agencyId) {
      return res.status(400).json({ success: false, message: "Agency ID not provided." });
    }

    // Check if the email is already in use
    const existingAgent = await Agent.findOne({ email });

    if (existingAgent && !existingAgent.isDeleted) {
      return res.status(400).json({ success: false, message: "Email already in use." });
    }

    // Remove old deleted agent if exists
    if (existingAgent && existingAgent.isDeleted) {
      await Agent.deleteOne({ email });
    }

    // Auto-generate password
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
      exclude: `"'\\\``
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new agent
    const newAgent = new Agent({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      address,
      agency: agencyId
    });

    await newAgent.save();


    // ✅ Add agent ID to agency.agents array
    await Agency.findByIdAndUpdate(agencyId, {
      $push: { agents: newAgent._id }
    });

    // Send credentials email directly here
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Agent Account Credentials",
      text: `Your agent account has been created successfully.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately.`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      success: true,
      message: "Agent created successfully. Credentials sent via email."
    });

  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ agency: req.user.id, isDeleted: false })
      .select('-password')  // Exclude password from result
      .sort({ createdAt: -1 }); // Optional: latest first

    res.status(200).json({
      success: true,
      total:agents.length,
      message: "Agents fetched successfully.",
      data: agents
    });

  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
 
exports.getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

       if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }


    const agent = await Agent.findOne({ _id: agentId, agency: req.user.id, isDeleted: false })
      .select('-password');

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    res.status(200).json({
      success: true,
      message: "Agent fetched successfully.",
      data: agent
    });

  } catch (error) {
    console.error("Error fetching agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Validate agentId
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    // Destructure fields from body
    const { username, phoneNumber, address} = req.body;

    // Prevent updating email and password
    // if (email || password) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Email and password cannot be updated via this API."
    //   });
    // }

    // Ensure at least one updatable field is provided
    if (
      username === undefined &&
      phoneNumber === undefined &&
      address === undefined 
      //&& isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update."
      });
    }

    // Find the agent under the same agency
    const agent = await Agent.findOne({
      _id: agentId,
      agency: req.user.id,
      isDeleted: false
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    // Update permitted fields
    if (username) agent.username = username;
    if (phoneNumber) agent.phoneNumber = phoneNumber;
    if (address) agent.address = address;

    // if (isActive !== undefined) {
    //   agent.isActive = isActive;
    // }

    // Save updates
    await agent.save();

    res.status(200).json({
      success: true,
      message: "Agent updated successfully.",
      data: {
        id: agent._id,
        username: agent.username,
        phoneNumber: agent.phoneNumber,
        address: agent.address,
        // isActive: agent.isActive,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }
    });

  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

//Done
// Soft Delete agent
exports.deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }


    const agent = await Agent.findOne({ _id: agentId, agency: req.user.id, isDeleted: false });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    agent.isDeleted = true;
    await agent.save();

    
    // ✅ Remove agent ID from agency.agents array
    await Agency.findByIdAndUpdate(req.user.id, {
      $pull: { agents: agentId }
    });

    res.status(200).json({ success: true, message: "Agent deleted successfully." });

  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.hardDeleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    const agent = await Agent.findOne({ _id: agentId, agency: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    // Remove agent from Agency.agents array
    await Agency.findByIdAndUpdate(req.user.id, {
      $pull: { agents: agentId }
    });

    // Hard delete agent record
    await Agent.findByIdAndDelete(agentId);

    res.status(200).json({ success: true, message: "Agent permanently deleted." });

  } catch (error) {
    console.error("Error hard deleting agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};



//SOLICITORS REQUEST

exports.getAllSolicitorRequests = async (req, res) => {
  try {
    const agencyId = req.user.id;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const applications = await Application.find({
      _id: { $in: agency.solicitorRequests },
      agency: agencyId,
      status: 'Accepted'
    })
      .populate('student', 'firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline')
      .populate('course', 'name');

    if (!applications.length) {
      return res.status(200).json({
        success: true,
        message: "No solicitor requests found",
        total: 0,
        requests: []
      });
    }

    const results = applications.map(app => {
      const student = app.student ? {
        id: app.student._id,
        firstName: app.student.firstName,
        lastName: app.student.lastName,
        email: app.student.email,
        telephoneNumber: app.student.telephoneNumber,
        countryApplyingFrom: app.student.countryApplyingFrom,
        courseStartTimeline: app.student.courseStartTimeline
      } : null;

      return {
        applicationId: app._id,
        course: app.course ? app.course.name : null,
        student
      };
    });

    res.status(200).json({
      success: true,
      message: "Solicitor requests fetched successfully",
      total: results.length,
      requests: results
    });
  } catch (err) {
    console.error("Error fetching solicitor requests:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getSolicitorRequestByApplicationId = async (req, res) => {
  try {
    const agencyId = req.user.id;
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.solicitorRequests.includes(applicationId)) {
      return res.status(403).json({ success: false, message: "This solicitor service request is not associated with your agency" });
    }

    const application = await Application.findOne({
      _id: applicationId,
      agency: agencyId,
      status: 'Accepted'
    })
    .populate('student', 'firstName lastName email telephoneNumber presentAddress countryApplyingFrom mostRecentEducation yearOfGraduation')
    .populate('university')
    .populate('course');

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request details",
      application
    });
  } catch (err) {
    console.error("Error getting solicitor request details:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.assignSolicitorRequestToAssociate = async (req, res) => {
  try {
    const agencyId = req.user.id; // From agencyAuth middleware
    const { associateId, applicationId } = req.body;

    // Validate input
    if (!associateId || !applicationId) {
      return res.status(400).json({ success: false, message: "associateId and applicationId are required" });
    }

     // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(associateId)) {
      return res.status(400).json({ success: false, message: "Invalid associateId ID" });
    }
      // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }


    // Verify application exists
    const application = await Application.findById(applicationId).populate('student');
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Verify agency owns this solicitor request
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.solicitorRequests.includes(applicationId)) {
      return res.status(403).json({ success: false, message: "This solicitor request is not associated with your agency" });
    }

    // Find associate and validate
    const associate = await AssociateSolicitor.findById(associateId);
    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    // Prevent duplicate assignments
    if (associate.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(400).json({ success: false, message: "This application is already assigned to this associate" });
    }

    // Check if this application was already assigned to any associate
    const alreadyAssignedToAnyAssociate = await AssociateSolicitor.findOne({
      assignedSolicitorRequests: applicationId
    });

    // Assign application to associate
    associate.assignedSolicitorRequests.push(applicationId);
    await associate.save();

    // // ✅ Remove application from agency's pending solicitor requests list
    await Agency.findByIdAndUpdate(
      agencyId,
      { $pull: { solicitorRequests: applicationId } }
    );

    // ✅ Only send notification/email if this is the first assignment
    if (!alreadyAssignedToAnyAssociate) {
      await Notification.create({
        user: application.student._id,
        message: `🎉 Congratulations! Your solicitor request has been approved. An associate will be assigned to you shortly.`,
        type: 'General',
      });

      await sendSolicitorRequestApprovedEmail(application.student);
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request successfully assigned to associate",
      data: associate
    });

  } catch (error) {
    console.error("Error assigning solicitor request to associate:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getAssignedSolicitorRequests = async (req, res) => {
  try {
    const agencyId = req.user.id;

    // Fetch associates who have assigned solicitor requests (by application IDs)
    const associates = await AssociateSolicitor.find({
      assignedSolicitorRequests: { $exists: true, $not: { $size: 0 } }
    }).populate({
      path: 'assignedSolicitorRequests',
      populate: {
        path: 'student',
        select: 'firstName lastName email'
      }
    });

    // Map the response
    const result = associates.map(associate => {
      const assignedApplications = associate.assignedSolicitorRequests.map(application => ({
        applicationId: application._id,
        studentId: application.student._id,
        studentName: `${application.student.firstName} ${application.student.lastName}`,
        studentEmail: application.student.email
      }));

      return {
        associateId: associate._id,
        associateName: associate.nameOfAssociate,
        associateEmail: associate.email,
        numberOfAssignedRequests: assignedApplications.length,  // 👈 count per associate
        applications: assignedApplications
      };
    });

    // Grand total of all assigned applications
    const grandTotal = result.reduce((acc, associate) => acc + associate.numberOfAssignedRequests, 0);

    res.status(200).json({
      success: true,
      totalAssignedRequests: grandTotal,
      message: "Assigned solicitor requests fetched successfully",
      data: result
    });
  } catch (error) {
    console.error("Error fetching assigned solicitor requests:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getAssignedSolicitorRequestByAssociateId = async (req, res) => {
  try {
    const associateId = req.params.id;

    
     // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(associateId)) {
      return res.status(400).json({ success: false, message: "Invalid associateId ID" });
    }

    // Check if associate exists
    const associate = await AssociateSolicitor.findById(associateId)
      .populate({
        path: 'assignedSolicitorRequests',
        select: '_id',
        populate: {
          path: 'student',
          select: 'firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline'
        }
      })
      .select('nameOfAssociate email'); // Include associate info

    if (!associate) {
      return res.status(404).json({ success: false, message: 'Associate not found' });
    }

    // Check if no assigned solicitor requests
    if (!associate.assignedSolicitorRequests || associate.assignedSolicitorRequests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No solicitor requests assigned to this associate yet.',
        associateId: associate._id,
        associateName: associate.nameOfAssociate,
        associateEmail: associate.email,
        applications: []
      });
    }

    // Format response data
    const applications = associate.assignedSolicitorRequests.map(app => ({
      applicationId: app._id,
      studentId: app.student._id,
      studentName: `${app.student.firstName} ${app.student.lastName}`,
      studentEmail: app.student.email,
      telephoneNumber: app.student.telephoneNumber,
      countryApplyingFrom: app.student.countryApplyingFrom,
      courseStartTimeline: app.student.courseStartTimeline
    }));

    res.status(200).json({
      success: true,
      message: 'Assigned solicitor request fetched successfully',
      totalAssignedRequests: applications.length,
      associateId: associate._id,
      associateName: associate.nameOfAssociate,
      associateEmail: associate.email,
      applications
    });
  } catch (err) {
    console.error('Error fetching assigned solicitor request by ID:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


exports.getAllStudentsAppliedForSolicitorService = async (req, res) => {
  try {
    const agencyId = req.user.id;

    const students = await Students.find({
      solicitorService: true
    }).select('_id firstName lastName email');

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: "No students have applied for solicitor services"
      });
    }

    res.status(200).json({
      success: true,
      total:students.length,
      message: "Students who applied for solicitor services fetched successfully",
      students
    });
  } catch (error) {
    console.error("Error fetching solicitor applicants:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




//NOTIFICATION

exports.getAllNotifications = async (req, res) => {
  try {
    const Id = req.user.id;

    const notifications = await Notification.find({ user: Id })
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

exports.deleteNotificationByIdAgency = async (req, res) => {
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



//STUDENT

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Students.find()
      .select('firstName middleName lastName email countryCode telephoneNumber address documentType countryApplyingFrom preferredUniversity courseStartTimeline mostRecentEducation') // Select fields to be shown
      .populate('agency', 'name') // Assuming you want to populate agency name
      .populate('assignedAgent', 'name'); // Assuming you want to populate assigned agent name

    return res.status(200).json({
      totalStudents: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Students.findById(id)
      .select('firstName middleName lastName email countryCode telephoneNumber address documentType documentUpload mostRecentEducation collegeUniversity programType discipline countryName preferredUniversity courseStartTimeline englishLanguageRequirement score') // Selected fields
      .populate('agency', 'name contactEmail') // Populate agency name and email
      .populate('assignedAgent', 'name') // Populate assigned agent name
      .populate('applications.applicationId'); // Populate application details

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



//COURSES 

// Get all courses for a specific university
exports.getAllUniversityCoursesforAgency = async (req, res) => {
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
    return res.status(200).json({university_name:finduniversity.name,total: courses.length,coursesList: courses});
  } 
  catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all courses 
 exports.getallCoursesWithFiltersforAgency = async (req, res) => {
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
      //  status: 'Active', // Show only active courses
      //  isDeleted: false, // Exclude soft-deleted courses
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

// Get course by id
exports.getCourseByIdforAgency = async (req, res) => {
  try {
    const { courseId } = req.params;
 
    if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
    // Fetch the course and its associated university
    const course = await Course.findOne({ _id: courseId }).populate('university', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }


    return res.status(200).json({ Course_Details:course });
  } 
  catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};








//AGENCY PROFILE APIs
exports.createAgency = async (req, res) => {
  try {
    const { name, email, password, contactPhone, address } = req.body;

    // Check for duplicate email
    const existingAgency = await Agency.findOne({ email });
    if (existingAgency) {
      return res.status(400).json({ error: 'Agency with this email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new agency
    const newAgency = new Agency({
      name,
      email,
      password: hashedPassword,
      contactPhone,
      address,
    });

    const savedAgency = await newAgency.save();
    return res.status(201).json({ message: 'Agency created successfully.', data: savedAgency });
  } catch (error) {
    console.error('Error creating agency:', error);
    return res.status(500).json({ error: 'Error creating agency.' });
  }
};


exports.loginAgency = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find agency by email
    const agency = await Agency.findOne({ email });
    if (!agency) {
      return res.status(404).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, agency.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    return res.status(200).json({ message: 'Login successful.', agencyId: agency._id });
  } 
  catch (error) {
    console.error('Error logging in agency:', error);
    return res.status(500).json({ error: 'Error logging in agency.' });
  }
};


exports.getAgencyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Fetch the agency details
    const agency = await Agency.findById(id).populate('agents', 'name email');

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({
      message: 'Agency fetched successfully.',
      data: agency,
    });
  } catch (error) {
    console.error('Error fetching agency by ID:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};


// Update Agency by ID
exports.updateAgencyById = async (req, res) => {
  try {
    const { name, email, contactPhone, address } = req.body;

    // Update agency by ID
    const updatedAgency = await Agency.findByIdAndUpdate(
      req.params.id,
      { name, email, contactPhone, address },
      { new: true }
    );

    if (!updatedAgency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({ message: 'Agency updated successfully.', data: updatedAgency });
  } catch (error) {
    console.error('Error updating agency:', error);
    return res.status(500).json({ error: 'Error updating agency.' });
  }
};

exports.deleteAgencyById = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Find the agency
    const agency = await Agency.findById(id).session(session);
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    // Handle associated agents (if any)
    if (agency.agents && agency.agents.length > 0) {
      await Agent.updateMany(
        { _id: { $in: agency.agents } },
        { $unset: { agency: "" } }, // Unlink agents from this agency
        { session }
      );
    }

    // Delete the agency
    await Agency.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Agency deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting agency:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.agencyUpdatePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agencyId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
    }

    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
    }

    // Fetch the agency by ID
    const agency = await Agency.findById(agencyId).session(session);
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, agency.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }

    // Hash and update the password
    agency.password = await bcrypt.hash(newPassword, 10);
    await agency.save({ session });

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

 
//Application 
//see pending applications //get
exports.getPendingApplications = async (req, res) => {
  try {
    const defaultAgencyId =process.env.DEFAULT_AGENCY_ID
    // Validate DEFAULT_AGENCY_ID
    if (!mongoose.Types.ObjectId.isValid(defaultAgencyId)) {
      console.error('Invalid agency ID in environment variable:', defaultAgencyId);
      return res.status(400).json({ message: 'Invalid agency ID in environment variable.' });
    }

  
    // Fetch the default agency
    const agency = await Agency.findById(new mongoose.Types.ObjectId(defaultAgencyId));
    if (!agency) {
      console.error('Agency not found in database:', defaultAgencyId);
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Check if there are any pending applications
    if (!agency.pendingApplications || agency.pendingApplications.length === 0) {
      return res.status(404).json({ message: 'No pending applications found in agency.' });
    }

    // Populate pending applications
    await agency.populate({
      path: 'pendingApplications',
      select: 'student university course status submissionDate',
      populate: [
        { path: 'student', select: 'firstName lastName email' },
        { path: 'university', select: 'name country' },
        { path: 'course', select: 'name fees' },
      ],
    });

    const pendingApplications = agency.pendingApplications.map((app) => ({
      applicationId: app._id,
      student: app.student
        ? { name: `${app.student.firstName} ${app.student.lastName}`, email: app.student.email }
        : 'Unknown',
      university: app.university ? app.university.name : 'Unknown',
      course: app.course ? app.course.name : 'Unknown',
      status: app.status,
      submissionDate: app.submissionDate,
    }));

    return res.status(200).json({
      message: 'Successfully fetched pending applications.',
      total: pendingApplications.length,
      agency: {
        id: agency._id,
        name: agency.name,
      },
      pendingApplications,
    });
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getApplicationDetailsById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Validate `applicationId`
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pending or sent applications
    const isPending = defaultAgency.pendingApplications.includes(applicationId);
    const isSent = defaultAgency.sentAppliactionsToUniversities.includes(applicationId);

    if (!isPending && !isSent) {
      return res.status(404).json({
        message: 'Application not found in agency\'s records.',
      });
    }

    // Fetch the application with populated fields
    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Prepare the response
    const response = {
      applicationId: application._id,
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      documents: application.documents || [],
      financialAid: application.financialAid,
      student: application.student,
        
        // {
        //     name: `${application.student.firstName} ${application.student.lastName}`,
        //     email: application.student.email,
        //   }
        // : 'Unknown',
      university: application.university
        ? {
            name: application.university.name,
            country: application.university.country,
          }
        : 'Unknown',
      course: application.course
        ? {
            name: application.course.name,
            fees: application.course.fees,
          }
        : 'Unknown',
      assignedAgent: application.assignedAgent
        ? { name: application.assignedAgent.name, email: application.assignedAgent.email }
        : 'Not assigned',
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


exports.getApplicationByIdForAgency = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID.' });
    }

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const response = {
      applicationId: application._id,
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      financialAid: application.financialAid,
      reason: application.reason || '',
      grades: application.grades || '',
      marks: application.marks || '',
      extraDocuments: application.extraDocuments || [],
      universityDocuments: application.universityDocuments || [],
      latestdegreeCertificates: application.latestdegreeCertificates || [],
      englishTest: application.englishTest || [],
      proofOfAddress: application.proofOfAddress || [],
      student: application.student || 'Not found',
      university: application.university || 'Not found',
      course: application.course || 'Not found',
      assignedAgent: application.assignedAgent || 'Not assigned',
    };

    return res.status(200).json({
      message: 'Application details retrieved successfully.',
      application: response,
    });
  } catch (error) {
    console.error('Error retrieving application:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get Applications by Status for an Agency
exports.getApplicationsByStatus = async (req, res) => {
  try {
    const agencyId = req.user.id; // assuming JWT middleware assigns this
    const { status } = req.query;

    // Validate status input
    const validStatuses = ['Processing', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status query parameter.' });
    }

    // Check if agency exists
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    // Fetch applications by status for this agency
    const applications = await Application.find({
      agency: agencyId,
      status: status,
      isDeleted: false
    })
    .populate('student', 'firstName lastName email') // populate student details
    .populate('university', 'name') // populate university name
    .populate('course', 'name') // populate course name
    .populate('assignedAgent', 'name email') // assigned agent details
    .populate('assignedSolicitor', 'name email'); // assigned solicitor details

    res.status(200).json({
      message: `Applications with status '${status}' fetched successfully.`,
      count: applications.length,
      applications
    });
    
  } catch (error) {
    console.error('Error fetching applications by status:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


//agent will move forward the application to university
exports.assignAgentToApplication = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { applicationId, agentId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid ApplicationId ID provided.' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid AgentId provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pendingApplications
    const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
    if (!isPendingInAgency) {
      return res.status(404).json({
        message: 'Application not found in the agency\'s pending applications.',
      });
    }

    // Fetch the application
    const application = await Application.findById(applicationId).session(session);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Fetch the agent
    const agent = await Agent.findById(agentId).session(session);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Check if the agent belongs to the default agency
    if (agent.agency.toString() !== defaultAgency._id.toString()) {
      return res.status(400).json({ message: 'Agent does not belong to the default agency.' });
    }

    // Assign the agent to the application
    application.assignedAgent.push(agent._id);
    await application.save({ session });

    // Add the application to the agent's assigned students
    agent.assignedStudents.push(application.student);
    await agent.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Agent successfully assigned to the application.',
      application: {
        id: application._id,
        assignedAgent: application.assignedAgent,
        status: application.status,
        university: application.university,
        course: application.course,
      },
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();
    console.error('Error assigning agent to application:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.sendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId } = req.params;

      // Validate IDs
       if (!mongoose.Types.ObjectId.isValid(applicationId)) {
         return res.status(400).json({ message: 'Invalid application ID provided.' });
       }
    

    // Get default agency ID from .env
    const defaultAgencyId = process.env.DEFAULT_AGENCY_ID;

    if (!defaultAgencyId) {
      return res.status(500).json({ message: 'Default agency ID is not set in environment variables' });
    }

    // Check if the application exists
    const application = await Application.findById(applicationId)
      .populate('student')
      .exec();

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Get the universityId from application
    const universityId = application.university;
    if (!universityId) {
      return res.status(404).json({ message: 'University ID not found in application' });
    }

    // Check if the agency exists using defaultAgencyId
    const agency = await Agency.findById(defaultAgencyId);
    if (!agency) {
      return res.status(404).json({ message: 'Default agency not found' });
    }

    // Check if the university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Check if application exists in agency.pendingApplications
    const pendingIndex = agency.pendingApplications.indexOf(applicationId);
    if (pendingIndex === -1) {
      return res.status(400).json({ message: 'Application is not in pendingApplications of the agency' });
    }

    // Remove application from pendingApplications
    agency.pendingApplications.splice(pendingIndex, 1);

    // Add application to sentApplicationsToUniversities
    agency.sentAppliactionsToUniversities.push(applicationId);

    // Add application to university.pendingApplications
    university.pendingApplications.push({
      student: application.student._id,
      applicationId: applicationId,
    });

    // Save updated agency and university
    await agency.save();
    await university.save();

    return res.status(200).json({
      message: 'Application sent to university successfully',
      applicationId: applicationId,
      universityId: universityId,
      updatedAgency: {
        pendingApplications: agency.pendingApplications,
        sentApplicationsToUniversities: agency.sentAppliactionsToUniversities,
      },
      updatedUniversity: {
        pendingApplications: university.pendingApplications,
      },
    });
  } catch (error) {
    console.error('Error sending application to university:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const agencyId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    const application = await Application.findById(applicationId).populate({ path: 'student' }).exec();
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

 // ✅ Check if application is already rejected
 if (application.status === 'Rejected') {
  return res.status(400).json({ success: false, message: 'Application has already been rejected.' });
 }
 
    application.status = 'Rejected';
    application.reason = reason;
    await application.save();

    await Agency.findByIdAndUpdate(agencyId, {
      $pull: { pendingApplications: applicationId },
    });

    const studentId = application.student._id;
    const studentEmail = application.student.email;

 // ✅ Save Notification in MongoDB
 const notification = await new Notification({
  user: studentId,
  message: `Your application has been rejected. Reason: ${reason}`,
  type: "Application",
}).save();
    // ✅ Send Rejection Email
    await sendRejectionEmail(studentEmail, reason);
    
// ✅ Send real-time notification
 sendNotification(studentId.toString(), notification.message, "Application");

    res.status(200).json({ success: true, message: 'Application rejected, student notified via email & notification.' });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


//university 

exports.promoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

    // Find the university by ID
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'YES') {
      return res.status(400).json({
        message: `University "${university.name}" is already promoted.`,
      });
    }

    // Update the `isPromoted` field
    university.isPromoted = 'YES';
    await university.save();

    return res.status(200).json({
      message: `University "${university.name}" has been promoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.demoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

    // Find the university by ID
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'NO') {
      return res.status(400).json({
        message: `University "${university.name}" is already demoted.`,
      });
    }

    // Update the `isPromoted` field
    university.isPromoted = 'NO';
    await university.save();

    return res.status(200).json({
      message: `University "${university.name}" has been demoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.createUniversity = async (req, res) => {
  try {
    const {
      name,
      email,
      description,
      website,
      phoneNumber,
      address,
      ratings,
    } = req.body;

    // Check if the email is already in use
    const existingUniversity = await University.findOne({ email });
    if (existingUniversity) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Auto-generate a password
    const password = generator.generate({
      length: 10, // Password length
      numbers: true, // Include numbers
      symbols: true, // Include symbols
      uppercase: true, // Include uppercase letters
      excludeSimilarCharacters: true, // Exclude similar characters like 'i' and 'l'
      exclude: `"'\\\``  // excludes ", ', \, and `
    });

    // Hash the auto-generated password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle Image Upload (if provided)
    let bannerImage = null;
    if (req.file) {
      const uploadedFiles = await uploadFilesToS3([req.file]); // Upload file to S3
      bannerImage = uploadedFiles[0]; // Get the S3 URL
    }

    // Create a new university instance
    const newUniversity = new University({
      name,
      email,
      password: hashedPassword,  //hashedPassword,
      description,
      bannerImage, // Save the uploaded image URL
      website,
      phoneNumber,
      address: {
        country: address.country,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      },
      isPromoted: req.body.isPromoted || 'NO', // Default to 'NO' if not provided
      ratings: ratings || [], // Default to an empty array if not provided
    });

    // Save the new university to the database
    await newUniversity.save();

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
subject: 'Credentials for University Account',
text: `Your account has been created.\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.`,
};

await transporter.sendMail(mailOptions);



    // Return the response with the auto-generated password (for testing purposes)
    return res.status(201).json({
      message: 'University created successfully.',
      university: {
        id: newUniversity._id,
        name: newUniversity.name,
        email: newUniversity.email,
        website: newUniversity.website,
        phoneNumber: newUniversity.phoneNumber,
        address: newUniversity.address,
        role: newUniversity.role,
        isPromoted: newUniversity.isPromoted,
        ratings: newUniversity.ratings,
        bannerImage: newUniversity.bannerImage,
      },
      autoGeneratedPassword: hashedPassword, // Return the auto-generated password (optional)
    });
  } catch (error) {
    console.error('Error creating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update any university (by agency)
exports.updateUniversityByAgency = async (req, res) => {
  try {
    const { universityId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID provided.' });
    }
    // Check if the university exists
    let university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Prevent updating email & password
    if (req.body.email || req.body.password) {
      return res.status(400).json({
        message: 'Email and password cannot be updated.',
      });
    }

    // Handle Image Upload
    let bannerImage = null;
    if (req.file) {
      const uploadedFiles = await uploadFilesToS3([req.file]);
      bannerImage = uploadedFiles[0];
    }

    // Update fields
    const { name, description, website, phoneNumber, address, isPromoted } = req.body;

    university.name = name || university.name;
    university.description = description || university.description;
    university.bannerImage = bannerImage || university.bannerImage;
    university.website = website || university.website;
    university.phoneNumber = phoneNumber || university.phoneNumber;
    university.isPromoted = isPromoted || university.isPromoted;

    university.address = address
      ? {
          country: address.country || university.address.country,
          city: address.city || university.address.city,
          state: address.state || university.address.state,
          zipCode: address.zipCode || university.address.zipCode,
        }
      : university.address;

    await university.save();

    return res.status(200).json({
      message: 'University updated successfully.',
      university,
    });
  } catch (error) {
    console.error('Error updating university by agency:', error);
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
  const universities = await University.find({ isDeleted: false }).sort({ isPromoted: -1 });
    if (universities.length === 0) {
      return res.status(404).json({ message: 'No universities found.' });
    }
    return res.status(200).json({ Total: universities.length, universities });
  } catch (error) {
    console.error('Error fetching universities:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get University by ID (For Agency/Admin)
exports.getUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find university by ID
    const university = await University.findById(id);
    
    // Check if university exists
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ university });
  } catch (error) {
    console.error('Error fetching university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Soft delete a university (by agency)
exports.deleteUniversityByAgency = async (req, res) => {
  try {
    const { universityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID provided.' });
    }

    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    if (university.isDeleted) {
      return res.status(400).json({ message: 'University is already deleted.' });
    }

    university.isDeleted = true;
    await university.save();

    return res.status(200).json({ message: 'University deleted successfully.' });
  } catch (error) {
    console.error('Error deleting university by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// ASSOCIATES 

// **CREATE Associate Solicitor**
//ASSOCIATE

exports.createAssociate = async (req, res) => {
  try {
    const {
      nameOfAssociate,
      email,
      phoneNumber,
      address,
      bankDetails,
    } = req.body;

    // Check if the email is already in use
    const existingAssociate = await AssociateSolicitor.findOne({ email });


    if (existingAssociate && !existingAssociate.isDeleted) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    // If the associate exists but isDeleted: true, remove the old record
    if (existingAssociate && existingAssociate.isDeleted) {
      await AssociateSolicitor.deleteOne({ email });
    }



    // **Auto-generate a password**
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
      exclude: `"'\\\``  // excludes ", ', \, and `
    });

    // **Hash the generated password**
    const hashedPassword = await bcrypt.hash(password, 10);

    // **Encrypt the bank account number**
    bankDetails.accountNumber = encryptData(bankDetails.accountNumber);

    // Create a new Associate Solicitor
    const newAssociate = new AssociateSolicitor({
      nameOfAssociate,
      email,
      password: hashedPassword, // Store hashed password
      phoneNumber,
      address,
      bankDetails,
    });

    // Save the associate to the database
    await newAssociate.save();

    // **Send credentials via email**
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Associate Solicitor Account Credentials",
      text: `Your account has been successfully created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately.`,
    };

    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(201).json({
      success: true,
      message:
        "Associate Solicitor created successfully. Check your email for credentials.",
      // data: {
      //   id: newAssociate._id,
      //   nameOfAssociate: newAssociate.nameOfAssociate,
      //   email: newAssociate.email,
      //   phoneNumber: newAssociate.phoneNumber,
      //   address: newAssociate.address,
      //   bankDetails: {
      //     bankName: bankDetails.bankName,
      //     accountHolderName: bankDetails.accountHolderName,
      //   }, // Exclude sensitive info
      // },
    });
  } catch (error) {
    console.error("Error creating associate:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// **GET ALL Associates (with optional soft-delete filter)**
exports.getAllAssociates = async (req, res) => {
  try {

    const associates = await AssociateSolicitor.find({ isDeleted: false }).select('_id email nameOfAssociate phoneNumber studentAssigned ');

    if (associates.length === 0) {
      return res.status(404).json({ success: false, message: "No associates found" });
    }

     return  res.status(200).json({ success: true,total:associates.length, data: associates });
  } 
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// **GET Associate By ID**
exports.getAssociateById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Associate ID" });
    }

    // Find associate by ID and check for isDeleted status
    const associate = await AssociateSolicitor.findOne({
      _id: id,
      isDeleted: false,
    });

    // Check if associate exists and is not deleted
    if (!associate) {
      return res
        .status(404)
        .json({ success: false, message: "Associate not found or has been deleted" });
    }

    // Decrypt bank details before sending the response
    if (associate.bankDetails && associate.bankDetails.accountNumber) {
      associate.bankDetails.accountNumber = decryptData(
        associate.bankDetails.accountNumber
      );
    }

    // Return associate data
    res.status(200).json({ success: true, data: associate });
  } catch (error) {
    console.error("Error fetching associate:", error);
    res.status(500).json({ success: false, message: "Error fetching associate" });
  }
};



// **UPDATE Associate**
exports.updateAssociate = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Check if the Associate exists and is not soft deleted
    const existingAssociate = await AssociateSolicitor.findById(id);
    if (!existingAssociate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    if (existingAssociate.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot update a deleted Associate Solicitor" });
    }

    // Prevent email and password updates
    if (updates.email || updates.password) {
      return res.status(400).json({ success: false, message: "Email and password cannot be updated" });
    }

    // Encrypt account number if provided
    if (updates.bankDetails?.accountNumber) {
      updates.bankDetails.accountNumber = encryptData(updates.bankDetails.accountNumber);
    }

    // Merge updates while preserving existing nested objects
    const updatedData = {
      ...existingAssociate.toObject(),
      ...updates,
      bankDetails: {
        ...existingAssociate.bankDetails,
        ...updates.bankDetails,
      },
      address: {
        ...existingAssociate.address,
        ...updates.address,
      },
    };

    // Update Associate
    const updatedAssociate = await AssociateSolicitor.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({
      success: true,
      message: "Associate Solicitor updated successfully",
      data: updatedAssociate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// **SOFT DELETE Associate**
exports.deleteAssociate = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Find the associate
    const associate = await AssociateSolicitor.findById(id);

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    // Check if the associate is already deleted
    if (associate.isDeleted) {
      return res.status(400).json({ success: false, message: "Associate Solicitor is already deleted" });
    }

    // Soft delete the associate
    associate.isDeleted = true;
    await associate.save();

    res.status(200).json({ success: true, message: "Associate Solicitor deleted successfully", data: associate.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

