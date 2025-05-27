import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faVideo, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

const IncomingCallModal = () => {
    const { callState, answerCall, rejectCall } = useCallContext();
    const [checkingPermissions, setCheckingPermissions] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState({
        audio: false,
        camera: false
    });

    // Kiểm tra quyền trước khi hiển thị modal
    useEffect(() => {
        if (callState.isReceivingCall && !permissionsChecked) {
            preCheckPermissions();
        }
    }, [callState.isReceivingCall, permissionsChecked]);

    // Kiểm tra quyền truy cập trước khi hiển thị
    const preCheckPermissions = async () => {
        try {
            setCheckingPermissions(true);

            // Check audio permission
            const { status: audioStatus } = await Audio.requestPermissionsAsync();
            setPermissionsGranted(prev => ({ ...prev, audio: audioStatus === 'granted' }));

            // For video calls, also check camera permission
            if (callState.isVideoCall) {
                const { status: cameraStatus } = await Camera.requestPermissionsAsync();
                setPermissionsGranted(prev => ({ ...prev, camera: cameraStatus === 'granted' }));

                if (audioStatus !== 'granted' || cameraStatus !== 'granted') {
                    console.warn("Missing permissions:", {
                        audio: audioStatus !== 'granted',
                        camera: cameraStatus !== 'granted'
                    });
                }
            } else if (audioStatus !== 'granted') {
                console.warn("Missing audio permission");
            }

            setPermissionsChecked(true);
            setCheckingPermissions(false);
        } catch (error) {
            console.error("Error checking permissions:", error);
            setCheckingPermissions(false);
            setPermissionsChecked(true);
        }
    };

    const handleAnswerCall = async () => {
        try {
            // For video calls, verify both permissions
            if (callState.isVideoCall &&
                (!permissionsGranted.audio || !permissionsGranted.camera)) {
                Alert.alert(
                    "Thiếu quyền truy cập",
                    "Bạn cần cấp quyền truy cập camera và microphone để trả lời cuộc gọi video.",
                    [
                        {
                            text: "Từ chối cuộc gọi",
                            style: "cancel",
                            onPress: () => rejectCall("Không được cấp quyền truy cập")
                        },
                        {
                            text: "Cấp quyền",
                            onPress: async () => {
                                // Try to request permissions again
                                const { status: audioStatus } = await Audio.requestPermissionsAsync();
                                const { status: cameraStatus } = await Camera.requestPermissionsAsync();

                                if (audioStatus === 'granted' && cameraStatus === 'granted') {
                                    answerCall();
                                } else {
                                    rejectCall("Không được cấp quyền truy cập");
                                }
                            }
                        }
                    ]
                );
                return;
            }

            // For audio calls, verify audio permission
            if (!callState.isVideoCall && !permissionsGranted.audio) {
                Alert.alert(
                    "Thiếu quyền truy cập",
                    "Bạn cần cấp quyền truy cập microphone để trả lời cuộc gọi.",
                    [
                        {
                            text: "Từ chối cuộc gọi",
                            style: "cancel",
                            onPress: () => rejectCall("Không được cấp quyền truy cập")
                        },
                        {
                            text: "Cấp quyền",
                            onPress: async () => {
                                const { status } = await Audio.requestPermissionsAsync();
                                if (status === 'granted') {
                                    answerCall();
                                } else {
                                    rejectCall("Không được cấp quyền truy cập");
                                }
                            }
                        }
                    ]
                );
                return;
            }

            // All permissions are granted, answer the call
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

                    {checkingPermissions ? (
                        <View className="items-center mb-4">
                            <ActivityIndicator size="small" color="#0084ff" />
                            <Text className="text-sm text-gray-500 mt-2">Đang kiểm tra quyền truy cập...</Text>
                        </View>
                    ) : (
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
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default IncomingCallModal;
