import React, { useState } from "react";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { View, Text, TextInput, TouchableOpacity, CheckBox } from "react-native";

export default function SignUp() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isPasswordMatch, setIsPasswordMatch] = useState(true);
    const [isAgree, setIsAgree] = useState(false);
    const [isPhoneInputFocused, setIsPhoneInputFocused] = useState(false);
    const [isPasswordInputFocused, setIsPasswordInputFocused] = useState(false);
    const [isConfirmPasswordInputFocused, setIsConfirmPasswordInputFocused] = useState(false);

    const handlePasswordVisibilityToggle = () => {
        setIsPasswordVisible((prevState) => !prevState);
    };

    const handlePhoneNumberChange = (text) => {
        // Kiểm tra chỉ cho phép nhập số và giới hạn số lượng ký tự là 10
        const formattedText = text.replace(/[^0-9]/g, "").slice(0, 10);
        setPhoneNumber(formattedText);
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        // Kiểm tra mật khẩu và xác nhận mật khẩu có khớp không
        setIsPasswordMatch(password === text);
    };

    return (
        <View className="flex-1 bg-white">
            {/* Sử dụng HeaderOfSignIn với tiêu đề "Đăng ký" */}
            <HeaderOfSignIn title="Đăng ký" />

            {/* Dòng chữ thông báo dưới header */}
            <View className="bg-[#f8f4f4] p-4">
                <Text className="text-black">
                    Vui lòng nhập thông tin để đăng ký tài khoản
                </Text>
            </View>

            {/* Nội dung SignUp */}
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
                <View className="w-full mb-5 relative">
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mật khẩu"
                        secureTextEntry={!isPasswordVisible}
                        onFocus={() => setIsPasswordInputFocused(true)}
                        onBlur={() => setIsPasswordInputFocused(false)}
                        className={`h-12 w-full border-b-2 px-3 text-base ${isPasswordInputFocused ? "border-blue-500" : "border-gray-400"}`}
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

                {/* Input Xác nhận mật khẩu */}
                <View className="w-full mb-5 relative">
                    <TextInput
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        placeholder="Xác nhận mật khẩu"
                        secureTextEntry={!isPasswordVisible}
                        onFocus={() => setIsConfirmPasswordInputFocused(true)}
                        onBlur={() => setIsConfirmPasswordInputFocused(false)}
                        className={`h-12 w-full border-b-2 px-3 text-base ${isConfirmPasswordInputFocused ? "border-blue-500" : "border-gray-400"}`}
                        style={{ outline: "none" }}
                    />
                    {!isPasswordMatch && (
                        <Text className="text-red-500 text-xs">Mật khẩu không khớp</Text>
                    )}
                </View>

                {/* Ô Tích "Tôi đồng ý với các điều khoản sử dụng" */}
                <View className="flex-row items-start w-full mb-5">
                    <CheckBox
                        value={isAgree}
                        onValueChange={setIsAgree}
                        color={isAgree ? "#007AFF" : undefined}
                    />
                    <Text className="ml-2 text-sm">
                        Tôi đồng ý với{" "}
                        <Text className="text-blue-500">các điều khoản sử dụng</Text>
                    </Text>
                </View>

                {/* Nút Đăng ký */}
                <CustomButton
                    title="Đăng ký"
                    handlePress={() => router.push("/chat")}
                    containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
                    textStyles="text-white text-lg font-bold text-center"
                />
            </View>
        </View>
    );
}
