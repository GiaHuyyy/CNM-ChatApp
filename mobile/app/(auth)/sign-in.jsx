import React, { useState } from "react";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function SignIn() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPhoneInputFocused, setIsPhoneInputFocused] = useState(false);
  const [isPasswordInputFocused, setIsPasswordInputFocused] = useState(false);

  const handlePasswordVisibilityToggle = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const handlePhoneNumberChange = (text) => {
    // Kiểm tra chỉ cho phép nhập số và giới hạn số lượng ký tự là 10
    const formattedText = text.replace(/[^0-9]/g, "").slice(0, 10);
    setPhoneNumber(formattedText);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Sử dụng HeaderOfSignIn với tiêu đề "Đăng nhập" */}
      <HeaderOfSignIn title="Đăng nhập" />

      {/* Dòng chữ thông báo dưới header */}
      <View className="bg-[#f8f4f4] p-4">
        <Text className="text-black">
          Vui lòng nhập số điện thoại và mật khẩu để đăng nhập
        </Text>
      </View>

      {/* Nội dung SignIn */}
      <View className="flex-1 mt-10 items-center px-6">
        {/* Input Số điện thoại */}
        <TextInput
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange} // Sử dụng hàm xử lý nhập số điện thoại
          placeholder="Số điện thoại"
          keyboardType="phone-pad"
          onFocus={() => setIsPhoneInputFocused(true)}
          onBlur={() => setIsPhoneInputFocused(false)}
          className={`h-12 w-full border-b-2 px-3 mb-5 text-base ${isPhoneInputFocused ? "border-blue-500" : "border-gray-400"}`}
          style={{ outline: "none" }}
        />

        {/* Input Mật khẩu */}
        <View className="w-full mb-3 relative">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry={!isPasswordVisible}
            onFocus={() => setIsPasswordInputFocused(true)}
            onBlur={() => setIsPasswordInputFocused(false)}
            className={`h-12 w-full border-b-2 px-3 mb-3 text-base ${isPasswordInputFocused ? "border-blue-500" : "border-gray-400"}`}
            style={{ outline: "none" }}
          />

          {/* Nút hiển thị/ẩn mật khẩu */}
          <TouchableOpacity
            onPress={handlePasswordVisibilityToggle}
            className="absolute right-3 top-3"
          >
            <Text className="text-gray-500 text-sm">
              {isPasswordVisible ? "ẨN" : "HIỆN"}
            </Text>
          </TouchableOpacity>
        </View>


        {/* Dòng "Lấy lại mật khẩu" */}
        <View className="mb-5 flex-row justify-start w-full">
          <TouchableOpacity
            onPress={() => router.push("/forgot-password")} // Thay đổi link theo đường dẫn của bạn
          >
            <Text className="text-blue-500 text-sm font-bold">
              Lấy lại mật khẩu
            </Text>
          </TouchableOpacity>
        </View>


        {/* Nút đăng nhập */}
        <CustomButton
          title="Đăng nhập"
          handlePress={() => router.push("/chat")}
          containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
          textStyles="text-white text-lg font-bold text-center"
        />
      </View>
    </View>
  );
}
