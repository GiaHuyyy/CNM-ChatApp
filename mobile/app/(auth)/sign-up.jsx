import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Modal, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import axios from "axios";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import uploadFileToCloud from "../../helpers/uploadFileToCloud";

export default function SignUp() {
    const [data, setData] = useState({
        email: "",
        name: "",
        password: "",
        confirmPassword: "",
    });
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (key, value) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const file = result.assets[0];
            if (file.fileSize > 5 * 1024 * 1024) {
                return showModal("Ảnh phải nhỏ hơn 5MB");
            }
            setAvatar(file);
        }
    };

    const showModal = (message) => {
        setModalMessage(message);
        setModalVisible(true);
    };

    const sendOtp = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email) return showModal("Vui lòng nhập email");
        if (!emailRegex.test(data.email)) return showModal("Email không hợp lệ");

        setLoading(true);
        try {
            const res = await axios.post(`http://localhost:5000/api/send-otp`, {
                email: data.email,
            });
            if (res.data) {
                showModal("Đã gửi OTP tới email");
                setOtpSent(true);
            }
        } catch (err) {
            showModal(err.response?.data?.message || "Lỗi khi gửi OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const { email, name, password, confirmPassword } = data;

        if (!email || !name || !password || !confirmPassword || !otp)
            return showModal("Vui lòng điền đầy đủ thông tin");

        if (password !== confirmPassword) return showModal("Mật khẩu không khớp");
        if (password.length < 4) return showModal("Mật khẩu tối thiểu 4 ký tự");

        setLoading(true);
        try {
            // Xác minh OTP
            const verify = await axios.post(`http://localhost:5000/api/verify-otp`, {
                email,
                otp,
            });

            if (!verify.data?.success) return showModal("OTP không hợp lệ hoặc đã hết hạn");

            // Upload avatar nếu có
            let avatarUrl = null;
            if (avatar?.uri) {
                const upload = await uploadFileToCloud(avatar); // đảm bảo bạn có helper giống trên web
                avatarUrl = upload.secure_url;
            }

            // Đăng ký tài khoản
            const register = await axios.post(`http://localhost:5000/api/register`, {
                email,
                name,
                password,
                profilePic: avatarUrl,
            });
            console.log("Phản hồi đăng ký:", register.data);

            if (register.data?.success) {
                showModal("Đăng ký thành công");
                setTimeout(() => {
                    setModalVisible(false);
                    router.push("/sign-in");
                }, 1500);
            } else {
                showModal(register.data.message || "Đăng ký thất bại");
            }
        } catch (err) {
            console.log("Đăng ký lỗi:", err);
            showModal(err.response?.data?.message || "Lỗi khi đăng ký");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <HeaderOfSignIn title="Đăng Ký" className="mb-4" />
            <View className="items-center px-6 mt-4">
                <TouchableOpacity onPress={pickImage} className="items-center mb-6">
                    {avatar?.uri ? (
                        <Image source={{ uri: avatar.uri }} className="w-24 h-24 rounded-full mb-2" />
                    ) : (
                        <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-2">
                            <Text className="text-gray-500">Chọn ảnh</Text>
                        </View>
                    )}
                    <Text className="text-blue-500 text-sm">Chọn ảnh đại diện</Text>
                </TouchableOpacity>
            </View>

            <View className="px-6">
                <View className="flex-row items-center border-b border-gray-300 mb-4">
                    <TextInput
                        className="flex-1 h-10 text-base px-2"
                        placeholder="Email"
                        value={data.email}
                        onChangeText={(value) => handleChange("email", value)}
                    />
                    <TouchableOpacity
                        className={`px-2 py-1 rounded ${data.email ? "bg-blue-500" : "bg-gray-300"}`}
                        disabled={!data.email || loading}
                        onPress={sendOtp}
                    >
                        <Text className="text-white text-xs">{otpSent ? "Gửi lại" : "Gửi OTP"}</Text>
                    </TouchableOpacity>
                </View>

                {otpSent && (
                    <TextInput
                        className="border-b border-gray-300 mb-4 h-10 text-base px-2"
                        placeholder="Nhập mã OTP"
                        keyboardType="number-pad"
                        value={otp}
                        onChangeText={setOtp}
                    />
                )}

                <TextInput
                    className="border-b border-gray-300 mb-4 h-10 text-base px-2"
                    placeholder="Họ và tên"
                    value={data.name}
                    onChangeText={(value) => handleChange("name", value)}
                />

                <View className="border-b border-gray-300 mb-4 flex-row items-center">
                    <TextInput
                        className="flex-1 h-10 text-base px-2"
                        placeholder="Mật khẩu"
                        secureTextEntry={!showPassword}
                        value={data.password}
                        onChangeText={(value) => handleChange("password", value)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                        <Text className="text-blue-500 text-xs px-2">{showPassword ? "Ẩn" : "Hiện"}</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    className="border-b border-gray-300 mb-6 h-10 text-base px-2"
                    placeholder="Xác nhận mật khẩu"
                    secureTextEntry={!showPassword}
                    value={data.confirmPassword}
                    onChangeText={(value) => handleChange("confirmPassword", value)}
                />
            </View>

            <TouchableOpacity
                className="bg-blue-500 rounded-full py-3 items-center w-4/5 mx-auto"
                onPress={handleRegister}
                disabled={loading || !otpSent}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-base">Đăng ký</Text>
                )}
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white p-6 rounded-xl w-4/5 shadow-lg items-center">
                        <Text className="text-base text-center mb-4">{modalMessage}</Text>
                        <Pressable onPress={() => setModalVisible(false)} className="bg-blue-500 px-6 py-2 rounded-full">
                            <Text className="text-white font-semibold">Đóng</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}