import { useState, useRef, useEffect } from "react";
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
import firebase from "../helpers/firebase";

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
      fileInputRef.current.value = null; // Đặt lại giá trị của input file để có thể chọn lại cùng 1 file
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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
    }
  };

  // Send OTP Firebase
  const [phoneNumber, setPhoneNumber] = useState("+1 650-555-1234");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
      size: "normal", // Changed from "invisible" to "normal" to make it visible
      callback: () => {
        // This will be called when user successfully solves the captcha
        setRecaptchaVerified(true);
        console.log("reCAPTCHA verified by user");
      },
      "expired-callback": () => {
        // Reset when expired
        setRecaptchaVerified(false);
        console.log("reCAPTCHA expired");
      },
    });

    // Render the reCAPTCHA widget
    window.recaptchaVerifier.render();
  };

  useEffect(() => {
    try {
      setupRecaptcha();
    } catch (error) {
      console.error("Error setting up reCAPTCHA:", error);
    }

    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.error("Error clearing reCAPTCHA:", error);
        }
      }
    };
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }

    if (!recaptchaVerified) {
      alert("Vui lòng xác nhận reCAPTCHA trước khi gửi OTP");
      return;
    }

    setLoading(true);

    // Format phone number to E.164 format if needed
    // let formattedPhone = phoneNumber;
    // if (!phoneNumber.startsWith("+")) {
    //   formattedPhone = `+84${phoneNumber.replace(/^0/, "")}`;
    // }

    const appVerifier = window.recaptchaVerifier;

    try {
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      // alert("OTP đã được gửi");
      toast.success("OTP đã được gửi");
    } catch (error) {
      console.error("Error sending OTP:", error);

      // Special handling for billing-not-enabled error
      if (error.code === "auth/billing-not-enabled") {
        alert(
          `Lỗi: Tính năng xác thực qua SMS chưa được kích hoạt. Cần kích hoạt thanh toán trên Firebase Console để sử dụng tính năng này.`,
        );
      } else {
        // alert(`Có lỗi xảy ra: ${error.message}`);
        toast.error(`Có lỗi xảy ra: ${error.message}`);
      }

      // Reset reCAPTCHA on error
      setupRecaptcha();
      setRecaptchaVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (!otp) {
      // alert("Vui lòng nhập mã OTP");
      toast.error("Vui lòng nhập mã OTP");
      return;
    }

    setLoading(true);

    try {
      const confirmationResult = window.confirmationResult;
      if (!confirmationResult) {
        alert("Vui lòng gửi OTP trước");
        setLoading(false);
        return;
      }

      await confirmationResult.confirm(otp);
      await handleRegister(e);
      // alert("Xác thực thành công");
      toast.success("Xác thực thành công");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      // alert(`Có lỗi xảy ra: ${error.message}`);
      toast.error(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setLoading(false);
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

        {/* Firebase OPT*/}
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          {/* <h2 className="text-xl font-bold">Xác thực OTP</h2>
        <input
          type="text"
          placeholder="Nhập số điện thoại"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={loading}
          className="w-full max-w-xs rounded border p-2"
        /> */}

          {/* reCAPTCHA container with clear styling */}
          <div className="my-3 flex justify-center">
            <div id="recaptcha-container" className="rounded border border-gray-200 p-1"></div>
          </div>

          <div className="flex items-center gap-2">
            {recaptchaVerified && <span className="text-sm text-green-500">✓ Đã xác thực reCAPTCHA</span>}
          </div>

          {/* Information about Firebase phone auth requirement */}
          <div className="mb-2 w-full max-w-xs text-center text-xs text-orange-600">
            <p>Lưu ý: Xác thực qua SMS yêu cầu kích hoạt thanh toán trên Firebase.</p>
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || !recaptchaVerified}
            className={`w-full max-w-xs rounded p-2 text-white ${recaptchaVerified ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400"}`}
          >
            {loading ? "Đang xử lý..." : "Gửi OTP"}
          </button>

          <input
            type="text"
            placeholder="Xác thực OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
            className="w-full max-w-xs rounded border p-2"
          />

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={loading}
            className="w-full max-w-xs rounded bg-green-500 p-2 text-white hover:bg-green-600"
          >
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </div>

        <button
          className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white"
          disabled={loading || !recaptchaVerified}
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}
