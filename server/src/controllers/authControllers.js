import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import generateOtp from "../utils/generateOtp.js";
import transporter from "../utils/emailService.js";

import { uploadToCloudinary } from "../config/cloudinary.js";

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are needed",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(401).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashpass = await bcrypt.hash(password, 10);

    const otp = generateOtp();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashpass,
      emailVerificationOtp: otp,
      emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: email,
      subject: "Verify your TeamFlow account",
      text: `Your verification OTP is ${otp}`,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("SignUp error:", error.message);

    return res.status(500).json({
      success: false,
      message: "SignUp Failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are needed",
      });
    }

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "No account found, please register",
      });
    }

    const validPass = await bcrypt.compare(password, existingUser.password);

    if (!validPass) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }
    const token = jwt.sign(
      {
        userId: existingUser._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    existingUser.lastLoginAt = new Date();
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: existingUser._id,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        email: existingUser.email,
        avatar: existingUser.avatar,
        isEmailVerified: existingUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Signin error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Signin failed",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("getMe controller error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (!user.emailVerificationOtp) {
      return res.status(400).json({
        success: false,
        message: "No verification OTP found",
      });
    }

    if (user.emailVerificationOtpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.emailVerificationOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
    user.isEmailVerified = true;
    user.emailVerificationOtp = null;
    user.emailVerificationOtpExpiresAt = null;

    await user.save();
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Email verification failed",
    });
  }
};

export const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const otp = generateOtp();

    user.emailVerificationOtp = otp;
    user.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: user.email,
      subject: "Your new TeamFlow verification code",
      text: `Your new verification OTP is ${otp}`,
    });

    return res.status(200).json({
      success: true,
      message: "A new verification OTP has been sent",
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const otp = generateOtp();

    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: user.email,
      subject: "Reset your TeamFlow password",
      text: `Your TeamFlow password reset OTP is ${otp}`,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP has been sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send password reset OTP",
    });
  }
};

export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.passwordResetOtp) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found",
      });
    }

    if (user.passwordResetOtpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.passwordResetOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify password reset OTP error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.passwordResetOtp) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found",
      });
    }

    if (user.passwordResetOtpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.passwordResetOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashPassword;
    user.passwordResetOtp = null;
    user.passwordResetOtpExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.firstName = firstName.trim();
    user.lastName = lastName.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "teamflow/avatars",
    );

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: result.secure_url },
      { new: true, runValidators: true },
    ).select("firstName lastName email avatar isEmailVerified");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Upload avatar error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile picture",
    });
  }
};

export const removeAvatar = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: null },
      { new: true, runValidators: true },
    ).select("firstName lastName email avatar isEmailVerified");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Remove avatar error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove profile picture",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Passwords must be valid strings",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    const user = await User.findById(req.user.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};
