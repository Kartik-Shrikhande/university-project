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

//application 

//see pending applications //get

//assign agent 

//agent will move forward the application to university

exports.getPendingApplications = async (req, res) => {
  try {
    // Fetch the default agency
    const agency = await Agency.findOne(); // Assuming there is only one agency

    if (!agency) {
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Check if there are any pending applications
    if (!agency.pendingApplications || agency.pendingApplications.length === 0) {
      return res.status(404).json({ message: 'No pending applications found for the default agency.' });
    }

    // Populate pending applications
    await agency.populate({
      path: 'pendingApplications',
      select: 'student university course status submissionDate',
      populate: [
        { path: 'student', select: 'firstName lastName email' },
        { path: 'university', select: 'name country' },
        { path: 'course', select: 'name fees' },
      ],
    });

    // Prepare the response data
    const pendingApplications = agency.pendingApplications.map((app) => ({
      applicationId: app._id,
      student: app.student
        ? { name: `${app.student.firstName} ${app.student.lastName}`, email: app.student.email }
        : 'Unknown',
      university: app.university ? app.university.name : 'Unknown',
      course: app.course ? app.course.name : 'Unknown',
      status: app.status,
      submissionDate: app.submissionDate,
    }));

    return res.status(200).json({
      message: 'Successfully fetched pending applications.',
      total :pendingApplications.length,
      agency: {
        id: agency._id,
        name: agency.name,
      },
      pendingApplications,
    });
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




//send selected applicaiton to university
 //this api remaaninig:-
 //(before this agent shoul able to see the pending ag=siigned applicaiton to him // so assign agent is next api in line)
 // 1) it should check if first agent is assigned or not 
 //  1)api should only ht by agent 
// 3) move this api to agent controller

exports.sendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId } = req.body; // No need to pass agencyId as it's always the default agency.

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findOne({ _id: '677f6b7c701bc85481046b64' });
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the agency has any pending applications
    if (!defaultAgency.pendingApplications.length) {
      return res.status(404).json({ message: 'No pending applications found for the agency.' });
    }

    // Check if the application exists in agency's pendingApplications
    const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
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
    defaultAgency.pendingApplications = defaultAgency.pendingApplications.filter(
      (id) => id.toString() !== applicationId
    );

    // Add application to agency's sentApplicationsToUniversities
    defaultAgency.sentAppliactionsToUniversities.push(applicationId);

    // Save updated agency
    await defaultAgency.save();

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


