import { faEnvelope, faEye, faEyeSlash, faLock, faUser, faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { useGlobalContext } from "../context/GlobalProvider";
import uploadFileToCloud from "../helpers/uploadFileToClound";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [data, setData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });

  const { setIsLoginWithEmail } = useGlobalContext();

  // Add handleImageChange here, before it's used
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }
      setProfilePic(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleShowPassword = () => setShowPassword(!showPassword);

  const handleOnChange = (e) => {
    setData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!data.email || !data.name || !data.password || !data.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (data.password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      // First send OTP
      const otpResponse = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`,
        { email: data.email }
      );

      if (otpResponse.data) {
        toast.success("OTP sent to your email");
        setOtpSent(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
      setLoading(false);
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
      // Upload image first if selected
      let profilePicUrl = null;
      if (profilePic) {
        const uploadResponse = await uploadFileToCloud(profilePic);
        profilePicUrl = uploadResponse.secure_url;
      }

      // First verify OTP
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/verify-otp`,
        { 
          email: data.email,
          otp: otp 
        }
      );

      if (verifyResponse.data) {
        // Then register with profile pic
        const registerResponse = await axios.post(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/register`,
          {
            email: data.email,
            name: data.name,
            password: data.password,
            profilePic: profilePicUrl
          }
        );

        if (registerResponse.data) {
          toast.success("Registration successful");
          setIsLoginWithEmail(true);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!data.email) {
      toast.error("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const otpResponse = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/send-otp`,
        { email: data.email }
      );

      if (otpResponse.data) {
        toast.success("OTP sent to your email");
        setOtpSent(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
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
            placeholder="Email address"
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
            placeholder="Full name"
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
            placeholder="Password"
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
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm password"
            className="ml-3 flex-1 text-sm"
            value={data.confirmPassword}
            onChange={handleOnChange}
            required
          />
        </div>

        {/* Add this before the password fields */}
        <div className="mb-[18px] flex flex-col items-center border-b border-[#f0f0f0] py-[5px]">
          <div className="flex w-full items-center">
            <FontAwesomeIcon icon={faImage} width={8.5} />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="ml-3 flex-1 text-sm"
            />
          </div>
          {previewImage && (
            <div className="mt-2">
              <img
                src={previewImage}
                alt="Profile preview"
                className="h-20 w-20 rounded-full object-cover"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading || !otpSent}
        >
          {loading ? "Processing..." : "Register"}
        </button>
      </form>
    </div>
  );
}
