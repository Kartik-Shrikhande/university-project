const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const Students = require('../models/studentsModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');
const Course = require('../models/coursesModel');
require('dotenv').config()


exports.applyForCourse = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { courseId } = req.params;
      const { documents } = req.files || {}; // Assuming file upload middleware is used
      const studentId = req.user.id; // Retrieved from authentication middleware
  
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(courseId)) return res.status(400).json({ message: 'Invalid CourseId.' });
      


    // Fetch the course details (including university)
    const course = await Course.findById(courseId).select('university status');
    if (!course) {
        return res.status(404).json({ message: 'Course not found.' });
    }

    // Ensure the course is active before proceeding
    if (course.status !== 'Active') {
        return res.status(400).json({ message: 'This course is currently inactive and cannot be applied for.' });
    }

    const universityId = course.university; // ✅ Auto-fetch university ID from course



      // Fetch the student
      const student = await Students.findById(studentId).session(session).select(
        'firstName middleName lastName dateOfBirth gender email telephoneNumber presentAddress permanentAddress documentType ' +
        'documentUpload mostRecentEducation otherEducationName yearOfGraduation collegeUniversity'
      );
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
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
          // programType: student.programType,
          // otherProgramName: student.otherProgramName,
          // discipline: student.discipline,
          // otherDisciplineName: student.otherDisciplineName,
          // countryApplyingFrom: student.countryApplyingFrom,
          // referralSource: student.referralSource,
          assignedAgent: student.assignedAgent,
          // preferredCommunicationMethod: student.preferredCommunicationMethod,
          // isPaid: student.isPaid,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error applying for university:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
  
//-----------------------------------------------------------------------------------------------------------
  //previouse
  // exports.getStudentApplications = async (req, res) => {
  //   try {
  //     const studentId = req.user.id; // Retrieved from authentication middleware
  
  //     // Validate `studentId`
  //     if (!mongoose.Types.ObjectId.isValid(studentId)) {
  //       return res.status(400).json({ message: 'Invalid student ID provided.' });
  //     }
  
  
  //     // Fetch the student and their applications
  //     const student = await Students.findById(studentId)
  //       .populate({
  //         path: 'applications.applicationId',
  //         populate: [
  //           { path: 'university', select: 'name country' },
  //           { path: 'course', select: 'name fees' },
  //           { path: 'agency', select: 'name contactEmail' },
  //           { path: 'assignedAgent', select: 'name email' },
  //         ],
  //       })
  //       .select('applications firstName lastName email');
  
  //     if (!student) {
  //       return res.status(404).json({ message: 'Student not found.' });
  //     }
  
  //     // Check if the student has any applications
  //     if (!student.applications || student.applications.length === 0) {
  //       return res.status(404).json({ message: 'No applications found for this student.' });
  //     }
  
  //     // Prepare the response data
  //     const applications = student.applications
  //       .filter((app) => app.applicationId) // Ensure applicationId exists before accessing its fields
  //       .map((app) => ({
  //         applicationId: app.applicationId._id,
  //         university: app.applicationId.university ? app.applicationId.university.name : 'Unknown',
  //         country : app.applicationId.university.country,
  //         course: app.applicationId.course ? app.applicationId.course.name : 'Unknown',
  //         status: app.applicationId.status,
  //         submissionDate: app.applicationId.submissionDate ? app.applicationId.submissionDate.toLocaleDateString() : null,
  //         submissionTime: app.applicationId.submissionDate ? app.applicationId.submissionDate.toISOString().slice(11, 19) : null, 
  //         // reviewDate: app.applicationId.reviewDate || 'Not reviewed yet',
  //         notes: app.applicationId.notes || 'No notes provided',
  //         // // documents: app.applicationId.documents || [],
  //         // financialAid: app.applicationId.financialAid || 'Not specified',
  //         // agency: app.applicationId.agency ? app.applicationId.agency.name : 'Default Agency',
  //         // assignedAgent: app.applicationId.assignedAgent
  //         //   ? { name: app.applicationId.assignedAgent.name, email: app.applicationId.assignedAgent.email }
  //         //   : 'Not assigned',
  //       }));
  
  //     // If no valid applications are available
  //     if (applications.length === 0) {
  //       return res.status(404).json({ message: 'No valid application data found.' });
  //     }
  
  //     return res.status(200).json({
  //       total:applications.length,
  //       message: 'Successfully fetched student applications.',
  //       student: {
  //         id: student._id,
  //         name: `${student.firstName} ${student.lastName}`,
  //         email: student.email,
  //       },
  //       applications,
  //     });
  //   } catch (error) {
  //     console.error('Error fetching student applications:', error);
  //     return res.status(500).json({ message: 'Internal server error.' });
  //   }
  // };
  
  

