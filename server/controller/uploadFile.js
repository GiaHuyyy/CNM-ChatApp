const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer upload
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
});

const uploadSingle = upload.single("file");

const handleFileUpload = (req, res) => {
  uploadSingle(req, res, function (err) {
    if (err) {
      console.error("Error uploading file:", err);
      return res.status(500).json({
        success: false,
        message: "File upload failed",
        error: err.message,
      });
    }

    // Use CloudFront
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const fileUrl = cloudFrontDomain ? `${cloudFrontDomain}/${req.file.key}` : req.file.location;

    console.log("File uploaded successfully:", fileUrl);

    return res.status(200).json({
      success: true,
      message: "File đã được tải lên thành công",
      url: fileUrl,
      key: req.file.key,
    });
  });
};

module.exports = { handleFileUpload };
