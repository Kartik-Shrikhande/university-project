const Receipt = require('../models/receiptModel');
const Application = require('../models/applicationModel');
const University = require('../models/universityModel');
const Student = require('../models/studentsModel');
const Course = require('../models/coursesModel');
const mongoose = require('mongoose');
const { uploadFilesToS3 } = require('../utils/s3Upload'); // adjust path as needed

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
    }).populate("course university");

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
  






  
//UNIVERSITY 

//not checked


// // Get all receipts for a university
// exports.getAllReceiptswithFilterationForUniversity = async (req, res) => {
//     try {
//       const universityId = req.user.id;
//       const { status } = req.query;
  
//       const query = { paidToUniversity: universityId };
//       if (status) query.status = status;
  
//       const receipts = await Receipt.find(query).populate('student', 'name email').sort({ createdAt: -1 });
  
//       res.status(200).json({ receipts });
//     } catch (error) {
//       console.error('Error fetching university receipts:', error);
//       res.status(500).json({ message: 'Something went wrong.' });
//     }
//   };
  

// // Get single receipt by ID
// exports.getReceiptById = async (req, res) => {
//   try {
//     const studentId = req.user.id;
//     const receiptId = req.params.id;

//     // Validate receiptId
//     if (!mongoose.Types.ObjectId.isValid(receiptId)) {
//       return res.status(400).json({ message: "Invalid receipt ID format." });
//     }

//     // Fetch receipt and check ownership in one query
//     const receipt = await Receipt.findOne({
//       _id: receiptId,
//       student: studentId, // Ensures receipt belongs to this logged-in student
//     })
//       .populate("paidToUniversity", "name email")
//       .populate("course", "name courseType courseDuration")
//       .populate("applicationsId");

//     if (!receipt) {
//       return res.status(404).json({ message: "Receipt not found or not belongs to this student." });
//     }

//     res.status(200).json({ receipt });
//   } catch (error) {
//     console.error("Get Receipt Error:", error);
//     res.status(500).json({ message: "Something went wrong." });
//   }
// };


// // Accept a receipt
// exports.acceptReceipt = async (req, res) => {
//   try {
//     const universityId = req.user.id;
//     const { id } = req.params;

//     const receipt = await Receipt.findOne({ _id: id, paidToUniversity: universityId });

//     if (!receipt) {
//       return res.status(404).json({ message: 'Receipt not found.' });
//     }

//     receipt.status = 'Accepted';
//     await receipt.save();

//     res.status(200).json({ message: 'Receipt accepted successfully.' });
//   } catch (error) {
//     console.error('Accept Receipt Error:', error);
//     res.status(500).json({ message: 'Something went wrong.' });
//   }
// };

// // Reject a receipt with remarks
// exports.rejectReceipt = async (req, res) => {
//   try {
//     const universityId = req.user.id;
//     const { id } = req.params;
//     const { remark } = req.body;

//     if (!remark) {
//       return res.status(400).json({ message: 'Rejection remark is required.' });
//     }

//     const receipt = await Receipt.findOne({ _id: id, paidToUniversity: universityId });

//     if (!receipt) {
//       return res.status(404).json({ message: 'Receipt not found.' });
//     }

//     receipt.status = 'Rejected';
//     receipt.remarks.push(remark);

//     await receipt.save();

//     res.status(200).json({ message: 'Receipt rejected with remark.', receipt });
//   } catch (error) {
//     console.error('Reject Receipt Error:', error);
//     res.status(500).json({ message: 'Something went wrong.' });
//   }
// };




//AGENCY