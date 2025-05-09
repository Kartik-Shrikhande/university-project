const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const Students = require('../models/studentsModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');
const { uploadFilesToS3 } = require('../utils/s3Upload');
const Course = require('../models/coursesModel');
require('dotenv').config()

//STUDENTS

// exports.applyForCourse = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const { courseId } = req.params;
//       const documents = req.files?.documents || []; // Ensure documents is always an array// Assuming file upload middleware is used
//       const studentId = req.user.id; // Retrieved from authentication middleware
  
//       // Validate IDs
//       if (!mongoose.Types.ObjectId.isValid(courseId)) return res.status(400).json({ message: 'Invalid CourseId.' });
      


//     // Fetch the course details (including university)
//     const course = await Course.findById(courseId).select('university status');
//     if (!course) {
//         return res.status(404).json({ message: 'Course not found.' });
//     }

//     // Ensure the course is active before proceeding
//     if (course.status !== 'Active') {
//         return res.status(400).json({ message: 'This course is currently inactive and cannot be applied for.' });
//     }

//     const universityId = course.university; // ✅ Auto-fetch university ID from course



//       // Fetch the student
//       const student = await Students.findById(studentId).session(session).select(
//         'firstName middleName lastName dateOfBirth gender email countryCode telephoneNumber address documentType ' +
//         'documentUpload mostRecentEducation discipline otherDisciplineName otherEducationName collegeUniversity'
//          );
//       if (!student) {
//         return res.status(404).json({ message: 'Student not found.' });
//       }
  
  
//       // Check if the student already applied to the same course at the university
//       const existingApplication = await Application.findOne({
//         student: studentId,
//         university: universityId,
//         course: courseId,
//       }).session(session);
//       if (existingApplication) {
//         return res.status(400).json({ message: 'Application already exists for this course at the selected university.' });
//       }
  
//       // Fetch the default agency
//       const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
//       if (!defaultAgency) {
//         return res.status(500).json({ message: 'Default agency not found.' });
//       }
  
//       // Prepare document metadata if documents are uploaded
// // Prepare document metadata if documents are uploaded
// const uploadedDocuments = documents.map((doc) => ({
//   fileName: doc.originalname,
//   fileType: doc.mimetype,
//   fileUrl: doc.path,
// }));
  
//       // Create a new application
//       const newApplication = new Application({
//         student: studentId,
//         university: universityId,
//         course: courseId,
//         documents: uploadedDocuments,
//         agency: defaultAgency._id, // Assign default agency
//         assignedAgent: student.assignedAgent|| [], // Retain assigned agent from student record
//       });
  
//       // Save the application
//       await newApplication.save({ session });
      
//       if (!student.applications) {
//         student.applications = [];  // Initialize if undefined
//     }
    
//       // Update the student's application list
//       student.applications.push({ applicationId: newApplication._id });
//       await student.save({ session });
  
//       // Update the agency's pending applications list
//       defaultAgency.pendingApplications.push(newApplication._id);
//       await defaultAgency.save({ session });
  
//       await session.commitTransaction();
//       session.endSession();
  
//       return res.status(201).json({
//         message: 'Application submitted successfully.',
//         application: {
//           id: newApplication._id,
//           status: newApplication.status,
//           submissionDate: newApplication.submissionDate,
//           university: newApplication.university,
//           course: newApplication.course,
//         },
//         student: {
//           firstName: student.firstName,
//           middleName: student.middleName,
//           lastName: student.lastName,
//           dateOfBirth: student.dateOfBirth,
//           gender: student.gender,
//           email: student.email,
//           telephoneNumber: student.telephoneNumber,
//           presentAddress: student.presentAddress,
//           permanentAddress: student.permanentAddress,
//           documentType: student.documentType,
//           documentUpload: student.documentUpload,
//           mostRecentEducation: student.mostRecentEducation,
//           otherEducationName: student.otherEducationName,
//           // yearOfGraduation: student.yearOfGraduation,
//           collegeUniversity: student.collegeUniversity,
//           // programType: student.programType,
//           // otherProgramName: student.otherProgramName,
//           // discipline: student.discipline,
//           // otherDisciplineName: student.otherDisciplineName,
//           // countryApplyingFrom: student.countryApplyingFrom,
//           // referralSource: student.referralSource,
//           assignedAgent: student.assignedAgent,
//           // preferredCommunicationMethod: student.preferredCommunicationMethod,
//           // isPaid: student.isPaid,
//         },
//       });
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       console.error('Error applying for university:', error);
//       return res.status(500).json({ message: 'Internal server error.' });
//     }
//   };



