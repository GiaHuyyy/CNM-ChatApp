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
  const [errors, setErrors] = useState({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Email là bắt buộc" }));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Email không hợp lệ" }));
      return false;
    }

    setErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  };

  const handleCheckEmail = async () => {
    if (!validateEmail()) return false;
    
    setIsCheckingEmail(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-email`,
        { email }
      );
      
      if (response.data.exists) {
        return true;
      } else {
        setErrors((prev) => ({ ...prev, email: "Email không tồn tại trong hệ thống" }));
        return false;
      }
    } catch (error) {
      console.error("Error checking email:", error);
      return true; // Proceed anyway on error to allow server-side validation
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const validateOTP = () => {
    if (!otp) {
      setErrors((prev) => ({ ...prev, otp: "Mã OTP là bắt buộc" }));
      return false;
    }

    setErrors((prev) => ({ ...prev, otp: undefined }));
    return true;
  };

  const validatePasswords = () => {
    let isValid = true;

    if (!newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: "Mật khẩu mới là bắt buộc" }));
      isValid = false;
    } else if (newPassword.length < 6) {
      setErrors((prev) => ({ ...prev, newPassword: "Mật khẩu phải có ít nhất 6 ký tự" }));
      isValid = false;
    } else {
      setErrors((prev) => ({ ...prev, newPassword: undefined }));
    }

    if (!confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Xác nhận mật khẩu là bắt buộc" }));
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Mật khẩu không khớp" }));
      isValid = false;
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }

    return isValid;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    const isEmailValid = await handleCheckEmail();
    if (!isEmailValid) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/forgot-password`,
        { email }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Mã OTP đã được gửi đến email của bạn");
        setStep(2);
      } else {
        toast.error(response.data.message || "Không thể gửi mã OTP");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Không thể gửi mã OTP";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!validateOTP()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`, 
        {
          email,
          otp,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Mã OTP hợp lệ");
        setStep(3);
      } else {
        toast.error(response.data.message || "Mã OTP không hợp lệ");
        setErrors((prev) => ({ ...prev, otp: "Mã OTP không hợp lệ" }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Có lỗi xảy ra";
      toast.error(errorMessage);
      setErrors((prev) => ({ ...prev, otp: "Có lỗi xảy ra khi xác thực OTP" }));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/reset-password`,
        {
          email,
          otp,
          newPassword,
        }
      );

      if (response.data.success) {
        toast.success("Mật khẩu đã được đặt lại thành công");
        setIsLoginWithEmail(true);
        setIsForgotPassword(false);
      } else {
        toast.error(response.data.message || "Không thể đặt lại mật khẩu");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Không thể đặt lại mật khẩu";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => {
    return (
      <form onSubmit={handleSendOTP} className="w-[310px]">
        <div className={`mb-[18px] flex items-center border-b ${errors.email ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <FontAwesomeIcon icon={faEnvelope} width={8.5} className={errors.email ? 'text-red-500' : ''} />
          <input
            type="email"
            placeholder="Email"
            className="ml-3 flex-1 text-sm outline-none"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            required
          />
          {isCheckingEmail && (
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          )}
        </div>
        {errors.email && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.email}</p>}

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400 hover:bg-[#0180d8] transition-colors duration-300"
          disabled={loading || isCheckingEmail}
        >
          {loading || isCheckingEmail ? (
            <div className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {isCheckingEmail ? "Đang kiểm tra email..." : "Đang xử lý..."}
            </div>
          ) : (
            "Gửi mã OTP"
          )}
        </button>
      </form>
    );
  };

  const renderStepTwo = () => {
    return (
      <form onSubmit={handleVerifyOTP} className="w-[310px]">
        <div className="mb-4 text-center">
          <p className="text-sm">
            Vui lòng nhập mã xác thực đã được gửi đến
            <br />
            <span className="font-medium">{email}</span>
          </p>
        </div>
        
        <div className={`mb-[18px] flex items-center border-b ${errors.otp ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <input
            type="text"
            placeholder="Nhập mã OTP"
            className="flex-1 text-center text-xl font-bold tracking-wider outline-none"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
              if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined }));
            }}
            required
          />
        </div>
        {errors.otp && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.otp}</p>}

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400 hover:bg-[#0180d8] transition-colors duration-300"
          disabled={loading || !otp}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Đang xử lý...
            </div>
          ) : (
            "Xác thực OTP"
          )}
        </button>

        <div className="mt-3 text-center">
          <button 
            type="button" 
            onClick={handleSendOTP} 
            className="text-sm text-blue-500 hover:underline"
            disabled={loading}
          >
            Gửi lại mã OTP
          </button>
        </div>
      </form>
    );
  };

  const renderStepThree = () => {
    return (
      <form onSubmit={handleResetPassword} className="w-[310px]">
        <div className={`mb-[18px] flex items-center border-b ${errors.newPassword ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <FontAwesomeIcon icon={faLock} width={8.5} className={errors.newPassword ? 'text-red-500' : ''} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu mới"
            className="ml-3 flex-1 text-sm outline-none"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
            }}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>
        {errors.newPassword && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.newPassword}</p>}

        <div className={`mb-[18px] flex items-center border-b ${errors.confirmPassword ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <FontAwesomeIcon icon={faLock} width={8.5} className={errors.confirmPassword ? 'text-red-500' : ''} />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Xác nhận mật khẩu mới"
            className="ml-3 flex-1 text-sm outline-none"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>
        {errors.confirmPassword && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.confirmPassword}</p>}

        <button
          type="submit"
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400 hover:bg-[#0180d8] transition-colors duration-300"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Đang xử lý...
            </div>
          ) : (
            "Đặt lại mật khẩu"
          )}
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
