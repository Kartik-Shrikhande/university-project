const University = require('../models/universityModel');
const Course = require('../models/coursesModel');
const jwt = require('jsonwebtoken');
const { isValidObjectId } = require('mongoose');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');


exports.createUniversity = async (req, res) => {
  try {
    const { name, email, password, description, country, isPromoted, ratings } = req.body;

    // Check if the email is already in use
    const existingUniversity = await University.findOne({ email });
    if (existingUniversity) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new university instance
    const newUniversity = new University({
      name,
      email,
      password: hashedPassword,
      description,
      country,
      isPromoted: isPromoted || 'NO', // Default to 'NO' if not provided
      ratings: ratings || [], // Default to an empty array if not provided
    });

    // Save the new university to the database
    await newUniversity.save();

    return res.status(201).json({
      message: 'University created successfully.',
      university: {
        id: newUniversity._id,
        name: newUniversity.name,
        email: newUniversity.email,
        country: newUniversity.country,
        role: newUniversity.role, // Default role is 'University'
        isPromoted: newUniversity.isPromoted,
        ratings: newUniversity.ratings,
      },
    });
  } catch (error) {
    console.error('Error creating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


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
    const universityId = req.universityId; // Retrieve university ID from middleware
    const updates = req.body;

    // Validate updates
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates provided.' });
    }

    const updatedUniversity = await University.findByIdAndUpdate(universityId, updates, { new: true });
    if (!updatedUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ 
      message: 'University updated successfully.', 
      university: updatedUniversity 
    });
  } catch (error) {
    console.error('Error updating university:', error);
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





// Promote a university
exports.promoteUniversity = async (req, res) => {
  try {
    const universityId = req.universityId; // Retrieve university ID from middleware

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
      message: `University "${university.name}" has been promoted successfully.`,
      university,
    });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// Get all courses for a university
exports.getAllCourses = async (req, res) => {
  try {
    const universityId = req.universityId; // Retrieve university ID from middleware

    // Fetch the university and its courses
    const university = await University.findById(universityId).populate('courses', 'name fees description ratings');
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if there are any courses
    if (!university.courses || university.courses.length === 0) {
      return res.status(404).json({ message: 'No active courses found for this university.' });
    }

    return res.status(200).json({
      message: 'Courses fetched successfully.',
      total: university.courses.length,
      university: {
        id: university._id,
        name: university.name,
      },
      courses: university.courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// Get a specific course by ID for a university
exports.getCourseById = async (req, res) => {
  try {
    const universityId = req.universityId; // Retrieve university ID from middleware
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

    return res.status(200).json({
      message: 'Course fetched successfully.',
      course,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

 
 //req.params done



///inactive course details
exports.getAllInactiveCourses = async (req, res) => {
  try {
    const { universityId } = req.params;

    // Validate university ID
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    // Fetch the university and its inactive courses
    const university = await University.findById(universityId).populate({
      path: 'courses',
      match: { status: 'Inactive' }, // Match only inactive courses
      select: 'name fees description ratings status',
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



// valodateion flag


///inactive course details by id

exports.getInactiveCourseById = async (req, res) => {
  try {
    const { universityId, courseId } = req.params;

    // Validate university and course IDs
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Fetch the course directly and validate its university and status
    const course = await Course.findOne({ 
      _id: courseId, 
      university: universityId, 
      status: 'Inactive' 
    }).select('name fees description ratings status university');

    if (!course) {
      return res.status(404).json({ message: 'Inactive course not found or does not belong to the specified university.' });
    }

    // Fetch the university details
    const university = await University.findById(universityId).select('name');
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({
      message: 'Inactive course fetched successfully.',
      university: {
        id: university._id,
        name: university.name,
      },
      course,
    });
  } catch (error) {
    console.error('Error fetching inactive course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


//activate course 

exports.activateCourse = async (req, res) => {
  try {
    const { universityId, courseId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Check if the university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Fetch the course
    const course = await Course.findOne({ _id: courseId, university: universityId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or does not belong to the specified university.' });
    }

    // Check if the course is already active
    if (course.status === 'Active') {
      return res.status(400).json({ message: 'The course is already active.' });
    }

    // Activate the course
    course.status = 'Active';
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
    const { universityId, courseId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Check if the university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Fetch the course
    const course = await Course.findOne({ _id: courseId, university: universityId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or does not belong to the specified university.' });
    }

    // Check if the course is already inactive
    if (course.status === 'Inactive') {
      return res.status(400).json({ message: 'The course is already Inactive.' });
    }

    // Inactivate the course
    course.status = 'Inactive';
    await course.save();

    return res.status(200).json({
      message: 'Course Inactivated successfully.',
      course,
    });
  } catch (error) {
    console.error('Error inactivating course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// exports.acceptApplication = async (req, res) => {

//   exports.rejectApplication = async (req, res) => {