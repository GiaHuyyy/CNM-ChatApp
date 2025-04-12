import { faEnvelope, faEye, faEyeSlash, faLock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { setToken } from "../redux/userSlice";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleOnChange = (e) => {
    setData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!data.email || !data.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/login`,
        {
          email: data.email,
          password: data.password
        }, { withCredentials: true }
      );

      if (response.data.success) {
        // Store in Redux
        dispatch(setToken(response.data.token));

        // Store in localStorage
        localStorage.setItem("token", response.data.token);

        // Reset form
        setData({
          email: "",
          password: "",
        });

        // Show success message
        toast.success(response.data.message || "Login successful");

        // Navigate to home page
        navigate("/", { replace: true });
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error.response?.data);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <form className="w-[310px]" onSubmit={handleLogin}>
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

        <button
          type="submit"
          className="mt-4 h-[44px] w-full bg-[#0190f3] px-5 font-medium text-white disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}