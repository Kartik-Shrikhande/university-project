const university = require('../models/universityModel');

// Create a new university
exports.createUniversity = async (req, res) => {
  try {
    const { name, description, location, isPromoted } = req.body;

    const newUniversity = new university({
      name,
      description,
      location,
      isPromoted,
    });

    await newUniversity.save();
    return res.status(201).json({ message: 'University created successfully.', university: newUniversity });
  } catch (error) {
    console.error('Error creating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update a university
exports.updateUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedUniversity = await university.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ message: 'University updated successfully.', university: updatedUniversity });
  } catch (error) {
    console.error('Error updating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Delete a university
exports.deleteUniversity = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUniversity = await university.findByIdAndDelete(id);
    if (!deletedUniversity) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ message: 'University deleted successfully.' });
  } catch (error) {
    console.error('Error deleting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Promote a university
exports.promoteUniversity = async (req, res) => {
  try {
    const { universityId } = req.params; // Assuming universityId is passed as a URL parameter

    // Find the university by ID
    const university = await university.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'YES') {
        return res.status(400).json({
          message: `University ${university.name} is already promoted.`,
        });
      }
  

    // Update the isPromoted field
    university.isPromoted = 'YES';
    await university.save();

    return res.status(200).json({
      message: `University ${university.name} has been promoted successfully.`,
      university,
    });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


