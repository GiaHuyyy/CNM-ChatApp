import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faVideo } from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';
import { Camera } from 'expo-camera'; // Replace expo-permissions
import { Audio } from 'expo-av'; // Replace expo-permissions

const CallButton = ({ userId, userName, userImage, isVideoCall = false, isOnline = false, size = 20, color = "#555454", disabled = false }) => {
    const { callUser } = useCallContext();

    const handleCall = async () => {
        console.log("Call button pressed", { userId, userName, isVideoCall });

        if (disabled || !isOnline) {
            Alert.alert("Không thể gọi", "Người dùng hiện đang ngoại tuyến");
            return;
        }

        try {
            // Request permissions using the newer APIs
            let audioPermission = false;
            let cameraPermission = false;

            // Request audio permission
            const { status: audioStatus } = await Audio.requestPermissionsAsync();
            audioPermission = audioStatus === 'granted';

            if (!audioPermission) {
                Alert.alert(
                    "Cần cấp quyền",
                    "Vui lòng cấp quyền truy cập microphone để thực hiện cuộc gọi."
                );
                return;
            }

            // If it's a video call, also request camera permission
            if (isVideoCall) {
                const { status: cameraStatus } = await Camera.requestPermissionsAsync();
                cameraPermission = cameraStatus === 'granted';

                if (!cameraPermission) {
                    Alert.alert(
                        "Cần cấp quyền",
                        "Vui lòng cấp quyền truy cập camera để thực hiện cuộc gọi video."
                    );
                    return;
                }
            }

            console.log("Permissions granted, calling user:", userId);

            // Call the user
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