exports.getStudentDetailsForApplication = async (req, res) => {
  try {
      const studentId = req.user.id;

      const student = await Students.findById(studentId).select(
          'firstName middleName lastName dateOfBirth gender email countryCode telephoneNumber address ' +
          'documentType document documentUpload mostRecentEducation courseName fromYear toYear discipline otherDisciplineName ' +
          'otherEducationName collegeUniversity NameOfUniversity '
      );

      if (!student) {
          return res.status(404).json({ message: 'Student not found.' });
      }

      return res.status(200).json({ student });
  } catch (error) {
      console.error('Error fetching student details:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
};




exports.applyForCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
      const { courseId } = req.params;
      const studentId = req.user.id;

      // Extract input fields from the request body
      const {
        //   previousDegree,
          grades,
          marks,
          financialAid
        //   fromYear,
        //   toYear,
      } = req.body;


 // ✅ Upload files to AWS S3 and get URLs
      // ✅ Upload files to AWS S3 and get URLs only if files are provided
      const latestdegreeCertificates = await uploadFilesToS3(req.files?.['latestdegreeCertificates'] || []);
      const englishTest = await uploadFilesToS3(req.files?.['englishTest'] || []);
      const proofOfAddress = await uploadFilesToS3(req.files?.['proofOfAddress'] || []);


 
      // Validate course ID
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
          return res.status(400).json({ message: 'Invalid CourseId.' });
      }

      const course = await Course.findById(courseId).select('university status');
      if (!course) {
          return res.status(404).json({ message: 'Course not found.' });
      }

      if (course.status !== 'Active') {
          return res.status(400).json({ message: 'This course is currently inactive and cannot be applied for.' });
      }

      const universityId = course.university;
       // ✅ Fetch Student Details
       const student = await Students.findById(studentId).session(session).select(
        'firstName middleName lastName dateOfBirth gender email countryCode telephoneNumber address documentType ' +
        'documentUpload mostRecentEducation discipline otherDisciplineName otherEducationName collegeUniversity'
    );
    if (!student) return res.status(404).json({ message: 'Student not found.' });

  // ✅ Check for 3 accepted applications
  const acceptedApplicationsCount = await Application.countDocuments({
    student: studentId,
    status: 'Accepted'
  }).session(session);

  if (acceptedApplicationsCount >= 3) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ message: 'You already have 3 accepted applications. You cannot apply for more courses.' });
  }
  const existingApplication = await Application.findOne({
    student: studentId,
    university: universityId,
    course: courseId,
  }).session(session);
  

  
  if (existingApplication) {
    if (existingApplication.status === 'Rejected') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: 'You cannot apply for this course again as it was rejected by the university.',
      });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: 'Application already exists for this course at the selected university.',
      });
    }
  }
  
  

      const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
      if (!defaultAgency) {
          return res.status(500).json({ message: 'Default agency not found.' });
      }

      // ✅ Create a new application with properly initialized arrays
      const newApplication = new Application({
          student: studentId,
          university: universityId,
          course: courseId,
          agency: defaultAgency._id,
          assignedAgent: student.assignedAgent || [],

          // Academic Details
        //   previousDegree,
          grades,
          marks,
          financialAid,
     
          latestdegreeCertificates,
          englishTest,
          proofOfAddress
          
      });

      await newApplication.save({ session });



// Ensure applications array is initialized
if (!Array.isArray(student.applications)) {
  student.applications = [];
}

// Add the new application using $push (safer method)
await Students.findByIdAndUpdate(
  studentId,
  { $push: { applications: newApplication._id } },
  { session, new: true }
);

