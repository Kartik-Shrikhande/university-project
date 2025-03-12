const crypto = require("crypto");

// Ensure your encryption key is exactly 32 bytes long
const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

function encryptData(data) {
  try {
    const algorithm = "aes-256-cbc";
    const iv = crypto.randomBytes(16); // Generate a random IV (16 bytes)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, "hex"), iv);
    
    let encrypted = cipher.update(data, "utf-8", "hex");
    encrypted += cipher.final("hex");

    // Store IV along with encrypted data (needed for decryption)
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
}


function decryptData(encryptedData) {
    try {
      const algorithm = "aes-256-cbc";
      const keyBuffer = Buffer.from(key, "hex");
  
      // Extract IV and encrypted content
      const [ivHex, encryptedText] = encryptedData.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const encryptedBuffer = Buffer.from(encryptedText, "hex");
  
      const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
      let decrypted = decipher.update(encryptedBuffer, "hex", "utf-8");
      decrypted += decipher.final("utf-8");
  
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Decryption failed");
    }
  }
  
  module.exports = { encryptData, decryptData };
  