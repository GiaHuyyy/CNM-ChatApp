import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    CheckBox,
    Modal,
    Pressable,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isPasswordMatch, setIsPasswordMatch] = useState(true);
    const [isAgree, setIsAgree] = useState(false);
    const [isEmailInputFocused, setIsEmailInputFocused] = useState(false);
    const [isPasswordInputFocused, setIsPasswordInputFocused] = useState(false);
    const [isConfirmPasswordInputFocused, setIsConfirmPasswordInputFocused] = useState(false);
    const [avatarUri, setAvatarUri] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const handlePasswordVisibilityToggle = () => {
        setIsPasswordVisible((prevState) => !prevState);
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        setIsPasswordMatch(password === text);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: true,
            aspect: [1, 1],
        });

        if (!result.canceled) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleSendOtp = () => {
        if (!email) return;
        setModalMessage("Mã OTP đã được gửi đến email của bạn");
        setModalVisible(true);
        setShowOtpInput(true);
    };

    return (
        <View className="flex-1 bg-white">
            <HeaderOfSignIn title="Đăng ký" />

            <View className="bg-[#f8f4f4] p-4">
                <Text className="text-black">Vui lòng nhập thông tin để đăng ký tài khoản</Text>
            </View>

            <View className="flex-1 mt-10 items-center px-6">
                {/* Chọn ảnh đại diện */}
                <TouchableOpacity onPress={pickImage} className="mb-6 items-center">
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} className="w-24 h-24 rounded-full mb-2" />
                    ) : (
                        <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-2">
                            <Text className="text-gray-500">Chọn ảnh</Text>
                        </View>
                    )}
                    <Text className="text-blue-500 text-sm">Chọn ảnh đại diện</Text>
                </TouchableOpacity>

                {/* Input Email */}
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setIsEmailInputFocused(true)}
                    onBlur={() => setIsEmailInputFocused(false)}
                    className={`h-12 w-full border-b-2 px-3 mb-3 text-base ${isEmailInputFocused ? "border-blue-500" : "border-gray-400"
                        }`}
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
                        className={`h-12 w-full border-b-2 px-3 text-base ${isPasswordInputFocused ? "border-blue-500" : "border-gray-400"
                            }`}
                        style={{ outline: "none" }}
                    />
                    <TouchableOpacity
                        onPress={handlePasswordVisibilityToggle}
                        className="absolute right-3 top-3"
                    >
                        <Text className="text-gray-500 text-sm">
                            {isPasswordVisible ? "ẨN" : "HIỆN"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Xác nhận mật khẩu */}
                <View className="w-full mb-5 relative">
                    <TextInput
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        placeholder="Xác nhận mật khẩu"
                        secureTextEntry={!isPasswordVisible}
                        onFocus={() => setIsConfirmPasswordInputFocused(true)}
                        onBlur={() => setIsConfirmPasswordInputFocused(false)}
                        className={`h-12 w-full border-b-2 px-3 text-base ${isConfirmPasswordInputFocused ? "border-blue-500" : "border-gray-400"
                            }`}
                        style={{ outline: "none" }}
                    />
                    {!isPasswordMatch && (
                        <Text className="text-red-500 text-xs mt-1">Mật khẩu không khớp</Text>
                    )}
                </View>

                {/* Nút Gửi mã OTP */}
                <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={!email}
                    className={`py-2 px-4 rounded mb-4 ${email ? "bg-blue-500" : "bg-gray-300"}`}
                >
                    <Text className="text-white font-bold text-sm">Gửi mã OTP</Text>
                </TouchableOpacity>

                {/* Input mã OTP */}
                {showOtpInput && (
                    <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Nhập mã OTP"
                        keyboardType="number-pad"
                        className="h-12 w-full border-b-2 px-3 mb-5 text-base border-gray-400"
                        style={{ outline: "none" }}
                    />
                )}

                {/* Checkbox đồng ý điều khoản */}
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

                {/* Nút đăng ký */}
                <CustomButton
                    title="Đăng ký"
                    handlePress={() => {
                        if (isAgree && email && password && password === confirmPassword && otp) {
                            router.push("/chat");
                        } else {
                            setModalMessage(
                                "Vui lòng điền đầy đủ thông tin, nhập OTP và đồng ý điều khoản."
                            );
                            setModalVisible(true);
                        }
                    }}
                    containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
                    textStyles="text-white text-lg font-bold text-center"
                />
            </View>

            {/* Popup Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white p-6 rounded-xl w-4/5 shadow-lg items-center">
                        <Text className="text-base text-black text-center mb-4">
                            {modalMessage}
                        </Text>
                        <Pressable
                            onPress={() => setModalVisible(false)}
                            className="bg-blue-500 px-6 py-2 rounded-full"
                        >
                            <Text className="text-white font-semibold">Đóng</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
