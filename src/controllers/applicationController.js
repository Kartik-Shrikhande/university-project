const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const Student = require('../models/studentsModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');

exports.applyForUniversity = async (req, res) => {
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
    const student = await Student.findById(studentId).select(
      'firstName middleName lastName dateOfBirth gender email telephoneNumber presentAddress permanentAddress documentType ' +
      'documentUpload mostRecentEducation otherEducationName yearOfGraduation collegeUniversity programType otherProgramName ' +
      'discipline otherDisciplineName countryApplyingFrom applications isPaid referralSource assignedAgent preferredCommunicationMethod'
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch the university
    const university = await University.findById(universityId).select('courses');
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the course exists in the university
    const courseExists = university.courses.some((course) =>
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
    });
    if (existingApplication) {
      return res.status(400).json({ message: 'Application already exists for this course at the selected university.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findOne({ _id: '677f6b7c701bc85481046b64' });
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
      assignedAgent: student.assignedAgent, // Retain assigned agent from student record
    });

    // Save the application
    await newApplication.save();

    // Update the student's application list
    student.applications.push({ applicationId: newApplication._id });
    await student.save();

    // Update the agency's pending applications list
    defaultAgency.pendingApplications.push(newApplication._id);
    await defaultAgency.save();

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
    console.error('Error applying for university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};