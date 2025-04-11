import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faGear } from "@fortawesome/free-solid-svg-icons";

export default function Profile() {
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

      {/* Profile row - ngang, chiều cao 40px */}
      <View className="h-[40px] flex-row items-center px-4 mt-4 border-b border-gray-300">
        <Image
          source={{
            uri: "https://res-zalo.zadn.vn/upload/media/2021/6/4/2_1622800570007_369788.jpg",
          }}
          className="w-[32px] h-[32px] rounded-full mr-3 mb-3"
        />
        <View>
          <Text className="text-base font-semibold leading-4">
            Nguyễn Văn A
          </Text>
          <Text className="text-blue-500 text-xs leading-4 mb-3">
            Xem trang cá nhân
          </Text>
        </View>
      </View>
    </View>
  );
}
