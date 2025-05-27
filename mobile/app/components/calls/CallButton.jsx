import React, { useState } from 'react';
import { TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faVideo } from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

const CallButton = ({ userId, userName, userImage, isVideoCall = false, isOnline = false, size = 20, color = "#555454", disabled = false }) => {
    const { callUser } = useCallContext();
    const [isChecking, setIsChecking] = useState(false);

    const handleCall = async () => {
        if (disabled || !isOnline) {
            Alert.alert("Không thể gọi", "Người dùng hiện đang ngoại tuyến");
            return;
        }

        if (!callUser) {
            Alert.alert("Lỗi", "Chức năng gọi điện không khả dụng");
            return;
        }

        try {
            setIsChecking(true);

            // Check permissions based on call type
            if (isVideoCall) {
                // For video calls, we need both audio and camera permissions
                const audioResult = await Audio.requestPermissionsAsync();
                const cameraResult = await Camera.requestPermissionsAsync();

                if (audioResult.status !== 'granted' || cameraResult.status !== 'granted') {
                    Alert.alert(
                        "Cần cấp quyền",
                        "Vui lòng cấp quyền truy cập camera và microphone để thực hiện cuộc gọi video.",
                        [
                            { text: "Hủy", style: "cancel" },
                            {
                                text: "Gọi thoại thay thế",
                                onPress: () => {
                                    if (audioResult.status === 'granted') {
                                        callUser(userId, userName, userImage, false);
                                    } else {
                                        Alert.alert("Không thể gọi", "Bạn cần cấp quyền truy cập microphone");
                                    }
                                }
                            }
                        ]
                    );
                    setIsChecking(false);
                    return;
                }
            } else {
                // For audio calls, we only need audio permission
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        "Cần cấp quyền",
                        "Vui lòng cấp quyền truy cập microphone để thực hiện cuộc gọi."
                    );
                    setIsChecking(false);
                    return;
                }
            }

            // All permissions granted, make the call
            callUser(userId, userName, userImage, isVideoCall);
            setIsChecking(false);
        } catch (error) {
            console.error("Lỗi khi kiểm tra quyền truy cập:", error);
            Alert.alert(
                "Lỗi cuộc gọi",
                `Không thể thực hiện cuộc gọi ${isVideoCall ? "video" : "thoại"} vào lúc này. Vui lòng thử lại sau.`
            );
            setIsChecking(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleCall}
            disabled={disabled || !isOnline || isChecking}
            className={`flex h-8 w-8 items-center justify-center rounded hover:bg-[#ebecf0] ${disabled || !isOnline ? 'opacity-50' : ''}`}
        >
            {isChecking ? (
                <ActivityIndicator size="small" color="#0084ff" />
            ) : (
                <FontAwesomeIcon
                    icon={isVideoCall ? faVideo : faPhone}
                    size={size}
                    color={disabled || !isOnline ? "#aaa" : color}
                />
            )}
        </TouchableOpacity>
    );
};

export default CallButton;
