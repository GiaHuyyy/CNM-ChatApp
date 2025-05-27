import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faEye, faEyeSlash, faLock } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { toast } from "sonner";
import { useGlobalContext } from "../context/GlobalProvider";

export default function ForgotPasswordPage() {
  const { setIsLoginWithEmail, setIsForgotPassword } = useGlobalContext();

  const [step, setStep] = useState(1); // 1: enter email, 2: verify OTP, 3: reset password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/forgot-password`, {
        email: email,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setStep(2); // Move to verify OTP step
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể gửi OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`, {
        email: email,
        otp: otp,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setStep(3); // Move to reset password step
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã OTP không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/reset-password`, {
        email: email,
        otp: otp,
        newPassword: newPassword,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setIsLoginWithEmail(true);
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => {
    return (
      <form onSubmit={handleSendOTP} className="w-[310px]">
        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faEnvelope} width={8.5} />
          <input
            type="email"
            placeholder="Email"
            className="ml-3 flex-1 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Gửi mã OTP"}
        </button>
      </form>
    );
  };

  const renderStepTwo = () => {
    return (
      <form onSubmit={handleVerifyOTP} className="w-[310px]">
        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <input
            type="text"
            placeholder="Nhập mã OTP đã gửi đến email của bạn"
            className="flex-1 text-sm"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Xác thực OTP"}
        </button>

        <button type="button" onClick={handleSendOTP} className="mt-3 w-full text-sm text-blue-500 hover:underline">
          Gửi lại mã OTP
        </button>
      </form>
    );
  };

  const renderStepThree = () => {
    return (
      <form onSubmit={handleResetPassword} className="w-[310px]">
        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faLock} width={8.5} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu mới"
            className="ml-3 flex-1 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faLock} width={8.5} />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Xác nhận mật khẩu mới"
            className="ml-3 flex-1 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold">
          {step === 1 && "Quên mật khẩu"}
          {step === 2 && "Xác thực mã OTP"}
          {step === 3 && "Đặt lại mật khẩu"}
        </h2>
        <p className="text-sm text-gray-600">
          {step === 1 && "Nhập email của bạn để nhận mã xác thực"}
          {step === 2 && "Nhập mã xác thực đã được gửi đến email của bạn"}
          {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
        </p>
      </div>

      {step === 1 && renderStepOne()}
      {step === 2 && renderStepTwo()}
      {step === 3 && renderStepThree()}
    </div>
  );
}
