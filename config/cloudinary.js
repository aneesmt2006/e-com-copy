
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const env = require("dotenv").config();

cloudinary.config({
  cloud_name:process.env.CLOUD_NAME,       // Replace with your Cloudinary cloud name
  api_key: process.env.API_KEY,             // Replace with your Cloudinary API key
  api_secret:process.env.API_SECRET         // Replace with your Cloudinary API secret
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product-images',          // Folder where images will be stored in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed image formats
    transformation: [{ width: 800, height: 800, crop: 'limit' }] // Resize options
  }
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
