const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Students = require('../models/studentsModel');
const receiptController = require('../controllers/receiptController');
const university = require('../models/universityModel');
const University = require('../models/universityModel');
const Application = require('../models/applicationModel');
const Course = require('../models/coursesModel');
const { isValidObjectId } = require('mongoose');
const { uploadFilesToS3 } = require('../utils/s3Upload');
const Otp = require('../models/otpModel');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Receipt = require('../models/receiptModel');
require('dotenv').config({ path: '.env' })
// const s3 = require('../config/awsConfig');
// const upload = require('../config/multerConfig');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const {uploadFile}=require("../middlewares/uploadMiddleware")
// const multer = require('multer');
const Agents = require('../models/agentModel');
const Solicitor = require('../models/solicitorModel');
const Agency = require('../models/agencyModel');
const crypto = require('crypto');
const AssociateSolicitor =require('../models/associateModel')
const Notification = require('../models/notificationModel');
const checkEmailExists = require('../utils/checkEmailExists');
const { sendVerificationEmail } = require('../services/emailService');


exports.getApplicationStats = async (req, res) => {
  try {
    const agencyId = req.user?.id || req.user?._id;
    if (!agencyId) {
      return res.status(401).json({ error: 'Unauthorized: No agency ID found in request user.' });
    }

    const agency = await Agency.findById(agencyId).lean();
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    // Count stats
    const processingCount = agency.pendingApplications?.length || 0;
    const sentToUniversityCount = agency.sentAppliactionsToUniversities?.length || 0;

    // Query database for Accepted / Rejected / Withdrawn
    const appCounts = await Application.aggregate([
      {
        $match: {
          agency: agency._id,
          status: { $in: ['Accepted', 'Rejected', 'Withdrawn'] },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation result into an object { Accepted: X, Rejected: Y, Withdrawn: Z }
    const countsMap = appCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    res.status(200).json({
      message: 'Application statistics fetched successfully.',
      stats: {
        Processing: processingCount,
        'Sent to University': sentToUniversityCount,
        Accepted: countsMap.Accepted || 0,
        Rejected: countsMap.Rejected || 0,
        Withdrawn: countsMap.Withdrawn || 0
      }
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// controllers/applicationController.js
exports.getApplicationsStatsByAllUniversities = async (req, res) => {
  try {
    // Fetch all universities
    const universities = await University.find({ isDeleted: false }).lean();
    if (!universities.length) {
      return res.status(404).json({ message: 'No universities found.' });
    }

    const result = [];

    for (const university of universities) {
      // Collect application IDs based on university arrays
      const processingIds = university.pendingApplications?.map(item => item.applicationId.toString()) || [];
      const acceptedIds   = university.approvedApplications?.map(id => id.toString()) || [];
      const rejectedIds   = university.rejectedApplications?.map(id => id.toString()) || [];

      // Skip if no applications at all
      if (!processingIds.length && !acceptedIds.length && !rejectedIds.length) continue;

      result.push({
        universityId: university._id,
        universityName: university.name,
        counts: {
          Processing: processingIds.length,
          Accepted: acceptedIds.length,
          Rejected: rejectedIds.length
        }
      });
    }

    if (!result.length) {
      return res.status(404).json({ message: 'No applications found across universities.' });
    }

    // Calculate grand totals
    const totalCounts = result.reduce(
      (acc, uni) => {
        acc.Processing += uni.counts.Processing;
        acc.Accepted += uni.counts.Accepted;
        acc.Rejected += uni.counts.Rejected;
        return acc;
      },
      { Processing: 0, Accepted: 0, Rejected: 0 }
    );

    res.status(200).json({
      message: 'Application statistics fetched successfully.',
      totalUniversities: result.length,
      grandTotals: totalCounts,
      universities: result
    });

  } catch (error) {
    console.error('Error fetching application stats by universities:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


exports.getAllStudentsCountryStats = async (req, res) => {
  try {
    // Fetch only non-deleted students and just the country field
    const students = await Students.find({ isDeleted: false }).select('address.country');

    if (!students.length) {
      return res.status(404).json({ message: 'No active students found.' });
    }

    // ✅ Group students by country
    const countryStats = {};
    for (const student of students) {
      const country = student.address?.country?.trim() || 'Unknown';
      countryStats[country] = (countryStats[country] || 0) + 1;
    }

    // Convert to array for frontend and sort by count (highest first)
    const countryStatsArray = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      message: 'Country-wise student statistics fetched successfully.',
      totalStudents: students.length,
      countryStats: countryStatsArray
    });
  } catch (error) {
    console.error('Error fetching students country stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAllReceiptStats = async (req, res) => {
  try {
    // Fetch only status field for all receipts (no filters, no input)
    const receipts = await Receipt.find({}, "status").lean();

    // Prepare counts
    const statusCounts = {
      Pending: 0,
      Accepted: 0,
      Rejected: 0
    };

    receipts.forEach(receipt => {
      if (statusCounts.hasOwnProperty(receipt.status)) {
        statusCounts[receipt.status]++;
      }
    });

    res.status(200).json({
      message: "Receipt statistics fetched successfully.",
      totalReceipts: receipts.length,
      statusCounts
    });
  } catch (error) {
    console.error("Get All Receipts (Agency) Error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};
