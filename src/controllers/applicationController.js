const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const Student = require('../models/studentsModel');
const Agency = require('../models/agencyModel');

exports.applyForUniversity = async (req, res) => {
  try {
    const { studentId, agencyId, universityId, courseId } = req.body;
    const { documents } = req.files || {}; // Assuming file upload middleware is used

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(agencyId) ||
      !mongoose.Types.ObjectId.isValid(universityId) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({ message: 'Invalid IDs provided' });
    }

    // Fetch student
    const student = await Student.findById(studentId).select(
      'firstName middleName lastName dateOfBirth gender email telephoneNumber documentType documentUpload ' +
      'mostRecentEducation otherEducationName yearOfGraduation collegeUniversity programType otherProgramName ' +
      'discipline otherDisciplineName countryApplyingFrom applications isPaid referralSource assignedAgent agency preferredCommunicationMethod'
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Fetch agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    // Check if student already applied to the same course at the university via the same agency
    const existingApplication = await Application.findOne({
      student: studentId,
      university: universityId,
      course: courseId,
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Application already exists for this course in the selected university.' });
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
    });

    // Save application
    await newApplication.save();

    // Update student's applications
    student.applications.push({ applicationId: newApplication._id });
    await student.save();

    // Update agency's pending applications
    agency.pendingApplications.push(newApplication._id);
    await agency.save();

    return res.status(201).json({
      message: 'Application submitted successfully',
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
        agency: student.agency,
        preferredCommunicationMethod: student.preferredCommunicationMethod,
        isPaid: student.isPaid,
      },
    });
  } catch (error) {
    console.error('Error applying for university:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




