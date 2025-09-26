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

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }
    if (String(application.agency) !== String(agency._id)) {
      return res.status(403).json({ success: false, message: "Not your agency application" });
    }

    // Remove from agency queue
    agency.visaRequests = agency.visaRequests.filter(id => String(id) !== String(application._id));
    await agency.save();

    // Pull from solicitors' queues + push to rejectRequests
    await Solicitor.updateMany(
      { $or: [{ visaRequests: application._id }, { assignedSolicitorRequests: application._id }] },
      { 
        $pull: { visaRequests: application._id, assignedSolicitorRequests: application._id },
        $addToSet: { rejectRequests: application._id }
      }
    );

    application.visaApproved = false;
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


// helper: flatten populated arrays from multiple solicitors and dedupe by app id
function flattenAndDedupeApplications(arrays) {
  const map = new Map();
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const app of arr) {
      if (!app || !app._id) continue;
      const id = String(app._id);
      if (!map.has(id)) map.set(id, app);
    }
  }
  return Array.from(map.values());
}

exports.getAllVisaRequestsForAgency = async (req, res) => {
  try {
    const agencyId = req.user.id;
    const status = (req.query.status || '').toLowerCase();

    // make sure agency exists
    const agency = await Agency.findById(agencyId).populate({
      path: 'visaRequests',
      populate: [
        { path: 'student', select: 'firstName lastName email' },
        { path: 'assignedSolicitor', select: 'firstName lastName email' },
        { path: 'university', select: 'name' },
        { path: 'course', select: 'name' },
      ],
    });

    if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

    // fetch solicitors that belong to this agency and populate their accepted/rejected lists
    const solicitors = await Solicitor.find({ agency: agencyId }).populate([
      {
        path: 'approvedvisaRequests',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'assignedSolicitor', select: 'firstName lastName email' },
          { path: 'university', select: 'name' },
          { path: 'course', select: 'name' },
        ],
      },
      {
        path: 'rejectRequests',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'assignedSolicitor', select: 'firstName lastName email' },
          { path: 'university', select: 'name' },
          { path: 'course', select: 'name' },
        ],
      },
    ]);

    // aggregate accepted & rejected across solicitors (deduped)
    const accepted = flattenAndDedupeApplications(solicitors.map(s => s.approvedvisaRequests));
    const rejected = flattenAndDedupeApplications(solicitors.map(s => s.rejectRequests));
    const pending = Array.isArray(agency.visaRequests) ? agency.visaRequests : [];

    // if a specific status requested, return only that section
    if (status) {
      if (status === 'pending') {
        return res.json({ success: true, count: pending.length, data: pending });
      }
      if (status === 'accepted') {
        return res.json({ success: true, count: accepted.length, data: accepted });
      }
      if (status === 'rejected') {
        return res.json({ success: true, count: rejected.length, data: rejected });
      }
      return res.status(400).json({ success: false, message: 'Invalid status filter. Use pending|accepted|rejected' });
    }

    // default: return grouped
    return res.json({
      success: true,
      counts: { pending: pending.length, accepted: accepted.length, rejected: rejected.length },
      data: { pending, accepted, rejected },
    });
  } catch (err) {
    console.error('Error fetching agency visa requests:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};


exports.getVisaRequestByIdForAgency = async (req, res) => {
  try {
    const agencyId = req.user.id; // logged-in agency ID
    const { id: applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    // Find solicitors under this agency and search across their arrays
    const solicitors = await Solicitor.find({ agency: agencyId })
      .populate({
        path: "visaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      })
      .populate({
        path: "approvedvisaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      })
      .populate({
        path: "rejectRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!solicitors || solicitors.length === 0) {
      return res.status(404).json({ success: false, message: "No solicitors found for this agency" });
    }

    let foundRequest = null;
    let status = null;
    let foundSolicitor = null;

    for (const solicitor of solicitors) {
      if (solicitor.visaRequests.length > 0) {
        foundRequest = solicitor.visaRequests[0];
        status = "pending";
        foundSolicitor = solicitor;
        break;
      }
      if (solicitor.approvedvisaRequests.length > 0) {
        foundRequest = solicitor.approvedvisaRequests[0];
        status = "approved";
        foundSolicitor = solicitor;
        break;
      }
      if (solicitor.rejectRequests.length > 0) {
        foundRequest = solicitor.rejectRequests[0];
        status = "rejected";
        foundSolicitor = solicitor;
        break;
      }
    }

    if (!foundRequest) {
      return res.status(404).json({ success: false, message: "Visa Request not found" });
    }

    // Attach solicitor info manually
    const response = {
      ...foundRequest.toObject(),
      solicitor: {
        id: foundSolicitor._id,
        firstName: foundSolicitor.firstName,
        lastName: foundSolicitor.lastName,
        email: foundSolicitor.email,
        phoneNumber: foundSolicitor.phoneNumber,
      },
      status
    };

    res.status(200).json({ success: true, data: response });

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

 // Remove from solicitor queues + push to rejectRequests
    await Solicitor.updateMany(
      { $or: [{ visaRequests: application._id }, { assignedSolicitorRequests: application._id }] },
      { 
        $pull: { visaRequests: application._id, assignedSolicitorRequests: application._id },
        $addToSet: { rejectRequests: application._id }
      }
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


exports.getAllVisaRequestsForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const status = (req.query.status || '').toLowerCase();

    const solicitor = await Solicitor.findById(solicitorId).populate([
      {
        path: 'visaRequests',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'agency', select: 'name email' },
          { path: 'university', select: 'name' },
          { path: 'course', select: 'name' },
        ],
      },
      {
        path: 'approvedvisaRequests',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'agency', select: 'name email' },
          { path: 'university', select: 'name' },
          { path: 'course', select: 'name' },
        ],
      },
      {
        path: 'rejectRequests',
        populate: [
          { path: 'student', select: 'firstName lastName email' },
          { path: 'agency', select: 'name email' },
          { path: 'university', select: 'name' },
          { path: 'course', select: 'name' },
        ],
      },
    ]);

    if (!solicitor) return res.status(404).json({ success: false, message: 'Solicitor not found' });

    const pending = Array.isArray(solicitor.visaRequests) ? solicitor.visaRequests : [];
    const accepted = Array.isArray(solicitor.approvedvisaRequests) ? solicitor.approvedvisaRequests : [];
    const rejected = Array.isArray(solicitor.rejectRequests) ? solicitor.rejectRequests : [];

    if (status) {
      if (status === 'pending') return res.json({ success: true, count: pending.length, data: pending });
      if (status === 'accepted') return res.json({ success: true, count: accepted.length, data: accepted });
      if (status === 'rejected') return res.json({ success: true, count: rejected.length, data: rejected });
      return res.status(400).json({ success: false, message: 'Invalid status filter. Use pending|accepted|rejected' });
    }

    return res.json({
      success: true,
      counts: { pending: pending.length, accepted: accepted.length, rejected: rejected.length },
      data: { pending, accepted, rejected },
    });
  } catch (err) {
    console.error('Error fetching solicitor visa requests:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};



exports.getVisaRequestByIdForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { id: applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    // Find solicitor and check across all three arrays
    const solicitor = await Solicitor.findById(solicitorId)
      .populate({
        path: "visaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      })
      .populate({
        path: "approvedvisaRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      })
      .populate({
        path: "rejectRequests",
        match: { _id: applicationId },
        populate: [
          { path: "student", select: "firstName lastName email countryCode telephoneNumber" },
          { path: "agency", select: "name email" },
          { path: "university", select: "name" },
          { path: "course", select: "name" }
        ]
      });

    if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }

    // Merge results (check across pending, approved, rejected)
    const allRequests = [
      ...solicitor.visaRequests,
      ...solicitor.approvedvisaRequests,
      ...solicitor.rejectRequests
    ];

    if (allRequests.length === 0) {
      return res.status(404).json({ success: false, message: "Visa Request not found" });
    }

    // Return the single found request
    res.status(200).json({ success: true, data: allRequests[0] });

  } catch (error) {
    console.error("Error fetching visa request by ID (solicitor):", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
