const Course = require('../models/coursesModel');
const University = require('../models/universityModel');
const { isValidObjectId } = require('mongoose');
const mongoose = require('mongoose');

// Create a new course and link it to a university



// Get a specific course by ID


exports.updateCourse = async (req, res) => {
  try {
    const { courseId, universityId } = req.params; // Extract university ID and course ID from params
    const updates = req.body;

    // Validate the university ID
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    // Validate the course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    // Check if the university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Validate if the course belongs to the provided university
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (course.university.toString() !== universityId) {
      return res.status(400).json({
        message: 'The course does not belong to the specified university.',
      });
    }

    // Check for duplicate course name within the same university
    if (updates.name) {
      const existingCourse = await Course.findOne({
        name: updates.name,
        university: universityId,
        _id: { $ne: courseId }, // Exclude the current course from the check
      });

      if (existingCourse) {
        return res.status(400).json({
          message: 'A course with the same name already exists in this university.',
        });
      }
    }

    // Update the course
    const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, { new: true });

    return res.status(200).json({
      message: 'Course updated successfully.',
      course: updatedCourse,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// // Update a course by ID
// exports.updateCourse = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const updates = req.body;

//     const course = await Course.findByIdAndUpdate(courseId, updates, { new: true });

//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }

//     return res.status(200).json({
//       message: 'Course updated successfully',
//       course,
//     });
//   } catch (error) {
//     console.error('Error updating course:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };


// Delete a course by ID and remove it from the associated university
exports.deleteCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { courseId } = req.params;

    // Find and delete the course
    const course = await Course.findByIdAndDelete(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove the course from the university's course list
    const university = await University.findById(course.university).session(session);
    if (university) {
      university.courses = university.courses.filter((id) => id.toString() !== courseId);
      await university.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
