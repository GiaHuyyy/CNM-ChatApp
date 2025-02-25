import { faUser } from "@fortawesome/free-regular-svg-icons";
import { faAngleRight, faDatabase, faGear, faGlobe, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Images from "../constants/images";
import { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DropdownSetting({ dropdownSettingRef, openEditUserDetails }) {
  const [submenuVisible, setSubmenuVisible] = useState(null);
  const navigate = useNavigate();

  const handleMouseEnter = (menu) => {
    setSubmenuVisible(menu);
  };

  const handleMouseLeave = () => {
    setSubmenuVisible(null);
  };

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
    <div
      ref={dropdownSettingRef}
      className="absolute bottom-[66px] left-2 py-2 mt-14 w-56 bg-white shadow-md rounded-md z-10"
    >
      <button className="w-full h-9 px-3 text-left hover:bg-gray-200" onClick={openEditUserDetails}>
        <FontAwesomeIcon icon={faUser} width={20} className="mr-3" />
        <span className="text-sm">Thông tin tài khoản</span>
      </button>
      <button className="w-full h-9 px-3 text-left hover:bg-gray-200">
        <FontAwesomeIcon icon={faGear} width={20} className="mr-3" />
        <span className="text-sm">Cài đặt</span>
      </button>

      <div className="h-[1px] bg-[#00000026] my-1 mx-2"></div>

      <button
        className="flex items-center w-full h-9 px-3 text-left hover:bg-gray-200"
        onMouseEnter={() => handleMouseEnter("data")}
        onMouseLeave={handleMouseLeave}
      >
        <FontAwesomeIcon icon={faDatabase} width={20} className="mr-3" />
        <span className="mr-auto text-sm">Dữ liệu</span>
        <FontAwesomeIcon icon={faAngleRight} fontSize={13} />
      </button>
      {submenuVisible === "data" && (
        <div
          className="absolute left-full top-[74px] mt-2 w-[157px] py-2 bg-white shadow-md rounded-md"
          onMouseEnter={() => handleMouseEnter("data")}
        >
          {/* Submenu items for Dữ liệu */}
          <button className="w-full h-9 px-3 text-left text-sm hover:bg-gray-200">Quản lý File</button>
        </div>
      )}
      <button
        className="flex items-center w-full h-9 px-3 text-left hover:bg-gray-200"
        onMouseEnter={() => handleMouseEnter("language")}
        onMouseLeave={handleMouseLeave}
      >
        <FontAwesomeIcon icon={faGlobe} width={20} className="mr-3" />
        <span className="mr-auto text-sm">Ngôn ngữ</span>
        <FontAwesomeIcon icon={faAngleRight} fontSize={13} />
      </button>
      {submenuVisible === "language" && (
        <div
          className="absolute left-full top-[108px] mt-2 w-[157px] py-2 bg-white shadow-md rounded-md"
          onMouseEnter={() => handleMouseEnter("language")}
        >
          {/* Submenu items for Ngôn ngữ */}
          <button className="flex items-center w-full h-9 px-3 text-left text-sm hover:bg-gray-200">
            <img src={Images.VI} alt="Viet Nam" className="w-5 mr-3 object-contain" />
            Tiếng việt ✔
          </button>
          <button className="flex items-center w-full h-9 px-3 text-left text-sm hover:bg-gray-200">
            <img src={Images.EN} alt="Viet Nam" className="w-5 mr-3 object-contain" />
            English
          </button>
        </div>
      )}
      <button
        className="flex items-center w-full h-9 px-3 text-left hover:bg-gray-200"
        onMouseEnter={() => handleMouseEnter("support")}
        onMouseLeave={handleMouseLeave}
      >
        <FontAwesomeIcon icon={faQuestion} width={20} className="mr-3" />
        <span className="mr-auto text-sm">Hỗ trợ</span>
        <FontAwesomeIcon icon={faAngleRight} fontSize={13} />
      </button>
      {submenuVisible === "support" && (
        <div
          className="absolute left-full top-[144px] mt-2 w-[157px] py-2 bg-white shadow-md rounded-md"
          onMouseEnter={() => handleMouseEnter("support")}
        >
          {/* Submenu items for Hỗ trợ */}
          <button className="w-full h-9 px-3 text-left text-sm hover:bg-gray-200">Thông tin phiên bản</button>
          <button className="w-full h-9 px-3 text-left text-sm hover:bg-gray-200">Liên hệ</button>
          <button className="w-full h-9 px-3 text-left text-sm hover:bg-gray-200">Gửi fie log tới Z</button>
        </div>
      )}

      <div className="h-[1px] bg-[#00000026] my-1 mx-2"></div>

      <button className="w-full h-9 px-3 text-left hover:bg-gray-200" onClick={handleLogout}>
        <span className="mr-[32px]"></span>
        <span className="text-sm text-[#c31818]">Đăng xuất</span>
      </button>
    </div>
  );
}

DropdownSetting.propTypes = {
  dropdownSettingRef: PropTypes.object,
  openEditUserDetails: PropTypes.func,
};
