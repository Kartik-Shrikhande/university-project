const Receipt = require('../models/receiptModel');
const Application = require('../models/applicationModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');
const Student = require('../models/studentsModel');
const Course = require('../models/coursesModel');
const mongoose = require('mongoose');
const Notification = require('../models/notificationModel'); // Import Notification model
const { uploadFilesToS3 } = require('../utils/s3Upload'); // adjust path as needed
const { sendReceiptRejectedEmail,sendReceiptAcceptedEmail,sendReceiptUploadedEmailToUniversity ,
  sendReceiptUploadedEmailToAgency,sendReceiptAcceptedEmailToAgency,sendReceiptRejectedEmailToAgency

} = require('../services/emailService');
//STUDENT

exports.uploadReceipt = async (req, res) => {
  try {
    const {
      transactionId,
      paymentMethod,
      otherPaymentMethod,
      applicationsId,
      amountPaid,   
      dateofPayment,
    } = req.body;

    // Validate required fields
    if (
      !transactionId ||
      !paymentMethod ||
      !applicationsId ||
      !amountPaid ||
      !dateofPayment
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const studentId = req.user.id;

    // Ensure the file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No File uploaded." });
    }

    // Check if it's a valid Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(applicationsId)) {
      return res.status(400).json({ message: "Invalid application ID format." });
    }

    // Validate single application exists & belongs to student
    const application = await Application.findOne({
      _id: applicationsId,
      student: studentId,
    }).populate("course university agency");

    if (!application) {
      return res.status(404).json({
        message: "Application not found or does not belong to this user.",
      });
    }

    // Check application status is 'Accepted'
    if (application.status !== "Accepted") {
      return res.status(400).json({
        message: `Application is currently '${application.status}'. Payment receipt can only be uploaded for 'Accepted' applications.`,
      });
    }

    // Check for existing receipt for same university & course
    const paidToUniversity = application.university._id;
    const course = application.course._id; // Use the course ObjectId

    const existingReceipt = await Receipt.findOne({
      student: studentId,
      paidToUniversity,
      course,
    });

    if (existingReceipt) {
      return res.status(400).json({
        message: "Receipt already uploaded for this course at this university.",
      });
    }

    // Upload file to S3 (make sure your file exists)
    const [fileUrl] = await uploadFilesToS3([req.file]);

    // Save receipt
    const receipt = new Receipt({
      student: studentId,
      transactionId,
      paymentMethod,
      otherPaymentMethod: paymentMethod === "Other" ? otherPaymentMethod : null,
      paidToUniversity,
      course, // Pass the course ObjectId
      applicationsId,
      amountPaid,
      dateofPayment,
      uploadPaymentReceipt: fileUrl,
    });

    await receipt.save();

   // Fetch full student details for notification and email
   const student = await Student.findById(studentId);
   if (!student) {
     return res.status(404).json({ message: "Student not found." });
   }
    // Send email to university
    await sendReceiptUploadedEmailToUniversity(
      application.university,
      student,
      application.course.name
    );

  // 🔔 Create in-app notification for university
  const notification = new Notification({
    user: application.university._id,
    message: `New payment receipt uploaded by ${student.firstName} ${student.lastName} for course ${application.course.name}.`,
    type: "Payment" 
  });

  await notification.save();

  // Send email to agency (if present)
  if (application.agency) {
    await sendReceiptUploadedEmailToAgency(
      application.agency,
      student,
      application.university.name,
      application.course.name
    );

    // Optional: Create in-app notification for agency too
    const agencyNotification = new Notification({
      user: application.agency._id,
      message: `New payment receipt uploaded by ${student.firstName} ${student.lastName} for course ${application.course.name} at ${application.university.name}.`,
      type: "Payment",
    });
    await agencyNotification.save();
  }



    res.status(201).json({ message: "Receipt uploaded successfully.", receipt });
  } catch (error) {
    console.error("Upload Receipt Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

// Get all receipts for logged-in student with optional status filter 
exports.getAllReceiptswithFilteration= async (req, res) => {
    try {
      const studentId = req.user.id;
      const { status } = req.query;
  
      const filter = { student: studentId };
      if (status) {
        if (!["Pending", "Accepted", "Rejected"].includes(status)) {
          return res.status(400).json({
            message: "Invalid status filter. Valid values: Pending, Accepted, Rejected.",
          });
        }
        filter.status = status;
      }
  
      const receipts = await Receipt.find(filter)
        .populate("paidToUniversity", "name")
        .populate("course", "name")
        .sort({ createdAt: -1 });
  
      res.status(200).json({ total: receipts.length, receipts });
    } catch (error) {
      console.error('Error fetching student receipts:', error);
      res.status(500).json({ message: 'Something went wrong.' });
    }
  };
  
  
  exports.getReceiptById = async (req, res) => {
    try {
      const studentId = req.user.id;
    const receiptId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      student: studentId,
    })
      .populate("paidToUniversity", "name email")
      .populate("course", "name courseType courseDuration")
      .populate("applicationsId");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    res.status(200).json({ receipt });
    } catch (error) {
      console.error('Error fetching receipt by ID:', error);
      res.status(500).json({ message: 'Something went wrong.' });
    }
  };
  
  exports.updateReceipt = async (req, res) => {
    try {
      const studentId = req.user.id;
      const receiptId = req.params.id;
  
      const {
        transactionId,
        paymentMethod,
        otherPaymentMethod,
        amountPaid,
        dateofPayment,
      } = req.body;
  
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        return res.status(400).json({ message: "Invalid receipt ID format." });
      }
  
      const receipt = await Receipt.findOne({
        _id: receiptId,
        student: studentId,
      });
  
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found." });
      }
  
      if (receipt.status !== "Rejected") {
        return res.status(400).json({
          message: `Receipt is currently '${receipt.status}'. You can only update a 'Rejected' receipt.`,
        });
      }
  
      // Check if new file uploaded
      let fileUrl;
      if (req.file) {
        const [uploadedFileUrl] = await uploadFilesToS3([req.file]);
        fileUrl = uploadedFileUrl;
      }
  
      // Update fields if provided
      if (transactionId) receipt.transactionId = transactionId;
      if (paymentMethod) {
        receipt.paymentMethod = paymentMethod;
        receipt.otherPaymentMethod = paymentMethod === "Other" ? otherPaymentMethod : null;
      }
      if (amountPaid) receipt.amountPaid = amountPaid;
      if (dateofPayment) receipt.dateofPayment = dateofPayment;
      if (fileUrl) receipt.uploadPaymentReceipt = fileUrl;
  
      // Reset status & clear previous remarks when updating
      receipt.status = "Pending";
      receipt.remarks = [];
  
      await receipt.save();
  
      res.status(200).json({
        message: "Receipt updated successfully. It is now pending review.",
        receipt,
      });
    } catch (error) {
      console.error("Update Receipt Error:", error);
      res.status(500).json({ message: "Something went wrong." });
    }
  };
  


  