exports.getStudentApplications = async (req, res) => {
  try {
    const studentId = req.user.id; // Retrieved from authentication middleware

    // Validate `studentId`
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID provided.' });
    }

    // Fetch the student with their applications
    const student = await Students.findById(studentId).select('applications firstName lastName email');

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if the student has applications
    if (!student.applications || student.applications.length === 0) {
      return res.status(404).json({ message: 'No applications found for this student.' });
    }

    // Get application IDs from student
    const applicationIds = student.applications.map(app => app.applicationId);

    // Fetch applications from the `Application` model
    const applications = await Application.find({ _id: { $in: applicationIds }, isDeleted: false })
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('agency', 'name email')
      .populate('assignedAgent', 'name email');

    if (!applications || applications.length === 0) {
      return res.status(404).json({ message: 'No valid applications found in the system.' });
    }

    // Prepare response data
    const formattedApplications = applications.map(app => ({
      applicationId: app._id,
      university: app.university ? app.university.name : 'Unknown',
      country: app.university ? app.university.country : 'Unknown',
      course: app.course ? app.course.name : 'Unknown',
      status: app.status,
      submissionDate: app.submissionDate ? app.submissionDate.toLocaleDateString() : null,
      submissionTime: app.submissionDate ? app.submissionDate.toISOString().slice(11, 19) : null,
      notes: app.notes || 'No notes provided',
    }));

    return res.status(200).json({
      total: formattedApplications.length,
      message: 'Successfully fetched student applications.',
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
      },
      applications: formattedApplications,
    });

  } catch (error) {
    console.error('Error fetching student applications:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//-----------------------------------------------------------------------------------------------------------


exports.getApplicationById = async (req, res) => {
  try {
    const studentId = req.user.id; // Retrieved from authentication middleware
    const { applicationId } = req.params;

    // Validate `studentId` and `applicationId`
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid student ID or application ID provided.' });
    }

    // Check if student exists
    const student = await Students.findById(studentId).select('applications');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Ensure the application belongs to the student
    const isStudentApplication = student.applications.some(app => app.applicationId.toString() === applicationId);
    if (!isStudentApplication) {
      return res.status(403).json({ message: 'Unauthorized to access this application.' });
    }

    // Fetch application details
    const application = await Application.findOne({ _id: applicationId, isDeleted: false })
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('agency', 'name email')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Prepare response
    return res.status(200).json({
      message: 'Successfully fetched application details.',
      application: {
        applicationId: application._id,
        university: application.university ? application.university.name : 'Unknown',
        country: application.university ? application.university.country : 'Unknown',
        course: application.course ? application.course.name : 'Unknown',
        fees: application.course ? application.course.fees : 0,
        status: application.status,
        submissionDate: application.submissionDate ? application.submissionDate.toLocaleDateString() : null,
        submissionTime: application.submissionDate ? application.submissionDate.toISOString().slice(11, 19) : null,
        notes: application.notes || 'No notes provided',
        agency: application.agency ? application.agency.name : 'Not assigned',
        assignedAgent: application.assignedAgent ? { name: application.assignedAgent.name, email: application.assignedAgent.email } : 'Not assigned',
      },
    });

  } catch (error) {
    console.error('Error fetching application details:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

  


// exports.applyForUniversity = async (req, res) => {
//   try {
//     const { universityId, courseId } = req.body;
//     const { documents } = req.files || {}; // Assuming file upload middleware is used
//     const studentId = req.studentId; // Retrieved from authentication middleware

//     // Validate IDs
//     if (
//       !mongoose.Types.ObjectId.isValid(studentId) ||
//       !mongoose.Types.ObjectId.isValid(universityId) ||
//       !mongoose.Types.ObjectId.isValid(courseId)
//     ) {
//       return res.status(400).json({ message: 'Invalid IDs provided.' });
//     }

//     // Fetch the student
//     const student = await Student.findById(studentId).select(
//       'firstName middleName lastName dateOfBirth gender email telephoneNumber presentAddress permanentAddress documentType ' +
//       'documentUpload mostRecentEducation otherEducationName yearOfGraduation collegeUniversity programType otherProgramName ' +
//       'discipline otherDisciplineName countryApplyingFrom applications isPaid referralSource assignedAgent preferredCommunicationMethod'
//     );
//     if (!student) {
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     // Fetch the university
//     const university = await University.findById(universityId).select('courses');
//     if (!university) {
//       return res.status(404).json({ message: 'University not found.' });
//     }

//     // Check if the course exists in the university
//     const courseExists = university.courses.some((course) =>
//       course.toString() === courseId
//     );
//     if (!courseExists) {
//       return res.status(400).json({ message: 'The selected course does not exist in the specified university.' });
//     }

//     // Check if the student already applied to the same course at the university
//     const existingApplication = await Application.findOne({
//       student: studentId,
//       university: universityId,
//       course: courseId,
//     });
//     if (existingApplication) {
//       return res.status(400).json({ message: 'Application already exists for this course at the selected university.' });
//     }

//     // Fetch the default agency
//     const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID);
//     console.log('agency id ',defaultAgency);
    
//     if (!defaultAgency) {
//       return res.status(500).json({ message: 'Default agency not found.' });
//     }

//     // Prepare document metadata if documents are uploaded
//     const uploadedDocuments = documents
//       ? documents.map((doc) => ({
//           fileName: doc.originalname,
//           fileType: doc.mimetype,
//           fileUrl: doc.path,
//         }))
//       : [];

//     // Create a new application
//     const newApplication = new Application({
//       student: studentId,
//       university: universityId,
//       course: courseId,
//       documents: uploadedDocuments,
//       assignedAgent: student.assignedAgent, // Retain assigned agent from student record
//     });

//     // Save the application
//     await newApplication.save();

//     // Update the student's application list
//     student.applications.push({ applicationId: newApplication._id });
//     await student.save();

//     // Update the agency's pending applications list
//     defaultAgency.pendingApplications.push(newApplication._id);
//     await defaultAgency.save();

//     return res.status(201).json({
//       message: 'Application submitted successfully.',
//       application: {
//         id: newApplication._id,
//         status: newApplication.status,
//         submissionDate: newApplication.submissionDate,
//         university: newApplication.university,
//         course: newApplication.course,
//       },
//       student: {
//         firstName: student.firstName,
//         middleName: student.middleName,
//         lastName: student.lastName,
//         dateOfBirth: student.dateOfBirth,
//         gender: student.gender,
//         email: student.email,
//         telephoneNumber: student.telephoneNumber,
//         presentAddress: student.presentAddress,
//         permanentAddress: student.permanentAddress,
//         documentType: student.documentType,
//         documentUpload: student.documentUpload,
//         mostRecentEducation: student.mostRecentEducation,
//         otherEducationName: student.otherEducationName,
//         yearOfGraduation: student.yearOfGraduation,
//         collegeUniversity: student.collegeUniversity,
//         programType: student.programType,
//         otherProgramName: student.otherProgramName,
//         discipline: student.discipline,
//         otherDisciplineName: student.otherDisciplineName,
//         countryApplyingFrom: student.countryApplyingFrom,
//         referralSource: student.referralSource,
//         assignedAgent: student.assignedAgent,
//         preferredCommunicationMethod: student.preferredCommunicationMethod,
//         isPaid: student.isPaid,
//       },
//     });
//   } catch (error) {
//     console.error('Error applying for university:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };