const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');
const university = require('../models/universityModel');
const Course = require('../models/coursesModel');
const { isValidObjectId } = require('mongoose');
const mongoose = require('mongoose');

require('dotenv').config({ path: '.env' })

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
      telephoneNumber,
      documentType,
      documentUpload,
      mostRecentEducation,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      countryApplyingFrom,
      preferredUniversity,
      preferredCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      languageTestName,
      languageTestScore,
      referralSource,
      agentName,
      preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
      presentAddress, 
      permanentAddress, 
    } = req.body;

    // Basic Validation
    if (
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
      !email ||
      !confirmEmail ||
      !password ||
      !telephoneNumber ||
      !documentType ||
      !documentUpload ||
      !mostRecentEducation ||
      !programType ||
      !countryApplyingFrom ||
      !courseStartTimeline ||
      !preferredCommunicationMethod ||
      !presentAddress || 
      !permanentAddress 
    ) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Email Validation
    if (email !== confirmEmail) {
      return res.status(400).json({ message: 'Email and Confirm Email do not match.' });
    }

    // Check if student already exists
    const existingStudent = await Students.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); 

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
      telephoneNumber,
      documentType,
      documentUpload,
      mostRecentEducation,
      otherEducationName,
      yearOfGraduation,
      collegeUniversity,
      programType,
      otherProgramName,
      discipline,
      otherDisciplineName,
      countryApplyingFrom,
      preferredUniversity,
      preferredCourse,
      courseStartTimeline,
      englishLanguageRequirement,
      languageTestName,
      languageTestScore,
      referralSource,
      agentName,
      preferredCommunicationMethod,
      termsAndConditionsAccepted,
      gdprAccepted,
      presentAddress, 
      permanentAddress, 
    });

    await newStudent.save();

    return res.status(201).json({
      message: 'Student registered successfully.',
      studentId: newStudent._id,
    });
  } catch (error) {
    console.error('Error registering student:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// exports.registerStudent = async (req, res) => {
//   try {
//     const {
//       firstName,
//       middleName,
//       lastName,
//       dateOfBirth,
//       gender,
//       email,
//       confirmEmail,
//       password,
//       telephoneNumber,
//       presentAddress: {
//         streetAddress,
//         city: presentCity,
//         state: presentState,
//         postalCode: presentPostalCode,
//         country: presentCountry,
//       },
//       permanentAddress: {
//         streetAddress: permanentStreetAddress,
//         city: permanentCity,
//         state: permanentState,
//         postalCode: permanentPostalCode,
//         country: permanentCountry,
//       },
//       documentType,
//       documentUpload,
//       mostRecentEducation,
//       otherEducationName,
//       yearOfGraduation,
//       collegeUniversity,
//       programType,
//       otherProgramName,
//       discipline,
//       otherDisciplineName,
//       countryApplyingFrom,
//       preferredUniversity,
//       preferredCourse,
//       courseStartTimeline,
//       englishLanguageRequirement,
//       languageTestName,
//       languageTestScore,
//       referralSource,
//       preferredCommunicationMethod,
//       termsAndConditionsAccepted,
//       gdprAccepted,
//     } = req.body;

//     // Validation: Check required fields
//     if (
//       !firstName ||
//       !lastName ||
//       !dateOfBirth ||
//       !gender ||
//       !email ||
//       !confirmEmail || 
//       !password ||
//       !telephoneNumber ||
//       !presentAddress ||
//       !permanentAddress ||
//       !documentType ||
//       !documentUpload ||
//       !mostRecentEducation ||
//       !programType ||
//       !countryApplyingFrom ||
//       !courseStartTimeline ||
//       !preferredCommunicationMethod 
//     ) {
//       return res.status(400).json({ message: 'Please fill all required fields.' });
//     }

//     // // Check if email and confirm email match
//     if (email !== confirmEmail) {
//       return res.status(400).json({ message: 'Email and Confirm Email do not match.' });
//     }

//     // Check if student already exists
//     const existingStudent = await Students.findOne({ email });
//     if (existingStudent) {
//       return res.status(400).json({ message: 'Email already in use.' });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create student
//     const newStudent = new Students({
//       firstName,
//       middleName,
//       lastName,
//       dateOfBirth,
//       gender,
//       email,
//       confirmEmail,
//       password: hashedPassword,
//       telephoneNumber,
//       presentAddress: {
//         streetAddress,
//         city: presentCity,
//         state: presentState,
//         postalCode: presentPostalCode,
//         country: presentCountry,
//       },
//       permanentAddress: {
//         streetAddress: permanentStreetAddress,
//         city: permanentCity,
//         state: permanentState,
//         postalCode: permanentPostalCode,
//         country: permanentCountry,
//       },
//       documentType,
//       documentUpload,
//       mostRecentEducation,
//       otherEducationName,
//       yearOfGraduation,
//       collegeUniversity,
//       programType,
//       otherProgramName,
//       discipline,
//       otherDisciplineName,
//       countryApplyingFrom,
//       preferredUniversity,
//       preferredCourse,
//       courseStartTimeline,
//       englishLanguageRequirement,
//       languageTestName,
//       languageTestScore,
//       referralSource,
//       agentName,
//       preferredCommunicationMethod,
//       // termsAndConditionsAccepted,
//       // gdprAccepted,
//     });

//     await newStudent.save();

//     return res.status(201).json({
//       message: 'Student registered successfully.',
//       studentId: newStudent._id,
//     });
//   } catch (error) {
//     console.error('Error registering student:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };
// exports.registerStudent = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     // Check if student already exists
//     const existingStudent = await Students.findOne({ email });
//     if (existingStudent) {
//       return res.status(400).json({ message: 'Email already in use.' });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create student
//     const newStudent = new Students({
//       name,
//       email,
//       password: hashedPassword,
//     });
//     await newStudent.save();

//     return res.status(201).json({ message: 'Student registered successfully.' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


// Login

exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student by email
    const student = await Students.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: 'Invalid email.' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password.' });
    }

    // Update login state and lastActivity
    student.loginCompleted = true;
    await student.save();

    // Generate token
    const token = jwt.sign({ id: student._id }, process.env.SECRET_KEY, { expiresIn: '5h' });

    return res.status(200).json({ message: 'Login successful.', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const id = req.studentId; // Extracting student ID from the request context
    const updates = req.body;

    // Prevent updates to certain fields
    const restrictedFields = ['email', 'visitedUniversities', 'visitedCourses', 'enrolledCourses','password'];
    for (const field of restrictedFields) {
      if (updates[field]) {
        return res.status(400).json({ message: `Field "${field}" cannot be updated directly.` });
      }
    }

    // // If password is being updated, hash it before saving
    // if (updates.password) {
    //   return res.status(400).json({ message: `Password cannot be updated directly.` });
    // }

    // Find and update the student
    const updatedStudent = await Students.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.status(200).json({message: 'Student updated successfully.', updatedStudent:updatedStudent});
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.updatePassword = async (req, res) => {
  try {
    const studentId = req.studentId;  // Assuming the studentId is available in the request object
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword' });
    }

    // Validate new password length
    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({  message: 'Password must be between 8 and 14 characters long' });
    }

    // Find the student in the database by studentId
    const student = await Students.findById(studentId);
    
    // Check if student exists
    if (!student) {
      return res.status(404).json({  message: 'Student not found' });
    }

    // Check if the current password matches the password stored in the database
    const isPasswordMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isPasswordMatch) {
      return res.status(400).json({  message: 'Current password is incorrect' });
    }

    // Check if the new password matches the confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({  message: 'New password and confirm password do not match' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the student's password
    student.password = hashedPassword;
    await student.save();

    // Return success response
    return res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({  message: error.message });
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



exports.getUniversityById = async (req, res) => {
    try {
      const { universityId } = req.params;
      const studentId = req.studentId; 

     if(!isValidObjectId(universityId)) return res.status(400).json({message : 'Enter valid universityId'})

      // Fetch the university by ID
      const findUniversity = await university.findById(universityId)
      if (!findUniversity) {
        return res.status(404).json({ message: 'University not found.' });
      }

      const student = await Students.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
  
      // Check if the university is already visited
      if (!student.visitedUniversities.includes(universityId)) {
        student.visitedUniversities.push(universityId);
        await student.save();
      }
  
      return res.status(200).json({University_Details: findUniversity })
    } catch (error) {
      console.error('Error fetching university:', error)
      return res.status(500).json({ message: 'Internal server error.' })
    }
  };

exports.getUniversities = async (req, res) => {
    try {
      const universities = await university.find().sort({ isPromoted: -1 }) // `-1` ensures 'YES' comes before 'NO'
      if (universities.length === 0) return res.status(404).json({ message: 'No universities found.' })
      return res.status(200).json({Total:universities.length,universities: universities });
    } 
    catch (error) {
      console.error('Error fetching universities:', error);
      return res.status(500).json({ message: 'Internal server error.' })
    }
  };

  
  // Dummy payment API
  exports.createPayment = async (req, res) => {
    try {
        const studentId  = req.studentId
      // Find student by ID
      const student = await Students.findById(studentId)
      if (!student) return res.status(404).json({ message: 'Student not found.'})
      
      // Simulate payment (setting isPaid to true)
      student.isPaid = true;
      await student.save();
  
      return res.status(200).json({message: 'Payment successful, you can now access the dashboard.',student})
    } 
    catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({ message: 'Internal server error.' })
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
  const { courseId } = req.params // Extract courseId from route parameters
  const  studentId  = req.studentId       // Extract studentId from middleware (set in req object)

  if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
  try {
    // Validate student existence
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Validate course existence
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    if (student.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Add course to enrolledCourses
    student.enrolledCourses.push(courseId);
    await student.save();

    return res.status(200).json({
      message: 'Successfully enrolled in the course',
      CourseDetails:course
    });
  } 
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
};


exports.universityApplication = async (req, res) => {
  try {
    const  studentId  =   req.studentId;
    const {universityId } = req.params;

    // // Validate IDs
    // if (!isValidObjectId(universityId) || !isValidObjectId(studentId)) {
    //   return res.status(400).json({ message: 'Invalid universityId or studentId' });
    // }

    // Find the university
    const findUniversity = await university.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Add the new application
    findUniversity.pendingApplications.push({ student: studentId });
    await findUniversity.save();

    return res.status(201).json({ message: 'Application added successfully', findUniversity });
  } catch (error) {
    console.error('Error adding application:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
        // notes: app.applicationId.notes || 'No notes provided',
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



