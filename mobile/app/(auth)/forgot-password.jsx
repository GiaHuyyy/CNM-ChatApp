import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable } from "react-native";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";
import { router } from "expo-router";
import axios from "axios";
import { REACT_APP_BACKEND_URL } from "@env";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const showModal = (message) => {
        setModalMessage(message);
        setModalVisible(true);
    };

    const sendOtp = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return showModal("Vui lòng nhập email");
        if (!emailRegex.test(email)) return showModal("Email không hợp lệ");

        setIsLoading(true);
        try {
            const res = await axios.post(`${REACT_APP_BACKEND_URL}/api/forgot-password`, {
                email: email,
            });

            if (res.data && res.data.success) {
                showModal("Đã gửi OTP tới email");
                setOtpSent(true);
            } else {
                showModal(res.data?.message || "Không thể gửi OTP");
            }
        } catch (err) {
            console.error("Error sending OTP:", err);
            showModal(err.response?.data?.message || "Lỗi khi gửi OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) return showModal("Vui lòng nhập mã OTP");
        if (otp.length < 6) return showModal("Mã OTP phải có 6 số");

        setIsLoading(true);
        try {
            const res = await axios.post(`${REACT_APP_BACKEND_URL}/api/verify-otp`, {
                email,
                otp,
            });

            if (res.data && res.data.success) {
                showModal("Xác thực OTP thành công");
                setOtpVerified(true);
            } else {
                showModal(res.data?.message || "OTP không hợp lệ hoặc đã hết hạn");
            }
        } catch (err) {
            console.error("Error verifying OTP:", err);
            showModal(err.response?.data?.message || "Lỗi khi xác thực OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            return showModal("Vui lòng nhập đầy đủ thông tin");
        }

        if (newPassword !== confirmPassword) {
            return showModal("Mật khẩu không khớp");
        }

        if (newPassword.length < 6) {
            return showModal("Mật khẩu phải có ít nhất 6 ký tự");
        }

        setIsLoading(true);
        try {
            // Fix: Changed parameter name from 'password' to 'newPassword' to match server expectation
            const res = await axios.post(`${REACT_APP_BACKEND_URL}/api/reset-password`, {
                email,
                otp,
                newPassword: newPassword,
            });

            if (res.data && res.data.success) {
                showModal("Đặt lại mật khẩu thành công");

                // Delay navigation to let user read the success message
                setTimeout(() => {
                    setModalVisible(false);
                    router.push("/sign-in");
                }, 1500);
            } else {
                showModal(res.data?.message || "Không thể đặt lại mật khẩu");
            }
        } catch (err) {
            console.error("Error resetting password:", err);
            showModal(err.response?.data?.message || "Lỗi khi đặt lại mật khẩu");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <HeaderOfSignIn title="Quên mật khẩu" />
            <View className="bg-[#f8f4f4] p-4">
                <Text className="text-black">
                    {!otpSent
                        ? "Vui lòng nhập email để lấy lại mật khẩu"
                        : !otpVerified
                            ? "Vui lòng nhập mã OTP đã được gửi đến email của bạn"
                            : "Vui lòng nhập mật khẩu mới"}
                </Text>
            </View>

            <View className="flex-1 mt-10 items-center px-6">
                {!otpSent ? (
                    /* Step 1: Email Input */
                    <View className="w-full">
                        <View className="flex-row items-center border-b border-gray-300 mb-6">
                            <TextInput
                                className="flex-1 h-12 text-base px-2"
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {email && (
                                <TouchableOpacity
                                    onPress={() => setEmail("")}
                                    className="p-2"
                                >
                                    <Text className="text-gray-500">✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoading ? (
                            <ActivityIndicator size="large" color="#0066cc" className="my-4" />
                        ) : (
                            <TouchableOpacity
                                className="bg-blue-500 rounded-full py-3 items-center w-full mx-auto mb-3"
                                onPress={sendOtp}
                            >
                                <Text className="text-white font-bold text-base">Gửi mã xác nhận</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : !otpVerified ? (
                    /* Step 2: OTP Verification */
                    <View className="w-full">
                        <TextInput
                            className="border-b border-gray-300 mb-6 h-12 text-base px-2 w-full"
                            placeholder="Nhập mã OTP"
                            keyboardType="number-pad"
                            value={otp}
                            onChangeText={setOtp}
                            maxLength={6}
                        />

                        <View className="flex-row justify-between mb-6">
                            <TouchableOpacity onPress={sendOtp} disabled={isLoading}>
                                <Text className="text-blue-500 font-bold">Gửi lại mã OTP</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setOtpSent(false)} disabled={isLoading}>
                                <Text className="text-gray-500">Thay đổi email</Text>
                            </TouchableOpacity>
                        </View>

                        {isLoading ? (
                            <ActivityIndicator size="large" color="#0066cc" className="my-4" />
                        ) : (
                            <TouchableOpacity
                                className="bg-blue-500 rounded-full py-3 items-center w-full mx-auto mb-3"
                                onPress={verifyOtp}
                            >
                                <Text className="text-white font-bold text-base">Xác nhận</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    /* Step 3: New Password */
                    <View className="w-full">
                        <View className="border-b border-gray-300 mb-6 flex-row items-center">
                            <TextInput
                                className="flex-1 h-12 text-base px-2"
                                placeholder="Mật khẩu mới"
                                secureTextEntry={!showPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Text className="text-blue-500 text-xs px-2">{showPassword ? "ẨN" : "HIỆN"}</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            className="border-b border-gray-300 mb-6 h-12 text-base px-2"
                            placeholder="Xác nhận mật khẩu mới"
                            secureTextEntry={!showPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        {isLoading ? (
                            <ActivityIndicator size="large" color="#0066cc" className="my-4" />
                        ) : (
                            <TouchableOpacity
                                className="bg-blue-500 rounded-full py-3 items-center w-full mx-auto mb-3"
                                onPress={resetPassword}
                            >
                                <Text className="text-white font-bold text-base">Đặt lại mật khẩu</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Status Modal */}
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
