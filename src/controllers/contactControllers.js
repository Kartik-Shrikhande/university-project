const Contact = require("../models/contactModel");
const mongoose = require('mongoose');
// Create contact submission
exports.createContact = async (req, res) => {
  try {
    const { email, countryCode, phoneNumber, address, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ success: false, message: "Email and message are required." });
    }


 // Check if contact with the same email already exists and is not deleted
    const existingContact = await Contact.findOne({ email, isDeleted: false });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: "A contact with this email already exists.",
      });
    }

    const newContact = new Contact({
      email,
      countryCode,
      phoneNumber,
      address,
      message,
    });

    await newContact.save();

    res.status(201).json({ success: true, message: "Contact information submitted successfully." });
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// Fetch all non-deleted contacts
exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ isDeleted: false }).sort({ createdAt: -1 });

    res.status(200).json({ total:contacts.length,success: true, data: contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


// Permanently delete a contact
exports.deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(contactId)) {
          return res.status(400).json({ success: false, message: "Invalid Contact ID" });
        }

    const contact = await Contact.findByIdAndDelete(contactId);

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found." });
    }

    res.status(200).json({ success: true, message: "Contact permanently deleted." });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

