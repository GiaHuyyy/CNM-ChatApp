import { faEnvelope, faEye, faEyeSlash, faLock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setToken } from "../redux/userSlice";
import { useGlobalContext } from "../context/GlobalProvider";

export default function LoginPage({ onForgotPassword }) {
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setIsForgotPassword } = useGlobalContext();

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!data.email) {
      newErrors.email = "Email là bắt buộc";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Email không hợp lệ";
      isValid = false;
    }

    if (!data.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/login`;
      const response = await axios.post(URL, data, { withCredentials: true });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "Đăng nhập thành công");
        dispatch(setToken(response?.data?.token));
        localStorage.setItem("token", response?.data?.token);
        setData({
          email: "",
          password: "",
        });
        navigate("/chat", { replace: true });
      } else {
        toast.error(response?.data?.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Đăng nhập thất bại";
      if (error.response?.data?.message === "Tài khoản không tồn tại!") {
        setErrors(prev => ({ ...prev, email: "Tài khoản không tồn tại" }));
      } else if (error.response?.data?.message === "Vui lòng kiểm tra lại mật khẩu!") {
        setErrors(prev => ({ ...prev, password: "Mật khẩu không chính xác" }));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <form className="w-[310px]" onSubmit={handleLogin}>
        <div className={`mb-[18px] flex items-center border-b ${errors.email ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <FontAwesomeIcon icon={faEnvelope} width={8.5} className={errors.email ? 'text-red-500' : ''} />
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email"
            className="ml-3 flex-1 text-sm outline-none"
            value={data.email}
            onChange={handleOnChange}
            required
          />
        </div>
        {errors.email && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.email}</p>}

        <div className={`mb-[18px] flex items-center border-b ${errors.password ? 'border-red-500' : 'border-[#f0f0f0]'} py-[5px]`}>
          <FontAwesomeIcon icon={faLock} width={8.5} className={errors.password ? 'text-red-500' : ''} />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            id="password"
            placeholder="Mật khẩu"
            className="ml-3 flex-1 text-sm outline-none"
            value={data.password}
            onChange={handleOnChange}
            required
          />
          <span className="ml-2 cursor-pointer" onClick={handleShowPassword}>
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} width={10} />
          </span>
        </div>
        {errors.password && <p className="mb-2 -mt-3 text-xs text-red-500">{errors.password}</p>}

        <button
          type="submit"
          className="mt-4 h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white hover:bg-[#0180d8] transition-colors duration-300 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Đang đăng nhập...
            </div>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
      <button onClick={handleForgotPassword} className="mt-3 text-sm text-[#006af5] hover:underline">
        Quên mật khẩu?
      </button>
    </div>
  );
}
