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

//AGENCY STATS APIs
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


//special API
// controllers/statsController.js
exports.getAgencyDashboardStats = async (req, res) => {
  try {
    const agencyId = req.user?.id || req.user?._id;
    if (!agencyId) {
      return res.status(401).json({ error: "Unauthorized: No agency ID found in request user." });
    }

    // ================== 1. Application Stats (for logged-in agency) ==================
    const agency = await Agency.findById(agencyId).lean();
    if (!agency) {
      return res.status(404).json({ error: "Agency not found." });
    }

    const processingCount = agency.pendingApplications?.length || 0;
    const sentToUniversityCount = agency.sentAppliactionsToUniversities?.length || 0;

    const appCounts = await Application.aggregate([
      {
        $match: {
          agency: agency._id,
          status: { $in: ["Accepted", "Rejected", "Withdrawn"] },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = appCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    const applicationStats = {
      Processing: processingCount,
      "Sent to University": sentToUniversityCount,
      Accepted: countsMap.Accepted || 0,
      Rejected: countsMap.Rejected || 0,
      Withdrawn: countsMap.Withdrawn || 0,
    };

    // ================== 2. Applications Stats Across Universities ==================
    const universities = await University.find({ isDeleted: false }).lean();
    const universityStats = [];
    let grandTotals = { Processing: 0, Accepted: 0, Rejected: 0 };

    for (const university of universities) {
      const processingIds = university.pendingApplications?.map((i) => i.applicationId.toString()) || [];
      const acceptedIds = university.approvedApplications?.map((id) => id.toString()) || [];
      const rejectedIds = university.rejectedApplications?.map((id) => id.toString()) || [];

      if (!processingIds.length && !acceptedIds.length && !rejectedIds.length) continue;

      const counts = {
        Processing: processingIds.length,
        Accepted: acceptedIds.length,
        Rejected: rejectedIds.length,
      };

      grandTotals.Processing += counts.Processing;
      grandTotals.Accepted += counts.Accepted;
      grandTotals.Rejected += counts.Rejected;

      universityStats.push({
        universityId: university._id,
        universityName: university.name,
        counts,
      });
    }

    // ================== 3. Students by Country ==================
    const students = await Students.find({ isDeleted: false }).select("address.country");
    const countryStats = {};
    students.forEach((student) => {
      const country = student.address?.country?.trim() || "Unknown";
      countryStats[country] = (countryStats[country] || 0) + 1;
    });

    const countryStatsArray = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    // ================== 4. Receipt Stats ==================
    const receipts = await Receipt.find({}, "status").lean();
    const statusCounts = { Pending: 0, Accepted: 0, Rejected: 0 };
    receipts.forEach((receipt) => {
      if (statusCounts.hasOwnProperty(receipt.status)) {
        statusCounts[receipt.status]++;
      }
    });

    // ================== 5. Visa Request Stats ==================
    const solicitors = await Solicitor.find({ agency: agencyId })
      .select("visaRequests approvedvisaRequests rejectRequests")
      .lean();

    let visaStats = { totalApproved: 0, totalRejected: 0, totalPending: 0 };
    if (solicitors?.length) {
      solicitors.forEach((solicitor) => {
        visaStats.totalApproved += solicitor.approvedvisaRequests?.length || 0;
        visaStats.totalRejected += solicitor.rejectRequests?.length || 0;
        visaStats.totalPending += solicitor.visaRequests?.length || 0;
      });
    }

    // ================== Final Response ==================
    res.status(200).json({
      message: "Agency dashboard statistics fetched successfully.",
      applications: applicationStats,
      universities: {
        totalUniversities: universityStats.length,
        grandTotals,
        stats: universityStats,
      },
      students: {
        totalStudents: students.length,
        countryStats: countryStatsArray,
      },
      receipts: {
        totalReceipts: receipts.length,
        statusCounts,
      },
      visaRequests: visaStats,
    });
  } catch (error) {
    console.error("Error fetching agency dashboard stats:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};




//UNIVERSITY STATS APIs

// Get Applications Stats for University Dashboard
exports.getUniversityApplicationStats = async (req, res) => {
  try {
    const universityId = req.user.id;

    // Check if university exists
    const university = await University.findById(universityId).lean();
    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    // Count Rejected from University's rejectedApplications array
    const rejectedCount = university.rejectedApplications?.length || 0;

    // Count Processing & Accepted directly from Application collection
    const appCounts = await Application.aggregate([
      {
        $match: {
          university: university._id,
          status: { $in: ['Processing', 'Accepted'] },
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

    // Convert aggregation result to map
    const countsMap = appCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    res.status(200).json({
      message: 'University application statistics fetched successfully.',
      stats: {
        Processing: countsMap.Processing || 0,
        Accepted: countsMap.Accepted || 0,
        Rejected: rejectedCount
      }
    });

  } catch (error) {
    console.error('Error fetching application stats for university:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get Application Stats by Course for University Dashboard
exports.getUniversityApplicationsByCourse = async (req, res) => {
  try {
    const universityId = req.user.id;

    // Verify university exists
    const university = await University.findById(universityId)
      .populate('rejectedApplications', 'course')
      .lean();

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    // ✅ Step 1: Get Processing & Accepted counts grouped by course
    const groupedApps = await Application.aggregate([
      {
        $match: {
          university: university._id,
          status: { $in: ['Processing', 'Accepted'] },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: { course: '$course', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // ✅ Step 2: Transform results into a course-wise object
    const courseStats = {};
    groupedApps.forEach(item => {
      const courseId = item._id.course?.toString();
      if (!courseStats[courseId]) {
        courseStats[courseId] = { Processing: 0, Accepted: 0, Rejected: 0 };
      }
      courseStats[courseId][item._id.status] = item.count;
    });

    // ✅ Step 3: Add Rejected counts (from university.rejectedApplications)
    university.rejectedApplications?.forEach(app => {
      const courseId = app.course?.toString();
      if (!courseId) return;
      if (!courseStats[courseId]) {
        courseStats[courseId] = { Processing: 0, Accepted: 0, Rejected: 0 };
      }
      courseStats[courseId].Rejected += 1;
    });

    // ✅ Step 4: Populate course details
    const courseIds = Object.keys(courseStats);
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('name');

    // ✅ Step 5: Build final response
    const result = courses.map(course => ({
      courseId: course._id,
      courseName: course.name,
      stats: courseStats[course._id.toString()]
    }));

    res.status(200).json({
      message: 'University applications by course fetched successfully.',
      totalCourses: result.length,
      data: result
    });

  } catch (error) {
    console.error('Error fetching applications by course for university:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get Students by Country for University Dashboard
exports.getUniversityStudentsByCountry = async (req, res) => {
  try {
    const universityId = req.user.id;

    // Step 1: Find all applications for this university (only non-deleted ones)
    const applications = await Application.find({
      university: universityId,
      isDeleted: false
    }).select('student');

    if (!applications.length) {
      return res.status(200).json({
        message: 'No students found for this university.',
        totalCountries: 0,
        data: []
      });
    }

    // Extract unique student IDs from applications
    const studentIds = [...new Set(applications.map(app => app.student.toString()))];

    // Step 2: Fetch students who match those IDs (only not deleted)
    const students = await Students.find({
      _id: { $in: studentIds },
      isDeleted: false
    }).select('address.country');

    if (!students.length) {
      return res.status(200).json({
        message: 'No active students found for this university.',
        totalCountries: 0,
        data: []
      });
    }

    // Step 3: Group students by country
    const countryCounts = {};
    students.forEach(student => {
      const country = student.address?.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    // Step 4: Convert to array format for UI
    const result = Object.keys(countryCounts).map(country => ({
      country,
      count: countryCounts[country]
    }));

    res.status(200).json({
      message: 'Students by country fetched successfully.',
      totalCountries: result.length,
      data: result
    });

  } catch (error) {
    console.error('Error fetching students by country for university:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get Receipt Stats for University Dashboard
exports.getUniversityReceiptStats = async (req, res) => {
  try {
    const universityId = req.user.id; // from verifyToken middleware

    // Count receipts grouped by status
    const receiptCounts = await Receipt.aggregate([
      {
        $match: {
          paidToUniversity: universityId
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation result to object
    const countsMap = receiptCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    res.status(200).json({
      message: 'University receipt statistics fetched successfully.',
      stats: {
        Pending: countsMap.Pending || 0,
        Accepted: countsMap.Accepted || 0,
        Rejected: countsMap.Rejected || 0
      }
    });

  } catch (error) {
    console.error("Error fetching university receipt stats:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};
