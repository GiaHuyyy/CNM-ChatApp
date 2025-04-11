import { useState, useRef } from "react";
import {
  faEye,
  faEyeSlash,
  faImage,
  faLock,
  faMobileScreenButton,
  faUser,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import uploadFileToCloud from "../helpers/uploadFileToClound";
import axios from "axios";
import { toast } from "sonner";
import { useGlobalContext } from "../context/GlobalProvider";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [data, setData] = useState({
    phone: "",
    name: "",
    confirmPassword: "",
    profilePic: "",
    password: "",
  });

  const [uploadPhoto, setUploadPhoto] = useState("");
  const fileInputRef = useRef(null);

  const { setIsLoginWithPhone } = useGlobalContext();

  const contries = [
    {
      name: "Vietnam",
      code: "+84",
    },
    {
      name: "United States",
      code: "+1",
    },
    {
      name: "Japan",
      code: "+81",
    },
  ];

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleOnChange = (e) => {
    setData((prevData) => ({
      ...prevData,
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
      fileInputRef.current.value = null;
    }
  };

  const [phoneVerificationStep, setPhoneVerificationStep] = useState("initial");
  const [otpCode, setOtpCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [mockOtp, setMockOtp] = useState("");

  const handleSendOtp = async () => {
    if (!data.phone) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    setVerificationLoading(true);
    setVerificationError("");

    try {
      // Call our server endpoint to send OTP
      const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`, { phone: data.phone });

      if (response.data.success) {
        // Show fallback OTP in all environments for this demo/development app
        if (response.data.otp) {
          setMockOtp(response.data.otp);
          console.log("Your OTP is:", response.data.otp);

          // Add this to display the OTP directly in the UI for easier testing
          toast.info(`Mã OTP của bạn là: ${response.data.otp}`, {
            duration: 10000, // 10 seconds to give time to read it
          });
        }

        toast.success("Mã OTP đã được gửi đến số điện thoại của bạn");
        setPhoneVerificationStep("sent");
      } else {
        throw new Error(response.data.message || "Không thể gửi mã OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setVerificationError(error.response?.data?.message || "Có lỗi xảy ra khi gửi OTP");
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi gửi OTP");

      // If there's an OTP in the error response, use it as fallback
      if (error.response?.data?.otp) {
        setMockOtp(error.response.data.otp);
        setPhoneVerificationStep("sent");
        toast.info(`Fallback OTP: ${error.response.data.otp}`, {
          duration: 10000,
        });
      }
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }

    setVerificationLoading(true);
    setVerificationError("");

    try {
      // Call our server endpoint to verify OTP
      const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`, {
        phone: data.phone,
        code: otpCode,
      });

      if (response.data.success) {
        toast.success("Xác thực thành công");
        setPhoneVerificationStep("verified");
      } else {
        throw new Error(response.data.message || "Mã OTP không đúng");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setVerificationError(error.response?.data?.message || "Có lỗi xảy ra khi xác thực OTP");
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi xác thực OTP");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (data.password !== data.confirmPassword) {
      toast.error("Mật khẩu và xác nhận mật khẩu không khớp");
      return;
    }

    try {
      let profilePicUrl = "";
      if (uploadPhoto) {
        const uploadPhotoToCloud = await uploadFileToCloud(uploadPhoto);
        if (!uploadPhotoToCloud?.url) {
          throw new Error("Failed to upload profile picture");
        }
        profilePicUrl = uploadPhotoToCloud.secure_url;
      }

      const registrationData = { ...data, profilePic: profilePicUrl };

      try {
        const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/register`;
        const response = await axios.post(URL, registrationData);
        toast.success(response.data.message);
        if (response.data.success) {
          setData({
            phone: "",
            name: "",
            confirmPassword: "",
            profilePic: "",
            password: "",
          });
          setUploadPhoto("");
          setIsLoginWithPhone(true);
        }
      } catch (error) {
        toast.error(error.response.data.message);
      }
    } catch (error) {
      console.log("Error: " + error);
      toast.error("Đăng ký thất bại: " + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <form className="w-[310px]" onSubmit={handleRegister}>
        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faMobileScreenButton} width={8.5} />
          <select name="country" id="country" className="w-[70px] p-1 text-sm">
            {contries.map((country, index) => (
              <option key={index} value={country.code}>
                {country.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            name="phone"
            id="phone"
            placeholder="Số điện thoại"
            className="ml-3 flex-1 text-sm"
            value={data.phone}
            onChange={handleOnChange}
            required
          />
        </div>

        <div className="mb-[18px] flex items-center border-b border-[#f0f0f0] py-[5px]">
          <FontAwesomeIcon icon={faUser} width={8.5} />
          <input
            type="text"
            name="name"
            id="name"
            placeholder="Tên người dùng"
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
            id="password"
            placeholder="Mật khẩu"
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
            id="confirmPassword"
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

        <div className="mt-4 flex flex-col items-center justify-center gap-3 border-t border-gray-200 py-4">
          <h3 className="text-sm font-semibold">Xác thực số điện thoại</h3>

          {phoneVerificationStep === "initial" && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={verificationLoading || !data.phone}
              className={`w-full rounded p-2 text-white ${
                data.phone ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400"
              }`}
            >
              {verificationLoading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          )}

          {phoneVerificationStep === "sent" && (
            <div className="w-full">
              <div className="mb-2 flex items-center">
                <input
                  type="text"
                  placeholder="Nhập mã OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="flex-1 rounded border border-gray-300 p-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={verificationLoading}
                  className="ml-2 rounded bg-gray-200 p-2 text-xs hover:bg-gray-300"
                >
                  Gửi lại
                </button>
              </div>

              {import.meta.env.DEV && mockOtp && (
                <div className="mb-2 rounded bg-yellow-100 p-2 text-center text-xs text-yellow-800">
                  DEV MODE: Mã OTP của bạn là <strong>{mockOtp}</strong>
                </div>
              )}

              {verificationError && <div className="mb-2 text-xs text-red-500">{verificationError}</div>}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verificationLoading || !otpCode}
                className={`w-full rounded p-2 text-white ${
                  otpCode ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"
                }`}
              >
                {verificationLoading ? "Đang xác thực..." : "Xác thực OTP"}
              </button>
            </div>
          )}

          {phoneVerificationStep === "verified" && (
            <div className="flex w-full items-center rounded bg-green-100 p-2">
              <span className="text-sm text-green-700">✓ Số điện thoại đã được xác thực</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={verificationLoading}
        >
          {verificationLoading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}
