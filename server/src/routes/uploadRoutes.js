import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";

import upload from "../middlewares/uploadMiddleware.js";
import { uploadFile } from "../controllers/uploadController.js";

const uploadRouter = express.Router();

uploadRouter.post(
  "/",
  authMiddlewares,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        console.error("Upload middleware error:", error.message);
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size must be 10 MB or less",
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next();
    });
  },
  uploadFile,
);

export default uploadRouter;
