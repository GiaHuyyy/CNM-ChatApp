import React, { useState } from "react";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isEmailInputFocused, setIsEmailInputFocused] = useState(false);
  const [isPasswordInputFocused, setIsPasswordInputFocused] = useState(false);

  const handlePasswordVisibilityToggle = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <HeaderOfSignIn title="Đăng nhập" />

      {/* Thông báo dưới header */}
      <View className="bg-[#f8f4f4] p-4">
        <Text className="text-black">
          Vui lòng nhập email và mật khẩu để đăng nhập
        </Text>
      </View>

      {/* Nội dung chính */}
      <View className="flex-1 mt-10 items-center px-6">
        {/* Input Email */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          onFocus={() => setIsEmailInputFocused(true)}
          onBlur={() => setIsEmailInputFocused(false)}
          className={`h-12 w-full border-b-2 px-3 mb-5 text-base ${isEmailInputFocused ? "border-blue-500" : "border-gray-400"
            }`}
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
            className={`h-12 w-full border-b-2 px-3 mb-3 text-base ${isPasswordInputFocused ? "border-blue-500" : "border-gray-400"
              }`}
            style={{ outline: "none" }}
          />

          {/* Toggle hiển thị mật khẩu */}
          <TouchableOpacity
            onPress={handlePasswordVisibilityToggle}
            className="absolute right-3 top-3"
          >
            <Text className="text-gray-500 text-sm">
              {isPasswordVisible ? "ẨN" : "HIỆN"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Link lấy lại mật khẩu */}
        <View className="mb-5 flex-row justify-start w-full">
          <TouchableOpacity
            onPress={() => router.push("/forgot-password")}
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
