import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import CustomSlider from '../../../components/CustomSlider';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faMicrophone,
    faMicrophoneSlash,
    faPhoneSlash,
    faVolumeHigh,
    faVolumeXmark,
    faVolumeUp,
    faVolumeDown
} from '@fortawesome/free-solid-svg-icons';
import { useCallContext } from '../../context/CallContext';

const { width, height } = Dimensions.get('window');

const CallScreen = () => {
    const {
        callState,
        endCall,
        toggleMute,
        toggleSpeaker,
        adjustVolume,
        isMuted,
        isSpeakerOn,
        volume,
        formatDuration
    } = useCallContext();

    const [audioVisualizer, setAudioVisualizer] = useState([]);
    const [showVolumeControl, setShowVolumeControl] = useState(false);

    // Generate random audio visualizer bars
    useEffect(() => {
        if (callState.isCallAccepted) {
            const interval = setInterval(() => {
                const bars = Array(9).fill(0).map(() => 20 + Math.random() * 80);
                setAudioVisualizer(bars);
            }, 500);

            return () => clearInterval(interval);
        }
    }, [callState.isCallAccepted]);

    // If there's no active call, don't render anything
    if (!callState.isCalling && !callState.isCallAccepted) {
        return null;
    }

    // Determine name and image of the other party
    const partnerName = callState.isCalling ? callState.receiverName : callState.callerName;
    const partnerImage = callState.isCalling ? callState.receiverImage : callState.callerImage;

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
        >
            <View className="flex-1 bg-gray-900">
                {/* Call status bar */}
                <View className="absolute top-12 left-0 right-0 z-10 items-center">
                    <View className="bg-black/50 px-4 py-2 rounded-full">
                        <Text className="text-white font-medium">
                            {callState.isCallAccepted
                                ? formatDuration(callState.callDuration)
                                : 'Connecting...'}
                        </Text>
                    </View>
                </View>

                {/* Audio call display */}
                <View className="flex-1 items-center justify-center">
                    <Image
                        source={{ uri: partnerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}` }}
                        className="w-40 h-40 rounded-full border-4 border-blue-500"
                    />
                    <Text className="text-white text-2xl font-semibold mt-6">{partnerName}</Text>
                    <Text className="text-gray-300 mt-2">
                        {callState.isCallAccepted ? 'In call' : 'Calling...'}
                    </Text>

                    {/* Audio waveform visualization */}
                    {callState.isCallAccepted && (
                        <View className="flex-row items-end mt-8 h-12">
                            {audioVisualizer.map((height, index) => (
                                <View
                                    key={index}
                                    className="w-1 mx-0.5 rounded-t-full"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: index % 2 === 0 ? '#3b82f6' : '#60a5fa'
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    {/* Large timer display */}
                    {callState.isCallAccepted && (
                        <Text className="text-white text-5xl font-bold mt-8">
                            {formatDuration(callState.callDuration)}
                        </Text>
                    )}
                </View>

                {/* Volume control section - shown when volume button is pressed */}
                {showVolumeControl && (
                    <View className="absolute top-32 right-6 bg-gray-800 p-4 rounded-lg shadow-lg">
                        <View className="flex-row items-center mb-2">
                            <FontAwesomeIcon icon={faVolumeDown} size={16} color="#fff" />
                            <CustomSlider
                                style={{ width: 120, height: 40 }}
                                minimumValue={0}
                                maximumValue={1}
                                value={volume}
                                onValueChange={adjustVolume}
                                minimumTrackTintColor="#3b82f6"
                                maximumTrackTintColor="#6b7280"
                                thumbTintColor="#3b82f6"
                            />
                            <FontAwesomeIcon icon={faVolumeUp} size={16} color="#fff" />
                        </View>
                        <Text className="text-white text-center">Âm lượng: {Math.round(volume * 100)}%</Text>
                    </View>
                )}

                {/* Call controls */}
                <View className="absolute bottom-10 left-0 right-0">
                    <View className="flex-row justify-center items-center space-x-6">
                        <TouchableOpacity
                            onPress={toggleMute}
                            className={`w-14 h-14 rounded-full items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}
                        >
                            <FontAwesomeIcon
                                icon={isMuted ? faMicrophoneSlash : faMicrophone}
                                size={24}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={endCall}
                            className="w-16 h-16 bg-red-600 rounded-full items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faPhoneSlash} size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowVolumeControl(!showVolumeControl)}
                            onLongPress={toggleSpeaker}
                            className={`w-14 h-14 rounded-full items-center justify-center ${!isSpeakerOn ? 'bg-red-500' : 'bg-gray-700'}`}
                        >
                            <FontAwesomeIcon
                                icon={isSpeakerOn ? faVolumeHigh : faVolumeXmark}
                                size={24}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-center text-white text-xs mt-2">
                        Nhấn giữ để bật/tắt loa ngoài
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

export default CallScreen;
