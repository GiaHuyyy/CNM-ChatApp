import { useGlobalContext } from "../context/GlobalProvider";
import LoginPage from "../pages/LoginPage";
import LoginWithQR from "../pages/LoginWithQR";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import logo from "/chat.png";

export default function AuthLayout() {
  const { isLoginWithEmail, setIsLoginWithEmail, isForgotPassword, setIsForgotPassword } = useGlobalContext();

  const handleLoginWithQR = () => {
    setIsLoginWithEmail(null);
    setIsForgotPassword(false);
  };

  const handleLoginWithEmail = () => {
    setIsLoginWithEmail(true);
    setIsForgotPassword(false);
  };

  const handleRegister = () => {
    setIsLoginWithEmail(false);
    setIsForgotPassword(false);
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
  };

  const renderAuthPage = () => {
    if (isForgotPassword) {
      return <ForgotPasswordPage />;
    } else if (isLoginWithEmail === null) {
      return <LoginWithQR />;
    } else if (isLoginWithEmail) {
      return <LoginPage onForgotPassword={handleForgotPassword} />;
    } else {
      return <RegisterPage />;
    }
  };

  return (
    <div className="flex h-[110vh] justify-center bg-[#e8f3ff]">
      <div className="mt-[70px]">
        <div className="text-center">
          <h1>
            <img src={logo} alt="logo" className="mx-auto mb-[18px] w-[60px] object-cover" />
          </h1>
          <h2 className="text-[17.5px] text-lg text-[#333]">
            Đăng nhập vào tài khoản của bạn <br />
            để kết nối với ChatNow Web
          </h2>
        </div>

        {/* Auth Container */}
        <div className="relative mt-[18px] w-[560px] rounded-lg bg-white pb-3 shadow-xl">
          <div className="flex min-h-14 items-center justify-center border-b border-[#f0f0f0]">
            {isForgotPassword ? (
              <p className="text-center font-bold">Khôi phục mật khẩu</p>
            ) : isLoginWithEmail === null ? (
              <p className="text-center font-bold">Đăng nhập bằng mã QR</p>
            ) : isLoginWithEmail ? (
              <p className="text-center font-bold">Đăng nhập bằng Email</p>
            ) : (
              <p className="text-center font-bold">Tạo tài khoản</p>
            )}
          </div>

          <div className="mt-[42px]">{renderAuthPage()}</div>

          <div className="mt-[20px] text-center">
            {!isForgotPassword && isLoginWithEmail !== null && (
              <p className="mb-2 text-[13px] text-[#333]">
                <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithQR}>
                  Đăng nhập bằng mã QR
                </span>
              </p>
            )}
            {!isForgotPassword && (
              <>
                {isLoginWithEmail === null ? (
                  <p className="text-[13px] text-[#333]">
                    <span className="mr-3 cursor-pointer text-[#006af5]" onClick={handleLoginWithEmail}>
                      Đăng nhập bằng Email
                    </span>
                    <span className="cursor-pointer text-[#006af5]" onClick={handleRegister}>
                      Tạo tài khoản
                    </span>
                  </p>
                ) : isLoginWithEmail ? (
                  <p className="text-[13px] text-[#333]">
                    Chưa có tài khoản?{" "}
                    <span className="cursor-pointer text-[#006af5]" onClick={handleRegister}>
                      Đăng ký
                    </span>
                  </p>
                ) : (
                  <p className="text-[13px] text-[#333]">
                    Đã có tài khoản?{" "}
                    <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithEmail}>
                      Đăng nhập
                    </span>
                  </p>
                )}
              </>
            )}
            {isForgotPassword && (
              <p className="text-[13px] text-[#333]">
                <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithEmail}>
                  Quay lại đăng nhập
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
