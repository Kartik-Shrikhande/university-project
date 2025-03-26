const Agency = require('../models/agencyModel');
const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const { uploadFilesToS3 } = require('../utils/s3Upload'); 
const Students = require('../models/studentsModel');
const University = require('../models/universityModel');
const Agent = require('../models/agentModel');
const bcrypt = require('bcrypt');
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const Course = require('../models/coursesModel');
const university = require('../models/universityModel');
//associate APIs
const AssociateSolicitor = require('../models/associateModel');
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');

const { isValidObjectId } = require('mongoose');
require('dotenv').config()


//STUDENT

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Students.find()
      .select('firstName middleName lastName email countryCode telephoneNumber documentType countryApplyingFrom preferredUniversity courseStartTimeline mostRecentEducation') // Select fields to be shown
      .populate('agency', 'name') // Assuming you want to populate agency name
      .populate('assignedAgent', 'name'); // Assuming you want to populate assigned agent name

    return res.status(200).json({
      totalStudents: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Students.findById(id)
      .select('firstName middleName lastName email telephoneNumber presentAddress permanentAddress documentType documentUpload mostRecentEducation collegeUniversity programType discipline countryName preferredUniversity courseStartTimeline englishLanguageRequirement score') // Selected fields
      .populate('agency', 'name contactEmail') // Populate agency name and email
      .populate('assignedAgent', 'name') // Populate assigned agent name
      .populate('applications.applicationId'); // Populate application details

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



//COURSES 

// Get all courses for a specific university
exports.getAllUniversityCoursesforAgency = async (req, res) => {
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
    return res.status(200).json({university_name:finduniversity.name,total: courses.length,coursesList: courses});
  } 
  catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all courses 
 exports.getallCoursesWithFiltersforAgency = async (req, res) => {
   try {
     const { 
       minPrice, 
       maxPrice, 
       country, 
       courseName, 
       universityName, 
       courseType, 
       minDuration, 
       maxDuration, 
       expiryDate 
     } = req.query;
 
     // Build the filter object dynamically
     const filter = {
      //  status: 'Active', // Show only active courses
      //  isDeleted: false, // Exclude soft-deleted courses
     };
 
     // Validate and apply price filters
     if (minPrice || maxPrice) {
       const min = Number(minPrice);
       const max = Number(maxPrice);
 
       if (minPrice && isNaN(min)) {
         return res.status(400).json({ message: 'minPrice must be a valid number.' });
       }
       if (maxPrice && isNaN(max)) {
         return res.status(400).json({ message: 'maxPrice must be a valid number.' });
       }
       if ((minPrice && min < 0) || (maxPrice && max < 0)) {
         return res.status(400).json({ message: 'Price values cannot be negative.' });
       }
       if (minPrice && maxPrice && min > max) {
         return res.status(400).json({ message: 'Invalid price range. minPrice cannot be greater than maxPrice.' });
       }
 
       filter.fees = {};
       if (minPrice) filter.fees.$gte = min;
       if (maxPrice) filter.fees.$lte = max;
     }
 
     // Fetch universities matching country filter
     if (country) {
       const universitiesInCountry = await University.find({
         'address.country': new RegExp(country, 'i'),
         isDeleted: false, // Exclude deleted universities
       }).select('_id');
 
       if (!universitiesInCountry.length) {
         return res.status(404).json({ message: 'No universities found in the specified country.' });
       }
 
       filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
     }
 
     // Fetch universities matching university name filter
     if (universityName) {
       const universitiesWithName = await University.find({
         name: new RegExp(universityName, 'i'),
         isDeleted: false, // Exclude deleted universities
       }).select('_id');
 
       if (!universitiesWithName.length) {
         return res.status(404).json({ message: 'No universities found with the specified name.' });
       }
 
       // If both country and university name are provided, filter matching both
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
     }
 
     // Apply course name filter
     if (courseName) {
       filter.name = new RegExp(courseName, 'i'); // Case-insensitive search
     }
 
     // **New: Apply Course Type filter**
     if (courseType) {
       filter.courseType = new RegExp(courseType, 'i'); // Case-insensitive match
     }
 
     // **New: Apply Course Duration filter**
     if (minDuration || maxDuration) {
       const minDur = Number(minDuration);
       const maxDur = Number(maxDuration);
 
       if (minDuration && isNaN(minDur)) {
         return res.status(400).json({ message: 'minDuration must be a valid number.' });
       }
       if (maxDuration && isNaN(maxDur)) {
         return res.status(400).json({ message: 'maxDuration must be a valid number.' });
       }
       if ((minDuration && minDur < 0) || (maxDuration && maxDur < 0)) {
         return res.status(400).json({ message: 'Duration values cannot be negative.' });
       }
       if (minDuration && maxDuration && minDur > maxDur) {
         return res.status(400).json({ message: 'Invalid duration range. minDuration cannot be greater than maxDuration.' });
       }
 
       filter.courseDuration = {};
       if (minDuration) filter.courseDuration.$gte = minDur;
       if (maxDuration) filter.courseDuration.$lte = maxDur;
     }
 
     // **New: Apply Expiry Date filter**
     if (expiryDate) {
       const parsedExpiryDate = new Date(expiryDate);
       if (isNaN(parsedExpiryDate.getTime())) {
         return res.status(400).json({ message: 'Invalid expiry date format. Use YYYY-MM-DD.' });
       }
       filter.expiryDate = { $gte: parsedExpiryDate }; // Show courses that expire on or after the given date
     }
 
     // Fetch the filtered courses
     const courses = await Course.find(filter)
       .populate({
         path: 'university',
         select: 'name address.country', // Include university details
       })
       .sort({ applicationDate: -1 }); // Sort by latest application date
 
     if (!courses.length) {
       return res.status(404).json({ message: 'No active courses found matching the criteria.' });
     }
 
     // Send response
     return res.status(200).json({ total: courses.length, coursesList: courses });
   } catch (error) {
     console.error('Error fetching courses with filters:', error);
     return res.status(500).json({ message: 'Internal server error.' });
   }
 };

// Get course by id
exports.getCourseByIdforAgency = async (req, res) => {
  try {
    const { courseId } = req.params;
 
    if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
    // Fetch the course and its associated university
    const course = await Course.findOne({ _id: courseId }).populate('university', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }


    return res.status(200).json({ Course_Details:course });
  } 
  catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




// Promote a university
exports.promoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

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
      message: `University "${university.name}" has been promoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.demoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

    // Find the university by ID
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'NO') {
      return res.status(400).json({
        message: `University "${university.name}" is already demoted.`,
      });
    }

    // Update the `isPromoted` field
    university.isPromoted = 'NO';
    await university.save();

    return res.status(200).json({
      message: `University "${university.name}" has been demoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



//AGENCY APIs
exports.createAgency = async (req, res) => {
  try {
    const { name, email, password, contactPhone, address } = req.body;

    // Check for duplicate email
    const existingAgency = await Agency.findOne({ email });
    if (existingAgency) {
      return res.status(400).json({ error: 'Agency with this email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new agency
    const newAgency = new Agency({
      name,
      email,
      password: hashedPassword,
      contactPhone,
      address,
    });

    const savedAgency = await newAgency.save();
    return res.status(201).json({ message: 'Agency created successfully.', data: savedAgency });
  } catch (error) {
    console.error('Error creating agency:', error);
    return res.status(500).json({ error: 'Error creating agency.' });
  }
};


exports.loginAgency = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find agency by email
    const agency = await Agency.findOne({ email });
    if (!agency) {
      return res.status(404).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, agency.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    return res.status(200).json({ message: 'Login successful.', agencyId: agency._id });
  } 
  catch (error) {
    console.error('Error logging in agency:', error);
    return res.status(500).json({ error: 'Error logging in agency.' });
  }
};


exports.getAgencyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Fetch the agency details
    const agency = await Agency.findById(id).populate('agents', 'name email');

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({
      message: 'Agency fetched successfully.',
      data: agency,
    });
  } catch (error) {
    console.error('Error fetching agency by ID:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};


// Update Agency by ID
exports.updateAgencyById = async (req, res) => {
  try {
    const { name, email, contactPhone, address } = req.body;

    // Update agency by ID
    const updatedAgency = await Agency.findByIdAndUpdate(
      req.params.id,
      { name, email, contactPhone, address },
      { new: true }
    );

    if (!updatedAgency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({ message: 'Agency updated successfully.', data: updatedAgency });
  } catch (error) {
    console.error('Error updating agency:', error);
    return res.status(500).json({ error: 'Error updating agency.' });
  }
};


exports.deleteAgencyById = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Find the agency
    const agency = await Agency.findById(id).session(session);
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    // Handle associated agents (if any)
    if (agency.agents && agency.agents.length > 0) {
      await Agent.updateMany(
        { _id: { $in: agency.agents } },
        { $unset: { agency: "" } }, // Unlink agents from this agency
        { session }
      );
    }

    // Delete the agency
    await Agency.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Agency deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting agency:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};



//done session

// AGENT APIS FOR AGENCY

exports.createAgent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email
    const existingAgent = await Agent.findOne({ email }).session(session);
    if (existingAgent) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
    if (!defaultAgency) {
      return res.status(500).json({ message: 'Default agency not found.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new agent
    const newAgent = new Agent({
      name,
      email,
      password: hashedPassword,
      agency: defaultAgency._id,
    });

    await newAgent.save({ session });

    // Add the new agent to the agency's `agents` array
    defaultAgency.agents.push(newAgent._id);
    await defaultAgency.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Agent created successfully',
      agent: newAgent,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating agent:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find().select('name assignedStudents ')
      // .populate('agency', 'name contactEmail')
      // .populate('assignedStudents', 'name email');

    return res.status(200).json({
      totalAgents: agents.length,
      data: agents,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAgentById = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id)
      .populate('agency', 'name contactEmail')
      .populate('assignedStudents', 'name email');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.status(200).json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update an agent
exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedAgent = await Agent.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.status(200).json({
      message: 'Agent updated successfully',
      agent: updatedAgent,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Soft Delete an Agent
exports.deleteAgent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid agent ID.' });
    }

    // Fetch the agent
    const agent = await Agent.findById(id).session(session);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Check if the agent is already marked as deleted
    if (agent.isDeleted) {
      return res.status(400).json({ message: 'Agent is already deleted.' });
    }

    // Mark the agent as deleted
    agent.isDeleted = true;
    await agent.save({ session });

    // Optionally remove the agent from the agency's agent list
    const associatedAgency = await Agency.findById(agent.agency).session(session);
    if (associatedAgency) {
      associatedAgency.agents = associatedAgency.agents.filter(
        (agentId) => agentId.toString() !== id
      );
      await associatedAgency.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Agent deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting agent:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


//done session  




//Application 

//see pending applications //get
exports.getPendingApplications = async (req, res) => {
  try {
    const defaultAgencyId =process.env.DEFAULT_AGENCY_ID
    // Validate DEFAULT_AGENCY_ID
    if (!mongoose.Types.ObjectId.isValid(defaultAgencyId)) {
      console.error('Invalid agency ID in environment variable:', defaultAgencyId);
      return res.status(400).json({ message: 'Invalid agency ID in environment variable.' });
    }

  
    // Fetch the default agency
    const agency = await Agency.findById(new mongoose.Types.ObjectId(defaultAgencyId));
    if (!agency) {
      console.error('Agency not found in database:', defaultAgencyId);
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Check if there are any pending applications
    if (!agency.pendingApplications || agency.pendingApplications.length === 0) {
      return res.status(404).json({ message: 'No pending applications found in agency.' });
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
      total: pendingApplications.length,
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

// get the deatils of pending applications 

exports.getApplicationDetailsById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Validate `applicationId`
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pending or sent applications
    const isPending = defaultAgency.pendingApplications.includes(applicationId);
    const isSent = defaultAgency.sentAppliactionsToUniversities.includes(applicationId);

    if (!isPending && !isSent) {
      return res.status(404).json({
        message: 'Application not found in agency\'s records.',
      });
    }

    // Fetch the application with populated fields
    const application = await Application.findById(applicationId)
      .populate('student', 'firstName lastName email')
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Prepare the response
    const response = {
      applicationId: application._id,
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      documents: application.documents || [],
      financialAid: application.financialAid,
      student: application.student
        ? {
            name: `${application.student.firstName} ${application.student.lastName}`,
            email: application.student.email,
          }
        : 'Unknown',
      university: application.university
        ? {
            name: application.university.name,
            country: application.university.country,
          }
        : 'Unknown',
      course: application.course
        ? {
            name: application.course.name,
            fees: application.course.fees,
          }
        : 'Unknown',
      assignedAgent: application.assignedAgent
        ? { name: application.assignedAgent.name, email: application.assignedAgent.email }
        : 'Not assigned',
    };

    return res.status(200).json({
      message: 'Application details fetched successfully.',
      application: response,
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

//agent will move forward the application to university
exports.assignAgentToApplication = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { applicationId, agentId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid ApplicationId ID provided.' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid AgentId provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pendingApplications
    const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
    if (!isPendingInAgency) {
      return res.status(404).json({
        message: 'Application not found in the agency\'s pending applications.',
      });
    }

    // Fetch the application
    const application = await Application.findById(applicationId).session(session);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Fetch the agent
    const agent = await Agent.findById(agentId).session(session);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Check if the agent belongs to the default agency
    if (agent.agency.toString() !== defaultAgency._id.toString()) {
      return res.status(400).json({ message: 'Agent does not belong to the default agency.' });
    }

    // Assign the agent to the application
    application.assignedAgent.push(agent._id);
    await application.save({ session });

    // Add the application to the agent's assigned students
    agent.assignedStudents.push(application.student);
    await agent.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Agent successfully assigned to the application.',
      application: {
        id: application._id,
        assignedAgent: application.assignedAgent,
        status: application.status,
        university: application.university,
        course: application.course,
      },
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();
    console.error('Error assigning agent to application:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.sendApplicationToUniversity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { applicationId } = req.body;
    const agentId = req.user.id; // Retrieved from the authentication middleware

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }


    // Check if the application exists in agency's pendingApplications
    const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
    if (!isPendingInAgency) {
      return res.status(404).json({
        message: 'Application not found in agency\'s pending applications.',
      });
    }

    // Fetch application
    const application = await Application.findById(applicationId).session(session);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Automatically fetch the university from the application
    const universityId = application.university;

    // Fetch university
    const university = await University.findById(universityId).session(session);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Add application to university's pending applications
    university.pendingApplications.push({
      student: application.student,
      applicationId: application._id,
    });

    // Save updated university
    await university.save({ session });

    // Remove application from agency's pendingApplications
    defaultAgency.pendingApplications = defaultAgency.pendingApplications.filter(
      (id) => id.toString() !== applicationId
    );

    // Add application to agency's sentApplicationsToUniversities
    defaultAgency.sentAppliactionsToUniversities.push(applicationId);

    // Save updated agency
    await defaultAgency.save({ session });

    await session.commitTransaction();
    session.endSession();

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
    await session.abortTransaction();
    session.endSession();
    console.error('Error sending application to university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




//university 

exports.createUniversity = async (req, res) => {
  try {
    const {
      name,
      email,
      description,
      website,
      phoneNumber,
      address,
      institutionType,
      ratings,
    } = req.body;

    // Check if the email is already in use
    const existingUniversity = await University.findOne({ email });
    if (existingUniversity) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Auto-generate a password
    const password = generator.generate({
      length: 10, // Password length
      numbers: true, // Include numbers
      symbols: true, // Include symbols
      uppercase: true, // Include uppercase letters
      excludeSimilarCharacters: true, // Exclude similar characters like 'i' and 'l'
    });

    // Hash the auto-generated password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle Image Upload (if provided)
    let bannerImage = null;
    if (req.file) {
      const uploadedFiles = await uploadFilesToS3([req.file]); // Upload file to S3
      bannerImage = uploadedFiles[0]; // Get the S3 URL
    }

    // Create a new university instance
    const newUniversity = new University({
      name,
      email,
      password: hashedPassword,  //hashedPassword,
      description,
      bannerImage, // Save the uploaded image URL
      website,
      phoneNumber,
      address: {
        country: address.country,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      },
      institutionType,
      isPromoted: req.body.isPromoted || 'NO', // Default to 'NO' if not provided
      ratings: ratings || [], // Default to an empty array if not provided
    });

    // Save the new university to the database
    await newUniversity.save();

// Send OTP email
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


//LINK 
const mailOptions = {
from: process.env.EMAIL_USER,
to: email,
subject: 'Credentials for University Account',
text: `Your account has been created.\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.`,
};

await transporter.sendMail(mailOptions);



    // Return the response with the auto-generated password (for testing purposes)
    return res.status(201).json({
      message: 'University created successfully.',
      university: {
        id: newUniversity._id,
        name: newUniversity.name,
        email: newUniversity.email,
        website: newUniversity.website,
        phoneNumber: newUniversity.phoneNumber,
        address: newUniversity.address,
        institutionType: newUniversity.institutionType,
        role: newUniversity.role,
        isPromoted: newUniversity.isPromoted,
        ratings: newUniversity.ratings,
        bannerImage: newUniversity.bannerImage,
      },
      autoGeneratedPassword: hashedPassword, // Return the auto-generated password (optional)
    });
  } catch (error) {
    console.error('Error creating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get All Universities
exports.getUniversities = async (req, res) => {
  try {
    // const studentId = req.user.id;
    // const student = await Students.findById(studentId).session(session);
    // if (!student) {
    //   return res.status(404).json({ message: 'Student not found from.' });
    // }
    const universities = await University.find().sort({ isPromoted: -1});
    if (universities.length === 0) {
      return res.status(404).json({ message: 'No universities found.' });
    }
    return res.status(200).json({ Total: universities.length, universities });
  } catch (error) {
    console.error('Error fetching universities:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get University by ID (For Agency/Admin)
exports.getUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find university by ID
    const university = await University.findById(id);
    
    // Check if university exists
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ university });
  } catch (error) {
    console.error('Error fetching university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// ASSOCIATES 


// // Function to encrypt bank details
// function encryptData(data) {
//   const algorithm = "aes-256-cbc";
//   const key = process.env.ENCRYPTION_KEY || "default_key_32chars_long"; // Store securely in env variables
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
//   let encrypted = cipher.update(data);
//   encrypted = Buffer.concat([encrypted, cipher.final()]);
//   return iv.toString("hex") + ":" + encrypted.toString("hex");
// }




// **CREATE Associate Solicitor**


exports.createAssociate = async (req, res) => {
  try {
    const {
      nameOfAssociate,
      email,
      phoneNumber,
      address,
      bankDetails,
    } = req.body;

    // Check if the email is already in use
    const existingAssociate = await AssociateSolicitor.findOne({ email });
    if (existingAssociate) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    // **Auto-generate a password**
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
    });

    // **Hash the generated password**
    const hashedPassword = await bcrypt.hash(password, 10);

    // **Encrypt the bank account number**
    bankDetails.accountNumber = encryptData(bankDetails.accountNumber);

    // Create a new Associate Solicitor
    const newAssociate = new AssociateSolicitor({
      nameOfAssociate,
      email,
      password: hashedPassword, // Store hashed password
      phoneNumber,
      address,
      bankDetails,
    });

    // Save the associate to the database
    await newAssociate.save();

    // **Send credentials via email**
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Associate Solicitor Account Credentials",
      text: `Your account has been successfully created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately.`,
    };

    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(201).json({
      success: true,
      message:
        "Associate Solicitor created successfully. Check your email for credentials.",
      // data: {
      //   id: newAssociate._id,
      //   nameOfAssociate: newAssociate.nameOfAssociate,
      //   email: newAssociate.email,
      //   phoneNumber: newAssociate.phoneNumber,
      //   address: newAssociate.address,
      //   bankDetails: {
      //     bankName: bankDetails.bankName,
      //     accountHolderName: bankDetails.accountHolderName,
      //   }, // Exclude sensitive info
      // },
    });
  } catch (error) {
    console.error("Error creating associate:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// **GET ALL Associates (with optional soft-delete filter)**
exports.getAllAssociates = async (req, res) => {
  try {

    const associates = await AssociateSolicitor.find().select('_id email firstName lastName isDeleted');

    if (associates.length === 0) {
      return res.status(404).json({ success: false, message: "No associates found" });
    }

     return  res.status(200).json({ success: true,total:associates.length, data: associates });
  } 
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// **GET Associate By ID**
exports.getAssociateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    const associate = await AssociateSolicitor.findById(id);

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    // Decrypt bank details before sending response
    if (associate.bankDetails && associate.bankDetails.accountNumber) {
      associate.bankDetails.accountNumber = decryptData(associate.bankDetails.accountNumber);
    }

    res.status(200).json({ success: true, data: associate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// **UPDATE Associate**
exports.updateAssociate = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Check if the Associate exists and is not soft deleted
    const existingAssociate = await AssociateSolicitor.findById(id);
    if (!existingAssociate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    if (existingAssociate.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot update a deleted Associate Solicitor" });
    }

    // Prevent email and password updates
    if (updates.email || updates.password) {
      return res.status(400).json({ success: false, message: "Email and password cannot be updated" });
    }

    // Encrypt account number if provided
    if (updates.bankDetails?.accountNumber) {
      updates.bankDetails.accountNumber = encryptData(updates.bankDetails.accountNumber);
    }

    // Merge updates while preserving existing nested objects
    const updatedData = {
      ...existingAssociate.toObject(),
      ...updates,
      bankDetails: {
        ...existingAssociate.bankDetails,
        ...updates.bankDetails,
      },
      address: {
        ...existingAssociate.address,
        ...updates.address,
      },
    };

    // Update Associate
    const updatedAssociate = await AssociateSolicitor.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({
      success: true,
      message: "Associate Solicitor updated successfully",
      data: updatedAssociate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// **SOFT DELETE Associate**
exports.deleteAssociate = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Find the associate
    const associate = await AssociateSolicitor.findById(id);

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    // Check if the associate is already deleted
    if (associate.isDeleted) {
      return res.status(400).json({ success: false, message: "Associate Solicitor is already deleted" });
    }

    // Soft delete the associate
    associate.isDeleted = true;
    await associate.save();

    res.status(200).json({ success: true, message: "Associate Solicitor deleted successfully", data: associate.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