//UNIVERSITY 

//not checked


// // Get all student receipts for a university
exports.getAllStudentReceipts = async (req, res) => {
  try {
    const universityId = req.user.id; // from verifyToken middleware
    const { status } = req.query; // optional query param

    const query = { paidToUniversity: universityId };

    if (status) {
      if (!["Pending", "Accepted", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }
      query.status = status;
    }

    const receipts = await Receipt.find(query)
      .populate("student", "firstName lastName email")
      .populate("course", "name")
      .populate("applicationsId", "status");

    res.status(200).json({total: receipts.length, receipts });
  } catch (error) {
    console.error("Get All Receipts Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

  

// // Get single receipt by ID
exports.getstudentReceiptById = async (req, res) => {
  try {
    const universityId = req.user.id;
    const receiptId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      paidToUniversity: universityId,
    })
      .populate("student", "firstName lastName email")
      .populate("course", "name courseType courseDuration")
      .populate("applicationsId");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found or unauthorized." });
    }

    res.status(200).json({ receipt });
  } catch (error) {
    console.error("Get Receipt By ID Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};


exports.acceptReceipt = async (req, res) => {
  try {
    const universityId = req.user.id;
    const receiptId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      paidToUniversity: universityId,
    });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    if (receipt.status !== "Pending") {
      return res.status(400).json({ message: `Receipt already marked as '${receipt.status}'.` });
    }

    receipt.status = "Accepted";
    await receipt.save();

    const student = await Student.findById(receipt.student);
    const application = await Application.findById(receipt.applicationsId)
      .populate("course university agency");

    // 📧 Send acceptance email to student
    await sendReceiptAcceptedEmail(student, application);

    // 📲 Create in-app notification for student
    await new Notification({
      user: student._id,
      message: `Your payment receipt for ${application.course.name} has been accepted.`,
      type: "Payment"
    }).save();

    // 📡 Notify agency if assigned to application
    if (application.agency) {
      const agency = await Agency.findById(application.agency);

      if (agency && agency.email) {
        const message = `Payment receipt for student ${student.firstName} ${student.lastName} for ${application.course.name} has been accepted by ${application.university.name}.`;

        // 📧 Email to agency
        await sendReceiptAcceptedEmailToAgency(agency, student, application.university.name, application.course.name);

        // 📲 In-app notification for agency
        await new Notification({
          user: agency._id,
          message,
          type: "Payment"
        }).save();
      } else {
        console.log("No agency or agency email found for application.");
      }
    }

    res.status(200).json({ message: "Receipt accepted successfully.", receipt });

  } catch (error) {
    console.error("Accept Receipt Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};


// // Reject a receipt with remarks
exports.rejectReceipt = async (req, res) => {
  try {
    const universityId = req.user.id;
    const receiptId = req.params.id;
    const { remark } = req.body;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    if (!remark || remark.trim() === "") {
      return res.status(400).json({ message: "Rejection remark is required." });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      paidToUniversity: universityId,
    });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    if (receipt.status !== "Pending") {
      return res.status(400).json({ message: `Receipt already marked as '${receipt.status}'.` });
    }

    receipt.status = "Rejected";
    receipt.remarks.push(remark);
    await receipt.save();


    const student = await Student.findById(receipt.student);
    const application = await Application.findById(receipt.applicationsId).populate("course university");

    // 📧 Send Email
    await sendReceiptRejectedEmail(student, application, remark);

    // 📲 Create In-App Notification
    await new Notification({
      user: student._id,
      message: `Your payment receipt for ${application.course.name} was rejected. Remark: ${remark}`,
      type: "Payment"
    }).save();

  // 📡 Notify Agency
  const agency = await Agency.findOne();  // assuming one agency
  if (agency) {
    const message = `Payment receipt for student ${student.firstName} ${student.lastName} for ${application.course.name} has been rejected by ${application.university.name}. Reason: ${remark}`;

    // 📧 Email to agency
    await sendReceiptRejectedEmailToAgency(agency, message);

    // 📲 In-app notification for agency
    await new Notification({
      user: agency._id,
      message,
      type: "Payment"
    }).save();
  }



    res.status(200).json({ message: "Receipt rejected successfully.", receipt });
  }
   catch (error) {
    console.error("Reject Receipt Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};


exports.deleteReceipt = async (req, res) => {
  try {
    const universityId = req.user.id;
    const receiptId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      paidToUniversity: universityId,
    });

    if (!receipt) {
      return res.status(404).json({
        message: "Receipt not found or not associated with your university.",
      });
    }

    await Receipt.findByIdAndDelete(receiptId);

    res.status(200).json({ message: "Receipt deleted successfully." });
  } catch (error) {
    console.error("Delete Receipt Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};




//AGENCY

exports.getAllReceipts = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};

    if (status) {
      if (!["Pending", "Accepted", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }
      query.status = status;
    }

    const receipts = await Receipt.find(query)
      .populate("student", "fullName email")
      .populate("paidToUniversity", "name email")
      .populate("course", "name")
      .populate("applicationsId", "status submissionDate")
      .sort({ createdAt: -1 });

    res.status(200).json({ total: receipts.length, receipts });
  } catch (error) {
    console.error("Get All Receipts (Agency) Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};



exports.getReceiptById = async (req, res) => {
  try {
    const receiptId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID format." });
    }

    const receipt = await Receipt.findById(receiptId)
      .populate("student", "fullName email")
      .populate("paidToUniversity", "name email")
      .populate("course", "name")
      .populate("applicationsId", "status submissionDate");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    res.status(200).json({ receipt });
  } catch (error) {
    console.error("Get Receipt By ID (Agency) Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};
