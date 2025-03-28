import axios from "axios";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout, setOnlineUser, setUser } from "../redux/userSlice";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import io from "socket.io-client";
import { useGlobalContext } from "../context/GlobalProvider";

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSocketConnection } = useGlobalContext();

  useEffect(() => {
    const fetchUseDetails = async () => {
      try {
        const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/user-details`;
        const response = await axios.get(URL, { withCredentials: true });

        dispatch(setUser(response?.data?.data));

        if (response?.data?.data?.logout) {
          toast.warning(response?.data?.data?.message);
          dispatch(logout());
          localStorage.removeItem("token");
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        toast.error(error.response?.data?.message);
      }
    };
    fetchUseDetails();
  }, [dispatch, navigate]);

  /***
   * Socket connection
   */
  useEffect(() => {
    const socketConnection = io(import.meta.env.VITE_APP_BACKEND_URL, {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    socketConnection.on("onlineUser", (data) => {
      console.log("Online user: ", data);
      dispatch(setOnlineUser(data));
    });
    console.log("Socket connection: ", socketConnection);
    // Save socket connection to global context
    setSocketConnection(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [dispatch, setSocketConnection]);

  const basePath = location.pathname === "/";

  const handleGroupCreated = (conversationId) => {

    console.log("Group created with ID:", conversationId);
    
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <section className="w-[408px] border-r border-gray-300 bg-white">
        {/* Main tab */}
        <Sidebar onGroupCreated={handleGroupCreated} />

        {/*  */}
      </section>

      {/* Message component */}
      <section className={`flex-1 bg-white ${basePath && "hidden"}`}>
        <Outlet />
      </section>

      {/* Default */}
      <div className={`flex flex-1 flex-col items-center ${!basePath && "hidden"}`}>
        <h1 className="mt-20 text-center text-xl">
          Chào mừng đến với <b>Z PC!</b>
        </h1>
        <p className="mt-5 w-1/2 text-center text-sm">
          Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của
          bạn.
        </p>
      </div>
    </div>
  );
}
