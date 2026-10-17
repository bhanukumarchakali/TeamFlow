import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const handleResetPassword = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!newPassword) {
      toast.error("Please enter your new password.");
      return;
    }

    try {
      const verifyResponse = await api.post(
        "/api/auth/verify-password-reset-otp",
        {
          email: normalizedEmail,
          otp,
        },
      );

      if (!verifyResponse.data.success) {
        toast.error(verifyResponse.data.message || "Invalid or expired OTP.");
        return;
      }

      const resetResponse = await api.post("/api/auth/reset-password", {
        email: normalizedEmail,
        otp,
        newPassword,
      });

      if (resetResponse.data.success) {
        toast.success(
          resetResponse.data.message || "Password reset successfully.",
        );
        navigate("/login");
      } else {
        toast.error(resetResponse.data.message || "Failed to reset password.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Team<span className="text-indigo-600">Flow</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">Reset your password</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-slate-900">
            Create a new password
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enter the OTP sent to your email and choose a new password.
          </p>

          {/* Email */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* OTP */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Reset OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* New Password */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleResetPassword}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            Reset Password
          </button>

          {/* Back */}
          <button
            onClick={() => navigate("/login")}
            className="mt-4 w-full text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
