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

        <button className="h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white">Đăng ký</button>
      </form>
    </div>
  );
}
