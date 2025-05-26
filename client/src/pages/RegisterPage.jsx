import { faEnvelope, faEye, faEyeSlash, faImage, faLock, faUser, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useGlobalContext } from "../context/GlobalProvider";
// eslint-disable-next-line no-unused-vars
import uploadFileToS3 from "../helpers/uploadFileToS3";
import uploadFileToCloud from "../helpers/uploadFileToClound";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [data, setData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    profilePic: "",
  });

  const [uploadPhoto, setUploadPhoto] = useState("");
  const fileInputRef = useRef(null);

  const { setIsLoginWithEmail } = useGlobalContext();

  const handleShowPassword = () => setShowPassword(!showPassword);
  const handleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleOnChange = (e) => {
    setData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUploadPhoto = (e) => {
    const file = e.target.files[0];
    setUploadPhoto(file);
  };

  const handleClearUploadPhoto = (e) => {
    e.preventDefault();
    setUploadPhoto("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // Đặt lại giá trị của input file để có thể chọn lại cùng 1 file
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      // First verify OTP
      const verifyResponse = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`, {
        email: data.email,
        otp: otp,
      });

      if (verifyResponse.data) {
        let profilePicUrl = "";
        if (uploadPhoto) {

          // Upload use S3 AWS
          // const uploadPhotoToCloud = await uploadFileToS3(uploadPhoto);
          // Upload use Cloudinary
          const uploadPhotoToCloud = await uploadFileToCloud(uploadPhoto);
          if (!uploadPhotoToCloud?.url) {
            throw new Error("Failed to upload profile picture");
          }
          profilePicUrl = uploadPhotoToCloud.secure_url;
        }

        const registrationData = { ...data, profilePic: profilePicUrl };
        // Then register
        const registerResponse = await axios.post(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/register`,
          registrationData,
        );

        if (registerResponse.data.success) {
          setData({
            email: "",
            name: "",
            confirmPassword: "",
            profilePic: "",
            password: "",
          });
          setUploadPhoto("");
          setIsLoginWithEmail(true);
        }
        toast.success(registerResponse.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!data.email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const otpResponse = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`, {
        email: data.email,
      });

      if (otpResponse.data) {
        toast.success("OTP đã được gửi đến email của bạn");
        setOtpSent(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Gửi OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <form className="w-[310px]" onSubmit={handleVerifyAndRegister}>
        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faEnvelope} width={8.5} />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="ml-3 flex-1 text-sm"
            value={data.email}
            onChange={handleOnChange}
            required
          />
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={loading || !data.email}
            className="ml-2 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 disabled:bg-gray-400"
          >
            {otpSent ? "Resend OTP" : "Send OTP"}
          </button>
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <input
            type="text"
            placeholder="Enter OTP"
            className="flex-1 text-sm"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required={otpSent}
          />
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faUser} width={8.5} />
          <input
            type="text"
            name="name"
            placeholder="Họ và tên"
            className="ml-3 flex-1 text-sm"
            value={data.name}
            onChange={handleOnChange}
            required
          />
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faLock} width={8.5} />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Mât khẩu"
            className="ml-3 flex-1 text-sm"
            value={data.password}
            onChange={handleOnChange}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={handleShowPassword}>
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faLock} width={8.5} />
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            className="ml-3 flex-1 text-sm"
            value={data.confirmPassword}
            onChange={handleOnChange}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={handleShowConfirmPassword}>
            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>

        <div className="mb-[18px] border-b border-[#f0f0f0] py-[5px]">
          <label htmlFor="profilePic" className="w-full cursor-pointer">
            <div className="flex h-11 items-center justify-center gap-x-3 border bg-slate-200 hover:border-[#64b9f7]">
              <FontAwesomeIcon icon={faImage} width={14} />
              <p> {uploadPhoto?.name ? uploadPhoto?.name : "Chọn ảnh đại diện"} </p>
              {uploadPhoto?.name && (
                <button className="px-1 hover:text-red-500" onClick={handleClearUploadPhoto}>
                  <FontAwesomeIcon icon={faX} width={8} />
                </button>
              )}
            </div>
          </label>
          <input
            type="file"
            name="profilePic"
            id="profilePic"
            className="hidden"
            onChange={handleUploadPhoto}
            ref={fileInputRef}
          />
        </div>

        <button
          type="submit"
          className="mt-4 h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading || !otpSent}
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}
