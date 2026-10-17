
import { uploadToCloudinary } from "../config/cloudinary.js";


export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "teamflow/uploads",
    );

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      },
    });
  } catch (error) {
    console.error("File upload error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
    });
  }
};