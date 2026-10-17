import { useState } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  console.log("Verify page state:", location.state);
  const handleResendOtp = async () => {
    try {
      const response = await api.post(
        "/api/auth/resend-verification-otp",
        {
          email: email.trim().toLowerCase(),
        },
      );

      toast.success(response.data.message);
    } catch (error) {
      console.error("Resend OTP error:", error);

      toast.error(error.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleVerify = async () => {
    try {
      const response = await api.post(
        "/api/auth/verify-email",
        {
          email: email.trim().toLowerCase(),
          otp,
        },
      );

      toast.success(response.data.message);
      if (response.data.success === true) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Email verification error:", error);

      toast.error(error.response?.data?.message || "Email verification failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Team<span className="text-indigo-600">Flow</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Verify your email address
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <span className="text-2xl">✉️</span>
            </div>

            <h2 className="text-xl font-semibold text-slate-900">
              Check your email
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Enter the OTP we sent to your email address.
            </p>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              readOnly
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* OTP */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Verification code
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Button */}
          <button
            onClick={handleVerify}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            Verify Email
          </button>

          <button
            onClick={handleResendOtp}
            className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Resend OTP
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            The verification code expires after 10 minutes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
