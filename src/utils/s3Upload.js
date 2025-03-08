const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Create S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to upload files to S3
const uploadFilesToS3 = async (files) => {
  const uploadPromises = files.map(async (file) => {
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
       ACL: "public-read"
    };

    await s3.send(new PutObjectCommand(params)); // Upload file
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
  });

  return Promise.all(uploadPromises);
};

module.exports = { uploadFilesToS3 };
