import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useState } from "react";

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLoginWithEmail, setIsLoginWithEmail] = useState(() => {
    const savedState = localStorage.getItem("authState");
    return savedState !== null ? JSON.parse(savedState) : null;
  });
  const [isLoginWithPhone, setIsLoginWithPhone] = useState(false);
  const [socketConnection, setSocketConnection] = useState(null);
  const [seenMessage, setSeenMessage] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Add notification update function
  const updateNotifications = (count) => {
    setNotifications(count);
    // Update favicon or title if needed
    requestAnimationFrame(() => {
      document.title = count > 0 ? `(${count}) Chat App` : "Chat App";
    });
  };

  // Add this function to fetch room data after connection is established
  const handleSocketConnection = (socket) => {
    setSocketConnection(socket);

    // Check if there's an active conversation to join (from URL)
    const currentPath = window.location.pathname;
    const conversationId = currentPath.substring(1); // Remove the leading slash

    if (conversationId && conversationId.length > 0 && conversationId !== "auth") {
      console.log("URL has conversation ID, joining room:", conversationId);
      // Wait a moment to ensure socket is fully connected
      setTimeout(() => {
        socket.emit("joinRoom", conversationId);
      }, 300);
    }
  };

  // Add a reconnection handler for socket
  useEffect(() => {
    if (socketConnection) {
      const handleDisconnect = () => {
        console.log("Socket disconnected, attempting to reconnect...");
      };

      const handleReconnect = () => {
        console.log("Socket reconnected successfully");
      };

      socketConnection.on("disconnect", handleDisconnect);
      socketConnection.on("reconnect", handleReconnect);

      return () => {
        socketConnection.off("disconnect", handleDisconnect);
        socketConnection.off("reconnect", handleReconnect);
      };
    }
  }, [socketConnection]);

  // Update the useEffect where socket connection is being set
  useEffect(() => {
    if (window.socketConnection) {
      handleSocketConnection(window.socketConnection);
    }

    // Listen for socket connection from Home component
    window.addEventListener("socketConnected", (e) => {
      if (e.detail && e.detail.socket) {
        handleSocketConnection(e.detail.socket);
      }
    });

    return () => {
      window.removeEventListener("socketConnected", handleSocketConnection);
    };
  }, []);

  useEffect(() => {
    if (socketConnection) {
      // Add handler for friend request updates
      socketConnection.on("receiveFriendRequest", () => {
        // Force socket to check for updates
        socketConnection.emit("checkPendingRequests");
      });

      return () => {
        socketConnection.off("receiveFriendRequest");
      };
    }
  }, [socketConnection]);

  return (
    <GlobalContext.Provider
      value={{
        isLoginWithEmail,
        setIsLoginWithEmail,
        isLoginWithPhone,
        setIsLoginWithPhone,
        socketConnection,
        setSocketConnection,
        seenMessage,
        setSeenMessage,
        notifications,
        updateNotifications, // Add new notification values
        isForgotPassword,
        setIsForgotPassword,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

GlobalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Add default export
export default GlobalProvider;
