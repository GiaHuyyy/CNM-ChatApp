import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faVideo, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

const IncomingCallModal = () => {
    const { callState, answerCall, rejectCall } = useCallContext();

    // Kiểm tra quyền trước khi hiển thị modal
    useEffect(() => {
        if (callState.isReceivingCall) {
            preCheckPermissions();
        }
    }, [callState.isReceivingCall]);

    // Kiểm tra quyền truy cập trước khi hiển thị
    const preCheckPermissions = async () => {
        try {
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

            if (callState.isVideoCall) {
                const { status: cameraStatus } = await Camera.requestPermissionsAsync();

                if (audioStatus !== 'granted' || cameraStatus !== 'granted') {
                    console.warn("Missing permissions:", {
                        audio: audioStatus !== 'granted',
                        camera: cameraStatus !== 'granted'
                    });
                }
            } else if (audioStatus !== 'granted') {
                console.warn("Missing audio permission");
            }
        } catch (error) {
            console.error("Error checking permissions:", error);
        }
    };

    const handleAnswerCall = async () => {
        try {
            // Đơn giản hóa: không thiết lập audio mode ở đây
            // để tránh xung đột với thiết lập trong CallContext
            answerCall();
        } catch (error) {
            console.error('Error answering call:', error);
            Alert.alert("Lỗi", "Không thể kết nối cuộc gọi");
            rejectCall('Lỗi khi kết nối');
        }
    };

    if (!callState.isReceivingCall) return null;

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="fade"
        >
            <View className="flex-1 bg-black/75 justify-center items-center">
                <View className="bg-white w-[280px] rounded-2xl p-6 items-center shadow-xl">
                    <Text className="text-xl font-bold mb-4">Cuộc gọi đến</Text>

                    <View className="items-center mb-6">
                        <Image
                            source={{ uri: callState.callerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(callState.callerName)}` }}
                            className="w-20 h-20 rounded-full mb-2"
                        />
                        <Text className="text-lg font-semibold">{callState.callerName}</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            {callState.isVideoCall ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
                        </Text>
                    </View>

                    <View className="flex-row justify-center space-x-8">
                        <TouchableOpacity
                            onPress={() => rejectCall()}
                            className="w-14 h-14 bg-red-500 rounded-full items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faPhoneSlash} size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleAnswerCall}
                            className="w-14 h-14 bg-green-500 rounded-full items-center justify-center"
                        >
                            <FontAwesomeIcon
                                icon={callState.isVideoCall ? faVideo : faPhone}
                                size={24}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default IncomingCallModal;
