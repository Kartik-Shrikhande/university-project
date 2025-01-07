const Agency = require('../models/agencyModel');
const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const University = require('../models/universityModel');

// Create Agency
exports.createAgency = async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, address } = req.body;

    const newAgency = new Agency({
      name,
      contactEmail,
      contactPhone,
      address
    });

    const savedAgency = await newAgency.save();
    return res.status(201).json({message :"Agency succesfully created" ,data:savedAgency});
  } catch (error) {
    return res.status(400).json({ error: 'Error creating agency' });
  }
};

// Get All Agencies
exports.getAllAgencies = async (req, res) => {
  try {
    const agencies = await Agency.find();
    return res.status(200).json({totalAgencies:agencies.length,data: agencies});
  } catch (error) {
    return res.status(500).json({error: 'Error fetching agencies' });
  }
};

// Get Agency by ID
exports.getAgencyById = async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    return res.status(200).json(agency);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching agency' });
  }
};

// Update Agency by ID
exports.updateAgencyById = async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, address } = req.body;
    const updatedAgency = await Agency.findByIdAndUpdate(
      req.params.id,
      { name, contactEmail, contactPhone, address },
      { new: true }
    );

    if (!updatedAgency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    return res.status(200).json(updatedAgency);
  } catch (error) {
    return res.status(400).json({ error: 'Error updating agency' });
  }
};

// Delete Agency by ID
exports.deleteAgencyById = async (req, res) => {
  try {
    const deletedAgency = await Agency.findByIdAndDelete(req.params.id);
    if (!deletedAgency) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    return res.status(200).json({ message: 'Agency deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Error deleting agency' });
  }
};


//Application 

exports.sendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId, agencyId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId) || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return res.status(400).json({ message: 'Invalid IDs provided' });
    }

    // Fetch agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    // Check if the agency has any pending applications
    if (agency.pendingApplications.length === 0) {
      return res.status(404).json({ message: 'No pending applications found for this agency.' });
    }

    // Check if the application exists in agency's pendingApplications
    const isPendingInAgency = agency.pendingApplications.includes(applicationId);
    if (!isPendingInAgency) {
      return res.status(404).json({
        message: 'Application not found in agency\'s pending applications.',
      });
    }

    // Fetch application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Automatically fetch the university from the application
    const universityId = application.university;

    // Fetch university
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Add application to university's pending applications
    university.pendingApplications.push({
      student: application.student,
      applicationId: application._id,
    });

    // Save updated university
    await university.save();

    // Remove application from agency's pendingApplications
    agency.pendingApplications = agency.pendingApplications.filter(
      (id) => id.toString() !== applicationId
    );

    // Add application to agency's sentApplicationsToUniversities
    agency.sentAppliactionsToUniversities.push(applicationId);

    // Save updated agency
    await agency.save();

    return res.status(200).json({
      message: 'Application successfully sent to the university.',
      application: {
        id: application._id,
        status: application.status,
        submissionDate: application.submissionDate,
        university: universityId,
        course: application.course,
      },
    });
  } catch (error) {
    console.error('Error sending application to university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

