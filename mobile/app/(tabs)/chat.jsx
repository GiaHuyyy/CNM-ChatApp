import React, { useEffect } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";

export default function Chat() {
  const dispatch = useDispatch();
  const { setSocketConnection } = useGlobalContext();

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const socketConnection = io('http://localhost:5000', {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketConnection.on("connect", () => {
          console.log("🔌 Socket connected: ", socketConnection.id);
        });

        socketConnection.on("onlineUser", (data) => {
          console.log("🟢 Online users: ", data);
          dispatch(setOnlineUser(data));
        });

        setSocketConnection(socketConnection);

        return () => {
          console.log("❌ Disconnecting socket");
          socketConnection.disconnect();
        };
      } catch (err) {
        console.log("Socket connection error:", err);
      }
    };

    connectSocket();
  }, [dispatch, setSocketConnection]);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
        <View className="flex-row items-center bg-white rounded-full px-3 py-1 flex-1 mr-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
          <TextInput
            placeholder="Tìm kiếm"
            className="ml-2 flex-1 text-sm"
            placeholderTextColor="#888"
            style={{ outline: "none" }}
          />
        </View>
        <TouchableOpacity className="mx-1">
          <FontAwesomeIcon icon={faQrcode} size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="ml-1">
          <FontAwesomeIcon icon={faPlus} size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
