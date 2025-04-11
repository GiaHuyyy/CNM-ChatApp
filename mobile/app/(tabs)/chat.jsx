import React from "react";
import { View, Text, TextInput, FlatList, Image, TouchableOpacity } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { faThumbtack } from "@fortawesome/free-regular-svg-icons";

const chatData = [
  {
    id: "1",
    avatar: {
      uri: "https://res-zalo.zadn.vn/upload/media/2021/6/4/2_1622800570007_369788.jpg",
    },
    name: "Cloud của tôi",
    preview: "[File] STTxx_MaSV_HoTen_BaiNopCh...",
    time: "T4",
    pinned: true,
  },
  {
    id: "2",
    avatar: {
      uri: "blob:https://chat.zalo.me/339dcde5-37d2-41f5-b9fb-f52d6f51d001",
    },
    name: "con chó lầy",
    preview: "# Thêm các dòng sau vào file .env...",
    time: "37 phút",
  },
  {
    id: "3",
    avatar: {
      uri: "blob:https://chat.zalo.me/99004ab0-5c33-4e59-8933-011b607ef5a0",
    },
    name: "Gia Huy",
    preview: "[Link] https://cnm-chat-app.vercel.app/",
    time: "2 giờ",
  },
];

export default function ChatList() {
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

      {/* Chat list */}
      <FlatList
        data={chatData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <Image
              source={item.avatar}
              className="w-[45px] h-[45px] rounded-full mr-3"
            />
            <View className="flex-1">
              <View className="flex-row justify-between">
                <Text className="font-semibold text-base">{item.name}</Text>
                <Text className="text-gray-500 text-sm">{item.time}</Text>
              </View>
              <Text className="text-gray-600 text-sm mt-1">{item.preview}</Text>
            </View>
            {item.pinned && (
              <FontAwesomeIcon icon={faThumbtack} size={14} color="#999" />
            )}
          </View>
        )}
      />
    </View>
  );
}
