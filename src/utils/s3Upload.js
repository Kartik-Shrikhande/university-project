// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { v4: uuidv4 } = require('uuid');
// const { Upload } = require('@aws-sdk/lib-storage');

// // AWS S3 client configuration
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// // Function to upload a file to S3
// const uploadFileToS3 = async (file) => {
//   const fileName = `${uuidv4()}-${file.originalname}`;
//   const params = {
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: `profilePhotos/${fileName}`,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//     ACL: 'public-read', // Allow public access to the uploaded file
//   };

//   // Upload the file using @aws-sdk/lib-storage for managed uploads
//   const upload = new Upload({
//     client: s3Client,
//     params,
//   });

//   await upload.done();
//   return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/profilePhotos/${fileName}`;
// };

// module.exports = uploadFileToS3;
