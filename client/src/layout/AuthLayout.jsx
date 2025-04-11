import { useGlobalContext } from "../context/GlobalProvider";
import LoginPage from "../pages/LoginPage";
import LoginWithQR from "../pages/LoginWithQR"; // Updated import
import RegisterPage from "../pages/RegisterPage";
import logo from "/vite.svg";

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
    <div className="flex h-[100vh] justify-center bg-[#e8f3ff]">
      <div className="mt-[70px]">
        <div className="text-center">
          <h1>
            <img src={logo} alt="logo" className="mx-auto mb-[18px] w-[60px] object-cover" />
          </h1>
          <h2 className="text-[17.5px] text-lg text-[#333]">
            Sign in to your account <br />
            to connect with Zz Web
          </h2>
        </div>

        {/* Auth Container */}
        <div className="relative mt-[18px] w-[560px] rounded-lg bg-white pb-3 shadow-xl">
          <div className="flex min-h-14 items-center justify-center border-b border-[#f0f0f0]">
            {isLoginWithEmail === null ? (
              <p className="text-center font-bold">Login with QR Code</p>
            ) : isLoginWithEmail ? (
              <p className="text-center font-bold">Sign in with Email</p>
            ) : (
              <p className="text-center font-bold">Create Account</p>
            )}
          </div>

          <div className="mt-[42px]">{renderAuthPage()}</div>

          <div className="mt-[20px] text-center">
            {isLoginWithEmail !== null && (
              <p className="text-[13px] text-[#333] mb-2">
                <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithQR}>
                  Login with QR Code
                </span>
              </p>
            )}
            {isLoginWithEmail === null ? (
              <p className="text-[13px] text-[#333]">
                <span className="cursor-pointer text-[#006af5] mr-3" onClick={handleLoginWithEmail}>
                  Login with Email
                </span>
                <span className="cursor-pointer text-[#006af5]" onClick={handleRegister}>
                  Create Account
                </span>
              </p>
            ) : isLoginWithEmail ? (
              <p className="text-[13px] text-[#333]">
                Don't have an account?{" "}
                <span className="cursor-pointer text-[#006af5]" onClick={handleRegister}>
                  Register
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-[#333]">
                Already have an account?{" "}
                <span className="cursor-pointer text-[#006af5]" onClick={handleLoginWithEmail}>
                  Sign in
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
