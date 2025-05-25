import React from 'react';
import { TouchableOpacity, Alert, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faVideo } from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';
import { Audio } from 'expo-av';

// Safely import Camera with proper error handling
let Camera = null;
try {
    const CameraModule = require('expo-camera');
    Camera = CameraModule.Camera || CameraModule;
    console.log("Camera module loaded successfully");
} catch (error) {
    console.warn("Failed to load Camera module:", error);
}

const CallButton = ({ userId, userName, userImage, isVideoCall = false, isOnline = false, size = 20, color = "#555454", disabled = false }) => {
    const { callUser } = useCallContext();

    const handleCall = async () => {
        console.log("Call button pressed", { userId, userName, isVideoCall });

        if (disabled || !isOnline) {
            Alert.alert("Không thể gọi", "Người dùng hiện đang ngoại tuyến");
            return;
        }

        try {
            // Check audio permission first (needed for all calls)
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

            if (audioStatus !== 'granted') {
                Alert.alert("Cần cấp quyền", "Vui lòng cấp quyền truy cập microphone để thực hiện cuộc gọi.");
                return;
            }

            // For video calls, check camera permission on native platforms
            if (isVideoCall && Platform.OS !== 'web') {
                if (!Camera) {
                    console.warn("Camera module not available, continuing with audio-only capabilities");
                    // Continue with call but warn user
                    Alert.alert(
                        "Cảnh báo",
                        "Không thể truy cập camera. Cuộc gọi video có thể chỉ hoạt động với âm thanh.",
                        [{ text: "Tiếp tục", onPress: () => callUser(userId, userName, userImage, isVideoCall) }]
                    );
                    return;
                }

                try {
                    // Use the appropriate method to request camera permissions
                    let cameraPermission;
                    if (typeof Camera.requestCameraPermissionsAsync === 'function') {
                        cameraPermission = await Camera.requestCameraPermissionsAsync();
                    } else if (typeof Camera.requestPermissionsAsync === 'function') {
                        cameraPermission = await Camera.requestPermissionsAsync();
                    } else {
                        console.warn("Could not find camera permission request method");
                        cameraPermission = { status: 'denied' };
                    }

                    if (cameraPermission.status !== 'granted') {
                        Alert.alert(
                            "Cần cấp quyền",
                            "Vui lòng cấp quyền truy cập camera để thực hiện cuộc gọi video.",
                            [
                                { text: "Hủy", style: "cancel" },
                                {
                                    text: "Tiếp tục với cuộc gọi thoại",
                                    onPress: () => callUser(userId, userName, userImage, false)
                                }
                            ]
                        );
                        return;
                    }
                } catch (err) {
                    console.error("Error requesting camera permission:", err);
                    // Offer to continue with audio-only call
                    Alert.alert(
                        "Lỗi camera",
                        "Không thể truy cập camera. Bạn có muốn tiếp tục với cuộc gọi thoại không?",
                        [
                            { text: "Hủy", style: "cancel" },
                            {
                                text: "Tiếp tục với cuộc gọi thoại",
                                onPress: () => callUser(userId, userName, userImage, false)
                            }
                        ]
                    );
                    return;
                }
            }

            // All permissions granted or not needed, make the call
            console.log("Permissions granted, calling user:", userId);
            callUser(userId, userName, userImage, isVideoCall);

        } catch (error) {
            console.error("Lỗi khi gọi:", error);
            Alert.alert(
                "Lỗi cuộc gọi",
                `Không thể thực hiện cuộc gọi ${isVideoCall ? "video" : "thoại"} vào lúc này. Vui lòng thử lại sau.`
            );
        }
    };

    return (
        <TouchableOpacity
            onPress={handleCall}
            disabled={disabled || !isOnline}
            className={`flex h-8 w-8 items-center justify-center rounded hover:bg-[#ebecf0] ${disabled || !isOnline ? 'opacity-50' : ''}`}
        >
            <FontAwesomeIcon
                icon={isVideoCall ? faVideo : faPhone}
                size={size}
                color={disabled || !isOnline ? "#aaa" : color}
            />
        </TouchableOpacity>
    );
};

export default CallButton;
