import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'; // Icon back
import { useRouter } from "expo-router"; // Optional: for navigation
import { SafeAreaView } from "react-native-safe-area-context";

const HeaderOfSignIn = ({ title }) => {
  const router = useRouter(); // Optional: use for navigation

  // Hàm xử lý quay lại trang trước
  const handleBack = () => {
    router.back(); // Chuyển về trang trước nếu dùng expo-router
  };

  return (
    <SafeAreaView className="bg-blue-500">
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} size={19} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg ml-4">{title}</Text>
      </View>
    </SafeAreaView>
  );
};

export default HeaderOfSignIn;
