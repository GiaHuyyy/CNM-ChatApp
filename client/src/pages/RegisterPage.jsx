import { faCamera, faEnvelope, faEye, faEyeSlash, faLock, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useGlobalContext } from "../context/GlobalProvider";
import uploadFileToS3 from "../helpers/uploadFileToS3";

export default function RegisterPage() {
  // Get the global context to access login state toggles
  const { setIsLoginWithEmail } = useGlobalContext();
  
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP
  const [data, setData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); 
  const [uploadPhoto, setUploadPhoto] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const fileInputRef = useRef(null);

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Add real-time validation for email
    if (name === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, email: "Email không hợp lệ" }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    }
    
    // Add real-time validation for password match
    if (name === 'confirmPassword' || name === 'password') {
      if (name === 'confirmPassword' && value !== data.password) {
        setErrors(prev => ({ ...prev, confirmPassword: "Mật khẩu không khớp" }));
      } else if (name === 'password' && data.confirmPassword && value !== data.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "Mật khẩu không khớp" }));
      } else if (name === 'confirmPassword' || (name === 'password' && data.confirmPassword)) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const handleEmailBlur = async () => {
    // Only check if email is valid
    if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setIsCheckingEmail(true);
      
      try {
        // Check if email exists
        const response = await axios.post(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-email`,
          { email: data.email }
        );
        
        if (response.data.exists) {
          setErrors(prev => ({ ...prev, email: "Email đã được sử dụng" }));
        }
      } catch (error) {
        console.error("Error checking email existence:", error);
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  const handleTogglePassword = (field) => {
    if (field === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const handleUploadPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước hình ảnh không được vượt quá 5MB");
      return;
    }
    
    setUploadPhoto(file);
  };

  const handleClearUploadPhoto = (e) => {
    e.preventDefault();
    setUploadPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const validateStep1 = async () => {
    let isValid = true;
    const newErrors = {};
    
    // Email validation
    if (!data.email) {
      newErrors.email = "Email là bắt buộc";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Email không hợp lệ";
      isValid = false;
    }
    
    // Name validation
    if (!data.name.trim()) {
      newErrors.name = "Tên người dùng là bắt buộc";
      isValid = false;
    }
    
    // Password validation
    if (!data.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
      isValid = false;
    } else if (data.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      isValid = false;
    }
    
    // Confirm password validation
    if (!data.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
      isValid = false;
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
      isValid = false;
    }
    
    // Check if email exists
    if (isValid && data.email) {
      setIsCheckingEmail(true);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-email`,
          { email: data.email }
        );
        
        if (response.data.exists) {
          newErrors.email = "Email đã được sử dụng";
          isValid = false;
        }
      } catch (error) {
        console.error("Error checking email:", error);
      } finally {
        setIsCheckingEmail(false);
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    const isFormValid = await validateStep1();
    if (!isFormValid) return;
    
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`,
        { email: data.email }
      );
      
      if (response.data.success) {
        toast.success(response.data.message || "Mã OTP đã được gửi");
        setStep(2);
        setOtpSent(true);
      } else {
        toast.error(response.data.message || "Không thể gửi mã OTP");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Có lỗi xảy ra khi gửi mã OTP";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }

    setLoading(true);
    try {
      // First verify OTP
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`,
        {
          email: data.email,
          otp: otp,
        }
      );

      if (!verifyResponse.data.success) {
        toast.error(verifyResponse.data.message || "Mã OTP không hợp lệ");
        setLoading(false);
        return;
      }
      
      // OTP verified, now register
      let profilePicUrl = "";
      
      if (uploadPhoto) {
        try {
          const uploadResult = await uploadFileToS3(uploadPhoto);
          if (uploadResult && uploadResult.secure_url) {
            profilePicUrl = uploadResult.secure_url;
          }
        } catch (uploadError) {
          console.error("Error uploading profile picture:", uploadError);
          toast.error("Không thể tải lên ảnh đại diện, tiếp tục với ảnh mặc định");
        }
      }
      
      const registerResponse = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/register`,
        {
          email: data.email,
          password: data.password,
          name: data.name,
          profilePic: profilePicUrl,
          otp: otp,
        }
      );
      
      if (registerResponse.data.success) {
        toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
        // Reset form
        setData({
          email: "",
          password: "",
          confirmPassword: "",
          name: "",
        });
        setUploadPhoto(null);
        setOtp("");
        setStep(1);
        
        // Switch to login page
        setIsLoginWithEmail(true);
      } else {
        toast.error(registerResponse.data.message || "Đăng ký thất bại");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Có lỗi xảy ra khi đăng ký";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`,
        { email: data.email }
      );
      
      if (response.data.success) {
        toast.success("Mã OTP mới đã được gửi");
        setOtpSent(true);
      } else {
        toast.error(response.data.message || "Không thể gửi mã OTP");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Có lỗi xảy ra khi gửi mã OTP";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="w-[310px]">
          <div className={`mb-[18px] flex items-center border-b ${errors.email ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
            <FontAwesomeIcon icon={faEnvelope} width={8.5} className={errors.email ? 'text-red-500' : ''} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="ml-3 flex-1 text-sm outline-none"
              value={data.email}
              onChange={handleOnChange}
              onBlur={handleEmailBlur}
              required
            />
            {isCheckingEmail && (
              <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            )}
          </div>
          {errors.email && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.email}</p>}

          <div className={`mb-[18px] flex items-center border-b ${errors.name ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
            <FontAwesomeIcon icon={faUser} width={8.5} className={errors.name ? 'text-red-500' : ''} />
            <input
              type="text"
              name="name"
              placeholder="Tên người dùng"
              className="ml-3 flex-1 text-sm outline-none"
              value={data.name}
              onChange={handleOnChange}
              required
            />
          </div>
          {errors.name && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.name}</p>}

          <div className={`mb-[18px] flex items-center border-b ${errors.password ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
            <FontAwesomeIcon icon={faLock} width={8.5} className={errors.password ? 'text-red-500' : ''} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mật khẩu"
              className="ml-3 flex-1 text-sm outline-none"
              value={data.password}
              onChange={handleOnChange}
              required
            />
            <span className="ml-2 cursor-pointer" onClick={() => handleTogglePassword("password")}>
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} width={10} />
            </span>
          </div>
          {errors.password && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.password}</p>}

          <div className={`mb-[18px] flex items-center border-b ${errors.confirmPassword ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
            <FontAwesomeIcon icon={faLock} width={8.5} className={errors.confirmPassword ? 'text-red-500' : ''} />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Xác nhận mật khẩu"
              className="ml-3 flex-1 text-sm outline-none"
              value={data.confirmPassword}
              onChange={handleOnChange}
              required
            />
            <span className="ml-2 cursor-pointer" onClick={() => handleTogglePassword("confirmPassword")}>
              <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} width={10} />
            </span>
          </div>
          {errors.confirmPassword && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.confirmPassword}</p>}

          {/* Replace the existing profile picture upload section with this enhanced version */}
          <div className="mb-6 flex flex-col items-center">
            <p className="mb-2 text-sm text-gray-500">Ảnh đại diện (tùy chọn)</p>
            
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-blue-400 hover:bg-gray-100">
                {uploadPhoto ? (
                  <img 
                    src={URL.createObjectURL(uploadPhoto)} 
                    alt="Profile preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    <FontAwesomeIcon icon={faCamera} className="text-gray-400" size="lg" />
                    <span className="mt-1 text-xs text-gray-400">Thêm ảnh</span>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadPhoto}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  accept="image/*"
                />
              </div>
              
              {uploadPhoto && (
                <button
                  onClick={handleClearUploadPhoto}
                  type="button"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                >
                  <FontAwesomeIcon icon={faXmark} size="xs" />
                </button>
              )}
            </div>
            
            {uploadPhoto ? (
              <p className="mt-2 text-xs text-gray-500">
                {uploadPhoto.name.length > 25 
                  ? `${uploadPhoto.name.substring(0, 22)}...` 
                  : uploadPhoto.name}
                {' '}{(uploadPhoto.size / (1024 * 1024)).toFixed(2)}MB
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Nhấn vào khung để chọn ảnh</p>
            )}
          </div>

          <button
            type="submit"
            className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400 hover:bg-[#0180d8] transition-colors duration-300"
            disabled={loading || isCheckingEmail || Object.keys(errors).some(key => errors[key])}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Đang xử lý...
              </div>
            ) : (
              "Tiếp tục"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="w-[310px]">
          <div className="mb-4 text-center">
            <p className="text-sm">
              Vui lòng nhập mã xác thực đã được gửi đến
              <br />
              <span className="font-medium">{data.email}</span>
            </p>
          </div>
          
          <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
            <input
              type="text"
              placeholder="Nhập mã OTP"
              className="flex-1 text-center text-xl font-bold tracking-wider outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 text-center">
            <button 
              type="button" 
              onClick={handleResendOTP} 
              className="text-sm text-blue-500 hover:underline"
              disabled={loading}
            >
              Gửi lại mã OTP
            </button>
          </div>

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
              "Đăng ký"
            )}
          </button>
          
          <div className="mt-3 text-center">
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="text-sm text-gray-500 hover:underline"
            >
              Quay lại
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
