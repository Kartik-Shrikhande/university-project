const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Students = require('../models/StudentsModel');
const university = require('../models/universityModel');
const Course = require('../models/coursesModel');

require('dotenv').config({ path: '.env' })

// Registration
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if student already exists
    const existingStudent = await Students.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const newStudent = new Students({
      name,
      email,
      password: hashedPassword,
    });
    await newStudent.save();

    return res.status(201).json({ message: 'Student registered successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

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
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating password directly
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedStudent = await Students.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.status(200).json({ message: 'Student updated successfully.', updatedStudent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Delete Student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Students.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.status(200).json({ message: 'Student deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.getUniversityById = async (req, res) => {
    try {
      const { universityId } = req.params;
      const studentId = req.studentId; 
  
      // Fetch the university by ID
      const findUniversity = await university.findById(universityId)
      if (!findUniversity) {
        return res.status(404).json({ message: 'University not found.' });
      }

      const student = await Students.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
  
      // Check if the university is already enrolled
      if (!student.enrolledUniversities.includes(universityId)) {
        student.enrolledUniversities.push(universityId);
        await student.save();
      }
  
      return res.status(200).json({ findUniversity });
    } catch (error) {
      console.error('Error fetching university:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };

exports.getUniversities = async (req, res) => {
    try {
      const universities = await university
        .find()
        .sort({ isPromoted: -1 }) // `-1` ensures 'YES' comes before 'NO'
  
      if (universities.length === 0) {
        return res.status(404).json({ message: 'No universities found.' });
      }
      return res.status(200).json({ universities });
    } catch (error) {
      console.error('Error fetching universities:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };

  
  // Dummy payment API
  exports.createPayment = async (req, res) => {
    try {
        const studentId  = req.studentId;
      // Find student by ID
      const student = await Students.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
  
      // Simulate payment (setting isPaid to true)
      student.isPaid = true;
      await student.save();
  
      return res.status(200).json({
        message: 'Payment successful, you can now access the dashboard.',
        student,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
  

// Get all courses (optionally filtered by university)
exports.getAllCourses = async (req, res) => {
  try {
    const { universityId } = req.query; // Optional query param

    let filter = {};
    if (universityId) {
      filter = { university: universityId };
    }
    
    const courses = await Course.find(filter).populate('university', 'name');

    if (!courses.length) {
      return res.status(404).json({ message: 'No courses found' });
    }

    return res.status(200).json({total:courses.length,coursesList: courses ,});
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.studentId; // Assuming `studentId` is provided via middleware/authentication

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

    // Check if the course is already in `enrolledCourses`
    if (!student.enrolledCourses.includes(courseId)) {
      student.enrolledCourses.push(courseId);
      await student.save();
    }

    return res.status(200).json({ course });
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
