const multer = require('multer');
const Application = require('../models/applicationModel');
const Agency = require('../models/agencyModel');
const Solicitor = require('../models/solicitorModel');
const Notification = require('../models/notificationModel');
const Student = require('../models/studentsModel');
const mongoose = require('mongoose');

const emailService = require('../services/emailService');
const { sendNotification } = require('../services/socketNotification'); // ✅ using your socket notification service

// Multer for PDF upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDFs allowed'));
    cb(null, true);
  },
});

// Replace with your S3 upload helper
async function uploadFileToStorage(fileBuffer, originalName, mimeType) {
  throw new Error('uploadFileToStorage not implemented — replace with your S3 upload helper');
}

/**
 * 1️⃣ Student creates visa request
 */
exports.createVisaRequest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const studentId = req.user.id;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: "applicationId required" });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid applicationId format" });
    }

    const application = await Application.findById(applicationId)
      .populate("agency", "name visaRequests")
      .populate("assignedSolicitor", "name visaRequests")
      .populate("university", "name")
      .populate("course", "name")
      .populate("student", "firstName email");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (String(application.student._id) !== String(studentId)) {
      return res.status(403).json({ success: false, message: "Not your application" });
    }

    const agency = application.agency ? await Agency.findById(application.agency._id) : null;
    const solicitor = application.assignedSolicitor
      ? await Solicitor.findById(application.assignedSolicitor._id)
      : null;

    // 🚫 Check if request already exists
    if (agency && agency.visaRequests.includes(application._id)) {
      return res.status(400).json({ success: false, message: "Visa request already created for this application" });
    }

    if (solicitor && solicitor.visaRequests.includes(application._id)) {
      return res.status(400).json({ success: false, message: "Visa request already created for this application" });
    }

    // ✅ Add to agency
    if (agency) {
      agency.visaRequests.push(application._id);
      await agency.save();
    }

    // ✅ Add to solicitor
    if (solicitor) {
      solicitor.visaRequests.push(application._id);
      await solicitor.save();
    }

    // ✅ Update application
    application.notes = (application.notes || "") + " | Visa request created by student.";
    await application.save();

    const student = application.student;

    // ✅ Email student
    if (student?.email) {
      await emailService
        .sendVisaRequestCreatedEmail(student, application)
        .catch(() => {});
    }

    // ✅ Notifications
    const notificationMessage = `Visa request created for ${application.course?.name || "a course"} at ${application.university?.name || "a university"}.`;

    // Student
    const studentNotification = await Notification.create({
      user: student._id,
      message: notificationMessage,
      type: "Application",
      additionalData: { applicationId },
    });
    sendNotification(student._id.toString(), studentNotification.message, "visa_request_created");

    // Agency
    if (agency) {
      const agencyNotification = await Notification.create({
        user: agency._id,
        message: `A student created a visa request for ${application.course?.name || "a course"} at ${application.university?.name || "a university"}.`,
        type: "Application",
        additionalData: { applicationId },
      });
      sendNotification(agency._id.toString(), agencyNotification.message, "visa_request_created");
    }

    // Solicitor
    if (solicitor) {
      const solicitorNotification = await Notification.create({
        user: solicitor._id,
        message: `A new visa request was created for ${application.course?.name || "a course"} at ${application.university?.name || "a university"}.`,
        type: "Application",
        additionalData: { applicationId },
      });
      sendNotification(solicitor._id.toString(), solicitorNotification.message, "visa_request_created");
    }

    return res.json({ success: true, message: "Visa request created" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


/**
 * 2️⃣ Agency accepts solicitor request
 */
exports.agencyAcceptVisaRequest = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const agencyId = req.user.id;
      const { solicitorId, details } = req.body;
      const file = req.file;

      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ success: false, message: "Invalid application ID" });
      }
   if (!mongoose.Types.ObjectId.isValid(solicitorId)) {
        return res.status(400).json({ success: false, message: "Invalid solicitor ID" });
      }
      
      const [application, agency, solicitor] = await Promise.all([
        Application.findById(applicationId)
          .populate("university", "name")
          .populate("course", "name")
          .populate("student", "firstName email"),
        Agency.findById(agencyId),
        Solicitor.findById(solicitorId),
      ]);

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!agency) {
        return res.status(404).json({ success: false, message: "Agency not found" });
      }
      if (!solicitor) {
        return res.status(404).json({ success: false, message: "Solicitor not found" });
      }

      if (String(application.agency) !== String(agency._id)) {
        return res.status(403).json({ success: false, message: "Not your agency application" });
      }

      // ✅ Assign solicitor + mark approved
      application.assignedSolicitor = solicitor._id;
      application.visaApproved = true;

      if (details) {
        application.notes = (application.notes || "") + ` | Agency details: ${details}`;
      }

      // Handle file upload
      if (file) {
        const fileUrl = await uploadFileToStorage(file.buffer, file.originalname, file.mimetype);
        application.universityDocuments.push(fileUrl);
      }
      await application.save();

      // ✅ Move from visaRequests → approvedVisaRequests
      solicitor.visaRequests = solicitor.visaRequests.filter(
        id => String(id) !== String(application._id)
      );
      if (!solicitor.approvedvisaRequests.includes(application._id)) {
        solicitor.approvedvisaRequests.push(application._id);
      }
      await solicitor.save();

      // Remove from agency queue
      agency.visaRequests = agency.visaRequests.filter(id => String(id) !== String(application._id));
      await agency.save();

      // Email student
      const student = application.student;
      if (student?.email) {
        await emailService.sendRequestAcceptedEmail(student, application, "Agency").catch(() => {});
      }

      // Notifications
      const notification = await Notification.create({
        user: student._id,
        message: `Your visa request for ${application.course?.name || "a course"} at ${application.university?.name || "a university"} has been approved by the agency.`,
        type: "Application",
        additionalData: { applicationId },
      });

      sendNotification(student._id.toString(), notification.message, "visa_request_approved");
      sendNotification(solicitor._id.toString(), "You were assigned a new visa request.", "visa_request_assigned");

      return res.json({ success: true, message: "Visa request accepted" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
];


/**
 * 4️⃣ Agency rejects solicitor request
 */
exports.agencyRejectVisaRequest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const agencyId = req.user.id;

    if (!reason) return res.status(400).json({ success: false, message: "Reason required" });
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    const [application, agency] = await Promise.all([
      Application.findById(applicationId)
        .populate("university", "name")
        .populate("course", "name")
        .populate("student", "firstName email"),
      Agency.findById(agencyId),
    ]);

    if (!application || !agency) {
      return res.status(404).json({ success: false, message: "Application or Agency not found" });
    }
    if (String(application.agency) !== String(agency._id)) {
      return res.status(403).json({ success: false, message: "Not your agency application" });
    }

    agency.visaRequests = agency.visaRequests.filter(id => String(id) !== String(application._id));
    await agency.save();

    await Solicitor.updateMany(
      { $or: [{ visaRequests: application._id }, { assignedSolicitorRequests: application._id }] },
      { $pull: { visaRequests: application._id, assignedSolicitorRequests: application._id } }
    );

    application.notes = (application.notes || "") + ` | Agency rejected: ${reason}`;
    await application.save();

    const student = application.student;
    if (student?.email) {
      await emailService.sendRequestRejectedEmail(student, application, reason, "Agency").catch(() => {});
    }

    const notification = await Notification.create({
      user: student._id,
      message: `Your visa request for ${application.course?.name || "a course"} at ${application.university?.name || "a university"} was rejected: ${reason}`,
      type: "Application",
      additionalData: { applicationId },
    });

    sendNotification(student._id.toString(), notification.message, "visa_request_rejected");

    return res.json({ success: true, message: "Visa request rejected" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};



// GET /api/agency/visa-requests
// GET /api/agency/visa-requests
exports.getAllVisaRequestsForAgency = async (req, res) => {
  try {
    const agencyId = req.user.id;

    const agency = await Agency.findById(agencyId)
      .populate({
        path: "visaRequests",
        populate: [
          { path: "student", select: "firstName lastName email" },
          { path: "assignedSolicitor", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    res.status(200).json({
      success: true,
      count: agency.visaRequests.length,
      data: agency.visaRequests,
    });
  } catch (error) {
    console.error("Error fetching agency visa requests:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};



// GET /api/agency/visa-requests/:id
// GET /api/agency/visa-requests/:id
exports.getVisaRequestByIdForAgency = async (req, res) => {
  try {
    const agencyId = req.user.id;
    const { id: applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    const agency = await Agency.findById(agencyId)
      .populate({
        path: "visaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email" },
          { path: "assignedSolicitor", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!agency || agency.visaRequests.length === 0) {
      return res.status(404).json({ success: false, message: "Visa Request not found" });
    }

    res.status(200).json({ success: true, data: agency.visaRequests[0] });
  } catch (error) {
    console.error("Error fetching visa request by ID (agency):", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};




/**
 * 4️⃣ Solicitor accepts visa request
 */
exports.solicitorAcceptVisaRequest = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const solicitorId = req.user.id;
      const { details } = req.body;
      const file = req.file;

      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ success: false, message: "Invalid application ID" });
      }

      const application = await Application.findById(applicationId)
        .populate("university", "name")
        .populate("course", "name")
        .populate("student", "firstName email");

      const solicitor = await Solicitor.findById(solicitorId);
      const agency = application?.agency ? await Agency.findById(application.agency) : null;

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

  if (!solicitor) {
        return res.status(404).json({ success: false, message: "Solicitor not found" });
      }

      if (application.assignedSolicitor && String(application.assignedSolicitor) !== String(solicitor._id)) {
        return res.status(403).json({ success: false, message: "Not your case" });
      }

      if (file) {
        const fileUrl = await uploadFileToStorage(file.buffer, file.originalname, file.mimetype);
        application.universityDocuments.push(fileUrl);
      }

      application.visaApproved = true;
      application.notes = (application.notes || "") + ` | Solicitor accepted: ${details || ""}`;
      await application.save();

      if (agency) {
        agency.visaRequests = agency.visaRequests.filter(id => String(id) !== String(application._id));
        await agency.save();
      }

      solicitor.visaRequests = solicitor.visaRequests.filter(id => String(id) !== String(application._id));
      solicitor.assignedSolicitorRequests = solicitor.assignedSolicitorRequests.filter(id => String(id) !== String(application._id));
      if (!solicitor.approvedvisaRequests.includes(application._id)) {
        solicitor.approvedvisaRequests.push(application._id);
      }
      solicitor.completedVisa = (solicitor.completedVisa || 0) + 1;
      await solicitor.save();

      const student = application.student;
      if (student?.email) {
        await emailService.sendRequestAcceptedEmail(student, application, "Solicitor").catch(() => {});
      }

      const notification = await Notification.create({
        user: student._id,
        message: `Your visa request for ${application.course?.name || "a course"} at ${application.university?.name || "a university"} has been approved.`,
        type: "Application",
        additionalData: { applicationId },
      });

      sendNotification(student._id.toString(), notification.message, "visa_request_approved");

      return res.json({ success: true, message: "Visa request accepted" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
];


/**
 * 2️⃣ Solicitor rejects visa request
 */
exports.solicitorRejectVisaRequest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const solicitorId = req.user.id;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: "Reason required" });
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    const application = await Application.findById(applicationId)
      .populate("university", "name")
      .populate("course", "name")
      .populate("student", "firstName email");

    const solicitor = await Solicitor.findById(solicitorId);
    const agency = application?.agency ? await Agency.findById(application.agency) : null;

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

      if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }
    if (application.assignedSolicitor && String(application.assignedSolicitor) !== String(solicitor._id)) {
      return res.status(403).json({ success: false, message: "Not your case" });
    }

    if (agency) {
      agency.visaRequests = agency.visaRequests.filter(id => String(id) !== String(application._id));
      await agency.save();
    }

    await Solicitor.updateMany(
      { $or: [{ visaRequests: application._id }, { assignedSolicitorRequests: application._id }] },
      { $pull: { visaRequests: application._id, assignedSolicitorRequests: application._id } }
    );

    application.visaApproved = false;
    application.notes = (application.notes || "") + ` | Solicitor rejected: ${reason}`;
    await application.save();

    const student = application.student;
    if (student?.email) {
      await emailService.sendRequestRejectedEmail(student, application, reason, "Solicitor").catch(() => {});
    }

    const notification = await Notification.create({
      user: student._id,
      message: `Your visa request for ${application.course?.name || "a course"} at ${application.university?.name || "a university"} was rejected: ${reason}`,
      type: "Application",
      additionalData: { applicationId },
    });

    sendNotification(student._id.toString(), notification.message, "visa_request_rejected");

    return res.json({ success: true, message: "Visa request rejected" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// GET /api/solicitor/visa-requests
// GET /api/solicitor/visa-requests
exports.getAllVisaRequestsForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;

    const solicitor = await Solicitor.findById(solicitorId)
      .populate({
        path: "visaRequests",
        populate: [
          { path: "student", select: "firstName lastName email" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }

    res.status(200).json({
      success: true,
      count: solicitor.visaRequests.length,
      data: solicitor.visaRequests,
    });
  } catch (error) {
    console.error("Error fetching solicitor visa requests:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};


// GET /api/solicitor/visa-requests
// GET /api/solicitor/visa-requests/:id
// GET /api/solicitor/visa-requests/:id
exports.getVisaRequestByIdForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { id: applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    const solicitor = await Solicitor.findById(solicitorId)
      .populate({
        path: "visaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!solicitor || solicitor.visaRequests.length === 0) {
      return res.status(404).json({ success: false, message: "Visa Request not found" });
    }

    res.status(200).json({ success: true, data: solicitor.visaRequests[0] });
  } catch (error) {
    console.error("Error fetching visa request by ID (solicitor):", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
