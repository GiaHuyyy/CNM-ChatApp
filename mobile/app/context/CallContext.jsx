import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { useGlobalContext } from './GlobalProvider';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';

const CallContext = createContext();

export const useCallContext = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCallContext must be used within a CallProvider');
    }
    return context;
};

export const CallProvider = ({ children }) => {
    const { socketConnection } = useGlobalContext();
    const user = useSelector((state) => state.user);

    // Audio objects
    const audioRecording = useRef(null);
    const audioPlayer = useRef(null);

    // Call state
    const [callState, setCallState] = useState({
        isReceivingCall: false,
        isCalling: false,
        isCallAccepted: false,
        isVideoCall: false,
        callerId: null,
        callerName: '',
        callerImage: '',
        receiverId: null,
        receiverName: '',
        receiverImage: '',
        messageId: null,
        callStartTime: null,
        callDuration: 0,
        signal: null,
    });

    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [volume, setVolume] = useState(1.0); // Full volume by default

    const callTimerRef = useRef(null);

    // Khởi tạo audio mode khi component mount
    useEffect(() => {
        setupAudioMode();
        return () => {
            // Cleanup audio resources when component unmounts
            if (audioRecording.current) {
                audioRecording.current.stopAndUnloadAsync().catch(err =>
                    console.error("Error stopping recording:", err)
                );
            }
        };
    }, []);

    // Thiết lập audio mode với cấu hình chính xác
    const setupAudioMode = async () => {
        try {
            console.log("Setting up audio mode...");

            // Đảm bảo cấu hình audio mode cho cả iOS và Android
            await Audio.setAudioModeAsync({
                // iOS và Android
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,

                // Sử dụng giá trị số thay vì hằng số
                interruptionModeIOS: 1, // 1 = do not mix with other audio
                interruptionModeAndroid: 1, // 1 = do not mix with other audio

                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false // Sử dụng loa ngoài
            });

            console.log("Audio mode set successfully");
            return true;
        } catch (error) {
            console.error("Error setting audio mode:", error);
            return false;
        }
    };

    // Start audio recording for call
    const startAudioRecording = async () => {
        try {
            console.log("Starting audio recording");

            // Đảm bảo đã thiết lập audio mode trước
            await setupAudioMode();

            // Dừng và giải phóng recording hiện tại nếu có
            if (audioRecording.current) {
                await audioRecording.current.stopAndUnloadAsync();
                audioRecording.current = null;
            }

            console.log("Creating new recording object");
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            audioRecording.current = recording;
            console.log("Audio recording started successfully");

            return true;
        } catch (error) {
            console.error("Error starting recording:", error);
            Alert.alert(
                "Lỗi Microphone",
                "Không thể ghi âm. Vui lòng kiểm tra quyền truy cập và thử lại."
            );
            return false;
        }
    };

    // Set up socket event listeners
    useEffect(() => {
        if (!socketConnection) return;

        socketConnection.on('incoming-call', ({ callerId, callerName, callerImage, isVideoCall, signal, messageId }) => {
            console.log('Received incoming call', { callerId, isVideoCall });
            setCallState({
                isReceivingCall: true,
                isVideoCall,
                callerId,
                callerName,
                callerImage,
                messageId,
                signal,
            });
        });

        socketConnection.on('call-accepted', ({ signal }) => {
            console.log('Call accepted with signal', signal);
            setCallState((prev) => ({
                ...prev,
                isCallAccepted: true,
                callStartTime: new Date(),
            }));

            startCallTimer();
        });

        socketConnection.on('call-rejected', ({ reason }) => {
            console.log('Call rejected:', reason);
            Alert.alert('Call Rejected', reason || 'The call was rejected');
            endCall();
        });

        socketConnection.on('call-ended', ({ duration }) => {
            Alert.alert('Call Ended', `Call ended (${formatDuration(duration)})`);
            endCall();
        });

        socketConnection.on('call-failed', ({ message }) => {
            Alert.alert('Call Failed', message || 'Could not connect the call');
            endCall();
        });

        socketConnection.on('call-terminated', () => {
            console.log('Call terminated by the other party');

            // Reset UI state with a terminated status message
            setCallState({
                isReceivingCall: false,
                isCalling: false,
                isCallAccepted: false,
                isVideoCall: false,
                callerId: null,
                callerName: '',
                callerImage: '',
                receiverId: null,
                receiverName: '',
                receiverImage: '',
                signal: null,
                messageId: null,
                callStartTime: null,
                callDuration: 0,
            });

            // Clear the timer
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }

            Alert.alert('Call Ended', 'The call has ended');
        });

        return () => {
            socketConnection.off('incoming-call');
            socketConnection.off('call-accepted');
            socketConnection.off('call-rejected');
            socketConnection.off('call-ended');
            socketConnection.off('call-failed');
            socketConnection.off('call-terminated');
        };
    }, [socketConnection, callState]);

    const startCallTimer = () => {
        console.log('Starting call timer');

        // First clear any existing timer
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        // Store the start time as a timestamp for easier duration calculation
        const startTimestamp = Date.now();

        // Update the call state with the timestamp
        setCallState((prev) => ({
            ...prev,
            callStartTime: startTimestamp,
            callDuration: 0,
        }));

        // Set up the interval to update every second
        callTimerRef.current = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
            console.log('Timer tick:', elapsedSeconds);
            setCallState((prev) => ({
                ...prev,
                callDuration: elapsedSeconds,
            }));
        }, 1000);

        console.log('Timer started with ID:', callTimerRef.current);
    };

    const formatDuration = (seconds) => {
        // Add safety checks for NaN or undefined
        if (seconds === undefined || seconds === null || isNaN(seconds)) {
            return '00:00';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60); // Ensure we have an integer
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Thêm hàm này để cấu hình âm thanh trước khi gọi và nhận cuộc gọi
    const configureAudioMode = async () => {
        try {
            console.log("Configuring audio mode for calls...");
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                interruptionModeIOS: 1, // 1 = do not mix with other audio
                interruptionModeAndroid: 1, // 1 = do not mix with other audio
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false, // Sử dụng loa ngoài mặc định
            });
            console.log("Audio mode configured successfully");
            return true;
        } catch (error) {
            console.error("Failed to configure audio mode:", error);
            return false;
        }
    };

    const checkPermissions = async (isVideo = false) => {
        try {
            console.log(`Checking permissions for ${isVideo ? 'video' : 'audio'} call`);

            // Kiểm tra quyền truy cập âm thanh
            console.log("Requesting audio recording permission...");
            const { status: audioStatus } = await Audio.requestPermissionsAsync();
            console.log(`Audio permission status: ${audioStatus}`);

            if (isVideo) {
                console.log("Requesting camera permission...");
                const { status: videoStatus } = await Camera.requestPermissionsAsync();
                console.log(`Camera permission status: ${videoStatus}`);

                const hasAllPermissions = audioStatus === 'granted' && videoStatus === 'granted';
                console.log(`All permissions granted: ${hasAllPermissions}`);
                return hasAllPermissions;
            }

            const hasAudioPermission = audioStatus === 'granted';
            console.log(`Audio permission granted: ${hasAudioPermission}`);
            return hasAudioPermission;
        } catch (error) {
            console.error('Error checking permissions:', error);
            return false;
        }
    };

    const callUser = async (receiverId, receiverName, receiverImage, isVideoCall) => {
        try {
            console.log("CallContext.callUser called with:", { receiverId, receiverName, isVideoCall });

            if (!socketConnection) {
                console.error("Không có kết nối socket");
                Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
                return;
            }

            if (!user || !user._id) {
                console.error("Không tìm thấy thông tin người dùng");
                Alert.alert('Lỗi xác thực', 'Vui lòng đăng nhập lại để thực hiện cuộc gọi.');
                return;
            }

            // Check permissions first
            const hasPermissions = await checkPermissions(isVideoCall);

            if (!hasPermissions) {
                Alert.alert(
                    'Cần cấp quyền',
                    `Vui lòng cấp quyền truy cập ${isVideoCall ? 'camera và microphone' : 'microphone'} để thực hiện cuộc gọi.`
                );
                return;
            }

            // Set up audio for the call - FIX: Change setupAudio to setupAudioMode
            await setupAudioMode();

            // Update call state
            setCallState({
                isCalling: true,
                isVideoCall,
                receiverId,
                receiverName,
                receiverImage,
            });

            console.log("Emitting call-user event to socket", {
                callerId: user._id,
                receiverId: receiverId,
                callerName: user.name || "Unknown User",
                callerImage: user.profilePic || "",
                isVideoCall
            });

            // Send call request through socket
            socketConnection.emit('call-user', {
                callerId: user._id,
                receiverId: receiverId,
                callerName: user.name || "Unknown User",
                callerImage: user.profilePic || "",
                isVideoCall,
                signal: { type: 'offer', sdp: 'simulated-sdp-offer' },
            });

        } catch (error) {
            console.error('Error in callUser:', error);
            Alert.alert('Lỗi', error.message || 'Không thể kết nối cuộc gọi');
        }
    };

    const answerCall = async () => {
        try {
            console.log("Starting to answer call...");

            // Thiết lập audio mode trước tiên
            const audioConfigured = await setupAudioMode();
            if (!audioConfigured) {
                console.error("Failed to configure audio mode");
                Alert.alert('Lỗi', 'Không thể cấu hình âm thanh cho cuộc gọi');
                rejectCall('Không thể cấu hình âm thanh');
                return;
            }

            // Kiểm tra quyền truy cập
            const hasPermissions = await checkPermissions(callState.isVideoCall);
            if (!hasPermissions) {
                console.error("Required permissions not granted");
                Alert.alert(
                    'Cần cấp quyền',
                    `Vui lòng cấp quyền truy cập ${callState.isVideoCall ? 'camera và microphone' : 'microphone'} để trả lời cuộc gọi.`,
                    [
                        { text: "OK", onPress: () => rejectCall('Không được cấp quyền') }
                    ]
                );
                return;
            }

            // Bắt đầu ghi âm sau khi đã thiết lập audio mode
            const recordingStarted = await startAudioRecording();
            if (!recordingStarted) {
                console.warn("Could not start recording, but continuing with call");
                // Tiếp tục cuộc gọi ngay cả khi không ghi âm được
            }

            // Cập nhật trạng thái cuộc gọi
            setCallState((prev) => ({
                ...prev,
                isReceivingCall: false,
                isCallAccepted: true,
                callStartTime: Date.now(),
                callDuration: 0,
            }));

            // Gửi phản hồi qua socket
            if (!socketConnection) {
                throw new Error("Không có kết nối socket");
            }

            socketConnection.emit('answer-call', {
                callerId: callState.callerId,
                signal: { type: 'answer', sdp: 'simulated-sdp-answer' },
                messageId: callState.messageId,
            });

            startCallTimer();

            console.log("Call successfully answered");
        } catch (error) {
            console.error('Error in answerCall:', error);
            Alert.alert('Lỗi', error.message || 'Không thể kết nối cuộc gọi');
            rejectCall('Không thể kết nối camera hoặc microphone');
        }
    };

    const rejectCall = (reason = 'Call rejected by recipient') => {
        if (socketConnection && callState.callerId) {
            socketConnection.emit('reject-call', {
                callerId: callState.callerId,
                messageId: callState.messageId,
                reason,
            });
        }

        resetCallState();
    };

    const cleanupAudio = async () => {
        try {
            console.log("Cleaning up audio resources");

            // Stop and unload recording if it exists
            if (audioRecording.current) {
                try {
                    // Check if recording is active before stopping
                    if (audioRecording.current._canRecord) {
                        await audioRecording.current.stopAndUnloadAsync();
                    }
                    audioRecording.current = null;
                    console.log("Recording stopped and unloaded");
                } catch (err) {
                    console.error("Error stopping recording:", err);
                }
            }

            // Stop and unload audio player if it exists
            if (audioPlayer.current) {
                try {
                    await audioPlayer.current.stopAsync();
                    await audioPlayer.current.unloadAsync();
                    audioPlayer.current = null;
                    console.log("Audio player stopped and unloaded");
                } catch (err) {
                    console.error("Error stopping audio player:", err);
                }
            }
        } catch (error) {
            console.error("Error in cleanupAudio:", error);
        }
    };

    const endCall = () => {
        console.log('Ending call with state:', callState);

        // Clean up audio
        cleanupAudio();

        // Notify other user that call has ended
        if (socketConnection) {
            // Determine the partner ID - it could be either callerId or receiverId depending on who initiated the call
            const partnerId = callState.isCalling ? callState.receiverId : callState.callerId;

            if (partnerId) {
                console.log('Sending end-call event to:', partnerId);

                socketConnection.emit('end-call', {
                    userId: user._id,
                    partnerId,
                    messageId: callState.messageId,
                    duration: callState.callDuration,
                });
            }
        }

        // Reset state
        resetCallState();

        // Clear the timer
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    const toggleMute = async () => {
        try {
            const newMuteState = !isMuted;
            setIsMuted(newMuteState);

            if (newMuteState) {
                // Muting: pause recording if active
                if (audioRecording.current && audioRecording.current._canRecord) {
                    await audioRecording.current.pauseAsync();
                    console.log("Recording paused (muted)");
                }
            } else {
                // Unmuting: resume recording if it exists
                if (audioRecording.current && audioRecording.current._canRecord) {
                    await audioRecording.current.resumeAsync();
                    console.log("Recording resumed (unmuted)");
                } else {
                    // Start a new recording if none exists
                    await startAudioRecording();
                }
            }
        } catch (error) {
            console.error("Error toggling mute:", error);
        }
    };

    const toggleSpeaker = async () => {
        try {
            const newSpeakerState = !isSpeakerOn;
            setIsSpeakerOn(newSpeakerState);

            // Update the audio mode to use speaker or earpiece
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                interruptionModeIOS: 1, // 1 = do not mix with other audio
                interruptionModeAndroid: 1, // 1 = do not mix with other audio
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: !newSpeakerState, // Toggle between speaker and earpiece
            });

            console.log(`Speaker mode ${newSpeakerState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling speaker:', error);
        }
    };

    // Add volume control function
    const adjustVolume = async (newVolume) => {
        try {
            // Ensure volume is between 0 and 1
            const volumeLevel = Math.max(0, Math.min(1, newVolume));
            setVolume(volumeLevel);

            // If we have an active audio player, adjust its volume
            if (audioPlayer.current) {
                await audioPlayer.current.setVolumeAsync(volumeLevel);
            }

            console.log(`Volume set to ${volumeLevel * 100}%`);
        } catch (error) {
            console.error('Error adjusting volume:', error);
        }
    };

    const resetCallState = () => {
        setCallState({
            isReceivingCall: false,
            isCalling: false,
            isCallAccepted: false,
            isVideoCall: false,
            callerId: null,
            callerName: '',
            callerImage: '',
            receiverId: null,
            receiverName: '',
            receiverImage: '',
            messageId: null,
            callStartTime: null,
            callDuration: 0,
            signal: null,
        });
    };

    useEffect(() => {
        return () => {
            cleanupAudio();
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, []);

    const contextValue = {
        callState,
        isMuted,
        isSpeakerOn,
        volume,
        callUser,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        adjustVolume,
        formatDuration,
    };

    return <CallContext.Provider value={contextValue}>{children}</CallContext.Provider>;
};

export default CallProvider;
