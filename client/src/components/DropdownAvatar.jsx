import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DropdownAvatar({ dropdownAvatarRef, dataUser, openEditUserDetails }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/logout`;
    try {
      const response = await axios.get(URL, { withCredentials: true });
      toast.success(response.data.message);
      console.log(response.data);
      localStorage.removeItem("token");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };
  return (
    <div ref={dropdownAvatarRef} className="absolute -top-3 left-16 py-2 mt-14 w-[298px] bg-white shadow-md rounded z-10">
      <p className="px-2 mb-2 text-lg font-bold">{dataUser?.name}</p>

      <div className="h-[1px] bg-[#00000026] my-1 mx-2"></div>

      <button className="flex items-center justify-between w-full h-9 text-left px-2 hover:bg-gray-200">
        <span className="text-sm">Nâng cấp tài khoản</span>
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} width={15} />
      </button>
      <button className="w-full h-9 text-left px-2 hover:bg-gray-200" onClick={openEditUserDetails}>
        <span className="text-sm">Hồ sơ của bạn</span>
      </button>
      <button className="w-full h-9 text-left px-2 hover:bg-gray-200">
        <span className="text-sm">Cài đặt</span>
      </button>

      <div className="h-[1px] bg-[#00000026] my-1 mx-2"></div>

      <button className="w-full h-9 text-left px-2 hover:bg-gray-200" onClick={handleLogout}>
        <span className="text-sm">Đăng xuất</span>
      </button>
    </div>
  );
}

DropdownAvatar.propTypes = {
  dropdownAvatarRef: PropTypes.object,
  dataUser: PropTypes.object,
  openEditUserDetails: PropTypes.func,
};
