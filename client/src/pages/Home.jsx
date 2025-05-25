import axios from "axios";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout, setOnlineUser, setUser } from "../redux/userSlice";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import io from "socket.io-client";
import { useGlobalContext } from "../context/GlobalProvider";
import logo from "/chat.png";

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

        // if (response?.data?.data?.logout) {
        //   toast.warning(response?.data?.data?.message);
        //   dispatch(logout());
        //   localStorage.removeItem("token");
        //   navigate("/auth", { replace: true });
        // }
      } catch (error) {
        toast.warning(error.response?.data?.message);
        dispatch(logout());
        localStorage.removeItem("token");
        window.location.href = "/auth";
      }
    };
    fetchUseDetails();
  }, [dispatch, navigate, location]);

  /***
   * Socket connection
   */
  useEffect(() => {
    const socketConnection = io(import.meta.env.VITE_APP_BACKEND_URL, {
      auth: {
        token: localStorage.getItem("token"),
      },
      // Add reconnection options
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Add connection status logging
    socketConnection.on("connect", () => {
      console.log("Socket connection established successfully:", socketConnection.id);

      // Check if there's a conversation ID in the URL to join immediately
      const currentPath = location.pathname;

      // Extract just the ID part without any prefixes
      let conversationId = "";
      if (currentPath.startsWith("/chat/")) {
        conversationId = currentPath.substring(6); // Remove "/chat/"
        console.log("Extracted conversation ID from URL:", conversationId);
      }

      if (conversationId && conversationId !== "") {
        console.log("Emitting joinRoom with ID:", conversationId);
        socketConnection.emit("joinRoom", conversationId);
      }
    });

    socketConnection.on("onlineUser", (data) => {
      console.log("Online user: ", data);
      dispatch(setOnlineUser(data));
    });

    console.log("Socket connection initialized");

    // Save socket to global context
    setSocketConnection(socketConnection);

    // Also save to window for access during page reloads
    window.socketConnection = socketConnection;

    // Dispatch event for other components to know socket is ready
    window.dispatchEvent(
      new CustomEvent("socketConnected", {
        detail: { socket: socketConnection },
      }),
    );

    return () => {
      console.log("Disconnecting socket");
      socketConnection.disconnect();
      window.socketConnection = null;
    };
  }, [dispatch, setSocketConnection, location.pathname]);

  const handleGroupCreated = (conversationId) => {
    console.log("Group created with ID:", conversationId);
    // No need to navigate here, since the GroupChatModal now handles navigation
  };

  // Determine what page we're on
  const isBaseChatPath = location.pathname === "/chat";
  const isBookphonePath = location.pathname.startsWith("/bookphone");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <section className="w-[408px] border-r border-gray-300 bg-white">
        {/* Main tab */}
        <Sidebar onGroupCreated={handleGroupCreated} />
      </section>

      {/* Content Area - Either Message or Empty Welcome */}
      {!isBaseChatPath && !isBookphonePath ? (
        <section className="flex-1 bg-white">
          <Outlet />
        </section>
      ) : isBaseChatPath ? (
        <div className="flex flex-1 flex-col items-center">
          <h1 className="mt-20 text-center text-xl flex items-center gap-x-1">
            Chào mừng đến với <img src={logo} alt="logo" className="w-[30px] object-cover" /> <b>Z PC!</b>
          </h1>
          <p className="mt-5 w-1/2 text-center text-sm">
            Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính
            của bạn.
          </p>
        </div>
      ) : null}

      {/* Render BookPhone component when on bookphone routes - positioned directly next to Sidebar */}
      {isBookphonePath && (
        <section className="flex-1 bg-white">
          <Outlet />
        </section>
      )}
    </div>
  );
}
