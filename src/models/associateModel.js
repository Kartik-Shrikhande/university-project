const mongoose = require("mongoose");

const AssociateSolicitorSchema = new mongoose.Schema({
  nameOfAssociate: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: {
    country: { type: String,required :true, maxlength: 50 },
    // zip_postalCode: { type: String, maxlength: 15 },
    // state_province_region: { type: String, maxlength: 50 }, // Updated field
    city: { type: String,required :true, maxlength: 50 },
    addressLine: { type: String,required :true, maxlength: 100 } // Updated field
},
  // solicitors :[],
bankDetails: {
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { 
      type: String, 
      required: true, 
      // set: (val) => encryptData(val) // Encrypt account number before saving
    },
    ifscSwiftCode: { type: String, required: true }, // IFSC for India, SWIFT for international transfers
    iban: { type: String }, // Only for international transactions
  },
  assignedSolicitorRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' ,default:null}],
  studentAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Array of student IDs
  role:{type: String, default: 'associate'},
  isDeleted: { 
    type: Boolean, 
    default: false,
  },
},{timestamps:true});


//documents: [{ type: String }], // URLs for uploaded certifications, licenses
  
//   solicitors :[],
  //status: { type: String, enum: ["Active", "Inactive"], default: "Active" }, // Account status




// Function to encrypt bank details before storing
function encryptData(data) {
    const algorithm = "aes-256-cbc";
    const key = process.env.ENCRYPTION_KEY || "default_key_32chars_long"; // Store securely in environment variables
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }



module.exports = mongoose.model("Associate", AssociateSolicitorSchema);
