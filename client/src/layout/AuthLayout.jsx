import { useState, useEffect, useRef } from "react";
import logo from "/vite.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import LoginWithQR from "../pages/LoginWithQR";
import LoginWithPhonePage from "../pages/LoginWithPhonePage";
import RegisterPage from "../pages/RegisterPage";
import { useGlobalContext } from "../context/GlobalProvider";

export default function AuthLayout() {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const { isLoginWithQR, setIsLoginWithQR, isLoginWithPhone, setIsLoginWithPhone } = useGlobalContext();

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleClickOutside = (event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target)
    ) {
      setDropdownVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLoginWithPhone = () => {
    setIsLoginWithPhone(true);
    setIsLoginWithQR(false);
    setDropdownVisible(false);
  };

  const handleLoginWithQR = () => {
    setIsLoginWithPhone(false);
    setIsLoginWithQR(true);
  };

  const handleRegister = () => {
    setIsLoginWithPhone(false);
    setIsLoginWithQR(false);
  };

  const renderAuthPage = () => {
    if (isLoginWithQR && !isLoginWithPhone) {
      return <LoginWithQR />;
    } else if (!isLoginWithQR && isLoginWithPhone) {
      return <LoginWithPhonePage />;
    } else {
      return <RegisterPage />;
    }
  };

  return (
    <div className="flex h-[100vh] justify-center bg-[#e8f3ff]">
      <div className="mt-[70px]">
        <div className="text-center">
          <h1>
            <img src={logo} alt="logo" className="mx-auto mb-[18px] w-[60px] object-cover" />
          </h1>
          <h2 className="text-[17.5px] text-lg text-[#333]">
            Đăng nhập tài khoản Zz <br />
            để kết nối với ứng dụng Zz Web
          </h2>
        </div>

        {/* Action */}
        <div className="relative mt-[18px] w-[560px] rounded-lg bg-white pb-3 shadow-xl">
          <div className="flex min-h-14 items-center justify-center border-b border-[#f0f0f0]">
            {isLoginWithQR && <p className="text-center font-bold">Đăng nhập qua mã QR</p>}
            {isLoginWithPhone && <p className="text-center font-bold">Đăng nhập với mật khẩu</p>}
            {!isLoginWithQR && !isLoginWithPhone && <p className="text-center font-bold">Đăng ký</p>}
          </div>

          {isLoginWithQR ? (
            <button
              ref={buttonRef}
              className="absolute right-3 top-3 rounded-md border border-[#d9d9d9] px-[15px] py-1"
              onClick={toggleDropdown}
            >
              <FontAwesomeIcon icon={faBars} width={11} />
            </button>
          ) : (
            <></>
          )}

          {dropdownVisible && (
            <div
              ref={dropdownRef}
              className="absolute right-3 top-[48px] w-[200px] cursor-pointer rounded-md bg-white p-[5px] text-center shadow-lg"
              onClick={handleLoginWithPhone}
            >
              <p className="text-sm">Đăng nhập với mật khẩu</p>
            </div>
          )}

          <div className="mt-[42px]">{renderAuthPage()}</div>

          {!isLoginWithQR && (
            <div className="mt-[20px] text-center">
              <button className="mt-3 text-sm font-bold text-[#006af5]" onClick={handleLoginWithQR}>
                Đăng nhập qua mã QR
              </button>
            </div>
          )}

          {(isLoginWithPhone || isLoginWithQR) && (
            <div className="mt-[20px] text-center">
              <p className="text-[13px] text-[#333]">
                Bạn chưa có tài khoản?{" "}
                <span className="cursor-pointer text-[#006af5]" onClick={handleRegister}>
                  Đăng ký
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
