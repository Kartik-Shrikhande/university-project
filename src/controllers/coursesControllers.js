const Course = require('../models/coursesModel');
const University = require('../models/universityModel');

// Create a new course and link it to a university
exports.createCourse = async (req, res) => {
    try {
      const { name, description, fees, ratings } = req.body;
      const { universityId } = req.params; // Get universityId from URL parameters
  
      const universityRecord = await University.findById(universityId);
      if (!universityRecord) {
        return res.status(404).json({ message: 'University not found' });
      }
  
      // Check if the course already exists in the same university
      const existingCourse = await Course.findOne({ name, university: universityId });
      if (existingCourse) {
        return res.status(400).json({ message: 'Course with the same name already exists in this university.' });
      }
  
      const course = new Course({
        name,
        description,
        university: universityId,
        fees,
        ratings,
      });
  
      await course.save();
  
      // Add course to the university's course list
      universityRecord.courses.push(course._id);
      await universityRecord.save();
  
      return res.status(201).json({
        message: 'Course created successfully',
        course,
      });
    } catch (error) {
      console.error('Error creating course:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  

// Get a specific course by ID


// Update a course by ID
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;

    const course = await Course.findByIdAndUpdate(courseId, updates, { new: true });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.status(200).json({
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a course by ID and remove it from the associated university
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove the course from the university's course list
    const university = await University.findById(course.university);
    if (university) {
      university.courses = university.courses.filter(
        (id) => id.toString() !== courseId
      );
      await university.save();
    }

    return res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
