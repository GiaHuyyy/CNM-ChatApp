import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import CustomButton from "../../components/CustomButton";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { setUser, setToken } from "../redux/userSlice";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "@env";
export default function SignIn() {
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/login`,
        { email, password },
        { withCredentials: true }
      );

      const data = response.data;

      if (data.success) {
        // Store token in AsyncStorage
        await AsyncStorage.setItem("token", data.token);

        // Set token in Redux
        dispatch(setToken(data.token));

        // Fetch user details after login
        const userResponse = await axios.get(
          `${BACKEND_URL}/api/user-details`,
          {
            headers: { Authorization: `Bearer ${data.token}` },
            withCredentials: true
          }
        );

        if (userResponse.data.success) {
          // Save user data in Redux
          dispatch(setUser(userResponse.data.data));
        }

        // Navigate to chat screen
        router.push("/chat");
      } else {
        Alert.alert("Thông báo", data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi đăng nhập",
        error.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
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
          keyboardType="email-address"
          autoCapitalize="none"
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

        {isLoading ? (
          <View className="py-3 w-4/5 mx-auto mb-3 items-center">
            <ActivityIndicator size="large" color="#0066cc" />
          </View>
        ) : (
          <CustomButton
            title="Đăng nhập"
            handlePress={handleLogin}
            containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
            textStyles="text-white text-lg font-bold text-center"
          />
        )}
      </View>
    </View>
  );
}
