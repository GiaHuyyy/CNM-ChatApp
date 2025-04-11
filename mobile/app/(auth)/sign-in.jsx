import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import CustomButton from "../../components/CustomButton";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { setUser, setToken } from "../redux/userSlice";
import axios from "axios";// sửa đường dẫn nếu khác

export default function SignIn() {
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/login",
        { email, password },
        { withCredentials: true } // Nếu server set cookie, nhưng bạn vẫn dùng token ở body
      );

      const data = response.data;

      if (data.success) {
        // Lưu token và user vào Redux
        dispatch(setToken(data.token));
        localStorage.setItem("token", data?.token);
        // Điều hướng
        router.push("/profile");
      } else {
        alert(data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error.response?.data || error.message);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    }
  };


  return (
    <View className="flex-1 bg-white">
      <HeaderOfSignIn title="Đăng nhập" />
      <View className="bg-[#f8f4f4] p-4">
        <Text className="text-black">Vui lòng nhập email và mật khẩu để đăng nhập</Text>
      </View>
      <View className="flex-1 mt-10 items-center px-6">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          className="h-12 w-full border-b-2 px-3 mb-5 text-base border-gray-400"
        />
        <View className="w-full mb-3 relative">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry={!isPasswordVisible}
            className="h-12 w-full border-b-2 px-3 mb-3 text-base border-gray-400"
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute right-3 top-3">
            <Text className="text-gray-500 text-sm">
              {isPasswordVisible ? "ẨN" : "HIỆN"}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mb-5 flex-row justify-start w-full">
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text className="text-blue-500 text-sm font-bold">Lấy lại mật khẩu</Text>
          </TouchableOpacity>
        </View>
        <CustomButton
          title="Đăng nhập"
          handlePress={handleLogin}
          containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
          textStyles="text-white text-lg font-bold text-center"
        />
      </View>
    </View>
  );
}
