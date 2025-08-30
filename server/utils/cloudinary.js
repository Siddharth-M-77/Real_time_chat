import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const uploadToCloudinary = (file) => {
  console.log("📤 Uploading to cloudinary:", file.path);
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      { resource_type: "raw", folder: "pdfs" },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          return reject(error);
        }
        console.log("✅ Cloudinary upload success:", result.secure_url);

        // 🚀 Local file delete kar do
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error("⚠️ Error deleting local file:", err);
          } else {
            console.log("🗑️ Deleted local file:", file.path);
          }
        });

        resolve(result.secure_url);
      }
    );
  });
};