// Also update the agency
await Agency.findByIdAndUpdate(
  process.env.DEFAULT_AGENCY_ID,
  { $push: { pendingApplications: newApplication._id } },
  { session, new: true }
);


      // ✅ If any English Test files were uploaded, add them to student's record
      if (englishTest.length > 0) {
        await Students.findByIdAndUpdate(
          studentId,
          {
            $push: { document: { $each: englishTest } }
          },
          { session }
        );
      }
      
  
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
  
      });

  } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error applying for university:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.updateApplication = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { applicationId } = req.params;
      const studentId = req.user.id;
  
      // Check if the application ID is valid
      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ message: 'Invalid Application ID.' });
      }
  
      // Find the application and validate ownership
      const application = await Application.findOne({ _id: applicationId, student: studentId }).session(session);
      if (!application) {
        return res.status(404).json({ message: 'Application not found.' });
      }
  
      // Extract input fields
      const { grades, marks, financialAid } = req.body;
  
      // ✅ Upload files to AWS S3 and get URLs
      const latestdegreeCertificates = req.files['latestdegreeCertificates']
        ? await uploadFilesToS3(req.files['latestdegreeCertificates'])
        : null;
  
      const englishTest = req.files['englishTest']
        ? await uploadFilesToS3(req.files['englishTest'])
        : null;
  
      const proofOfAddress = req.files['proofOfAddress']
        ? await uploadFilesToS3(req.files['proofOfAddress'])
        : null;
  
      // ✅ Prepare update object
      const updateFields = {
        grades,
        marks,
        financialAid,
      };
  
      // ✅ Conditionally update document fields
      if (latestdegreeCertificates) {
        updateFields.latestdegreeCertificates = latestdegreeCertificates;
      }
  
      if (englishTest) {
        updateFields.englishTest = englishTest;
      }
  
      if (proofOfAddress) {
        updateFields.proofOfAddress = proofOfAddress;
      }
  
      // ✅ Use $set to update only the provided fields
      await Application.findByIdAndUpdate(
        applicationId,
        { $set: updateFields },
        { session, new: true }
      );
  
      await session.commitTransaction();
      session.endSession();
  
      return res.status(200).json({ message: 'Application updated successfully.' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error updating application:', error);
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
        const studentId = req.user.id;
        const { status } = req.query; // Get status from query parameter

        // Validate `studentId`
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID provided.' });
        }

        // Fetch the student with their applications
        const student = await Students.findById(studentId)
            .populate({
                path: 'applications',
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

        if (!student.applications || student.applications.length === 0) {
            return res.status(404).json({ message: 'No applications found for this student.' });
        }

        //  Convert status to lowercase for case-insensitive filtering
        const statusFilter = status ? status.toLowerCase() : null;

        //  Define valid statuses
        const validStatuses = ['accepted', 'rejected', 'processing', 'withdrawn'];

        if (statusFilter && !validStatuses.includes(statusFilter)) {
            return res.status(400).json({
                message: `Invalid status provided. Valid statuses: ${validStatuses.join(', ')}`,
            });
        }

        // ✅ Apply status filtering if provided
        const filteredApplications = student.applications.filter((app) =>
            statusFilter ? app.status.toLowerCase() === statusFilter : true
        );

        if (filteredApplications.length === 0) {
            return res.status(404).json({
                message: `No applications found with status '${statusFilter}'.`,
            });
        }

        // Prepare the response data
        const applications = filteredApplications.map((app) => ({
            applicationId: app._id,
            university: app.university ? app.university.name : 'Unknown',
            course: app.course ? app.course.name : 'Unknown',
            status: app.status,
            submissionDate: app.submissionDate ? app.submissionDate.toLocaleDateString() : null,
            submissionTime: app.submissionDate ? app.submissionDate.toISOString().slice(11, 19) : null,
            notes: app.notes || 'No notes provided',
        }));

        return res.status(200).json({
            total: applications.length,
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
  
//in use previousely 
  // exports.getStudentApplications = async (req, res) => {
  //   try {
  //     const studentId = req.user.id;
  
  //     // Validate `studentId`
  //     if (!mongoose.Types.ObjectId.isValid(studentId)) {
  //       return res.status(400).json({ message: 'Invalid student ID provided.' });
  //     }
  
  //     // Fetch the student with their applications
  //     const student = await Students.findById(studentId)
  //       .populate({
  //         path: 'applications',
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
  
  //     if (!student.applications || student.applications.length === 0) {
  //       return res.status(404).json({ message: 'No applications found for this student.' });
  //     }
  
  //     // Prepare the response data
  //     const applications = student.applications.map((app) => ({
  //       applicationId: app._id,
  //       university: app.university ? app.university.name : 'Unknown',
  //       // country: app.university?app.university.address.country : 'Unknown',
  //       course: app.course ? app.course.name : 'Unknown',
  //       status: app.status,
  //       submissionDate: app.submissionDate ? app.submissionDate.toLocaleDateString() : null,
  //       submissionTime: app.submissionDate ? app.submissionDate.toISOString().slice(11, 19) : null,
  //       notes: app.notes || 'No notes provided',
  //     }));
  
  //     return res.status(200).json({
  //       total: applications.length,
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
  
//-
//-----------------------------------------------------------------------------------------------------------


// ✅ Get a specific application by ID for a student
exports.getApplicationById = async (req, res) => {
  try {

    const studentId  = req.user.id
      const { applicationId } = req.params;

      // Ensure student exists
      const studentExists = await Students.findById(studentId);
      if (!studentExists) {
          return res.status(404).json({ message: "Student not found" });
      }

      // Fetch application
      const application = await Application.findOne({ student: studentId, _id: applicationId })
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('agency', 'name email')
      .populate('assignedAgent', 'name email');

      if (!application) {
          return res.status(404).json({ message: "Application not found" });
      }

      res.status(200).json({ success: true, application });

  } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};  



exports.withdrawApplication = async (req, res) => {
  try {
      const { applicationId } = req.params;
      const studentId = req.user.id; // Assuming user ID is extracted from JWT middleware

      //  Validate Application ID format
      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
          return res.status(400).json({ message: 'Invalid Application ID.' });
      }

      // ✅ Find the application and check ownership
      const application = await Application.findOne({ _id: applicationId, student: studentId });

      if (!application) {
          return res.status(404).json({ message: 'Application not found for student.' });
      }

       // ✅ Check if application is already withdrawn
       if (application.status === 'Withdrawn') {
        return res.status(400).json({ message: 'Application has already been withdrawn.' });
    }
      // ✅ Check if withdrawal is allowed (only "Processing" or "Rejected" states)
      if (!['Processing'].includes(application.status)) {
          return res.status(400).json({
              message: `Accepted and Rejected Application cannot be withdrawn, Current status:- ${application.status}`
          });
      }

      // ✅ Update application status to "Withdrawn"
      application.status = 'Withdrawn';
      await application.save();

      return res.status(200).json({ message: 'Application successfully withdrawn.' });

  } catch (error) {
      console.error('Error withdrawing application:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
};


//AGENT 


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