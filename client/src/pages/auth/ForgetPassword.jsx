import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/api/auth/forgot-password",
        {
          email: normalizedEmail,
        },
      );

      if (response.data.success) {
        toast.success(
          response.data.message || "Password reset OTP sent successfully.",
        );

        navigate("/reset-password", {
          state: { email: normalizedEmail },
        });
      } else {
        toast.error(
          response.data.message || "Failed to send password reset OTP.",
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send password reset OTP.",
      );
    } finally {
      setLoading(false);
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
            Forgot Password?
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enter your email address and we'll send you a password reset OTP.
          </p>

          <form onSubmit={handleForgotPassword}>
            {/* Email */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>
          </form>

          {/* Back to Login */}
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

export default ForgotPassword;
