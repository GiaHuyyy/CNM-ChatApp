import { useGlobalContext } from "../context/GlobalProvider";
import LoginPage from "../pages/LoginPage";
import LoginWithQR from "../pages/LoginWithQR"; // Updated import
import RegisterPage from "../pages/RegisterPage";
import logo from "/chat.png";

export default function AuthLayout() {
  const { isLoginWithEmail, setIsLoginWithEmail } = useGlobalContext();

  const handleLoginWithQR = () => {
    setIsLoginWithEmail(null);
  };

  const handleLoginWithEmail = () => {
    setIsLoginWithEmail(true);
  };

  const handleRegister = () => {
    setIsLoginWithEmail(false);
  };

  const renderAuthPage = () => {
    if (isLoginWithEmail === null) {
      return <LoginWithQR />;  // Updated component name
    } else if (isLoginWithEmail) {
      return <LoginPage />;
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
            {isLoginWithEmail === null ? (
              <p className="text-center font-bold">Đăng nhập bằng mã QR</p>
            ) : isLoginWithEmail ? (
              <p className="text-center font-bold">Đăng nhập bằng Email</p>
            ) : (
              <p className="text-center font-bold">Tạo tài khoản</p>
            )}
          </div>

          <div className="mt-[42px]">{renderAuthPage()}</div>

          <div className="mt-[20px] text-center">
            {isLoginWithEmail !== null && (
              <p className="text-[13px] text-[#333] mb-2">
                <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithQR}>
                  Đăng nhập bằng mã QR
                </span>
              </p>
            )}
            {isLoginWithEmail === null ? (
              <p className="text-[13px] text-[#333]">
                <span className="cursor-pointer text-[#006af5] mr-3" onClick={handleLoginWithEmail}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
