import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faGear } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import axios from "axios";

export default function Profile() {
  const token = useSelector((state) => state.user.token);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/user-details", {
          withCredentials: true,
        });
        setUserInfo(response.data.data); // assuming { user: { name, profilePic, ... } }
      } catch (error) {
        console.error("Error fetching user info:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Không thể tải thông tin người dùng</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-blue-500 px-4 py-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Hồ sơ</Text>
        <TouchableOpacity>
          <FontAwesomeIcon icon={faGear} size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile row */}
      <View className="h-[40px] flex-row items-center px-4 mt-4 border-b border-gray-300">
        <Image
          source={{ uri: userInfo.profilePic }}
          className="w-[32px] h-[32px] rounded-full mr-3 mb-3"
        />
        <View>
          <Text className="text-base font-semibold leading-4">{userInfo.name}</Text>
          <Text className="text-blue-500 text-xs leading-4 mb-3">Xem trang cá nhân</Text>
        </View>
      </View>
    </View>
  );
}
