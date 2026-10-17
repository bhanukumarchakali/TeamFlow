import express from "express";
import { register } from "../controllers/authControllers.js";
import { login } from "../controllers/authControllers.js";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { getMe } from "../controllers/authControllers.js";
import { logout } from "../controllers/authControllers.js";
import { verifyEmail } from "../controllers/authControllers.js";
import { resendVerificationOtp } from "../controllers/authControllers.js";
import { forgotPassword } from "../controllers/authControllers.js";
import { verifyPasswordResetOtp } from "../controllers/authControllers.js";
import {
  resetPassword,
  changePassword,
} from "../controllers/authControllers.js";
import { updateProfile } from "../controllers/authControllers.js";
import { uploadAvatar, removeAvatar } from "../controllers/authControllers.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/signup", register);
router.post("/signin", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-otp", resendVerificationOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-password-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);

router.get("/me", authMiddlewares, getMe);
router.put("/profile", authMiddlewares, updateProfile);
router.post("/signout", authMiddlewares, logout);
router.delete("/profile/avatar", authMiddlewares, removeAvatar);

const validateAvatar = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please select an image",
    });
  }

  if (
    !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
      req.file.mimetype,
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG, PNG, GIF, and WebP images are allowed",
    });
  }

  next();
};
router.put(
  "/profile/avatar",
  authMiddlewares,
  upload.single("avatar"),
  validateAvatar,
  uploadAvatar,
);

router.put("/change-password", authMiddlewares, changePassword);

export default router;
