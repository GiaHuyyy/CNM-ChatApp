import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCameraRotate, faLightbulb } from '@fortawesome/free-solid-svg-icons';

const CameraPreview = ({
    cameraRef,
    cameraType,
    flashMode,
    onCameraReady,
    onSwitchCamera,
    onToggleFlash,
    style
}) => {
    const [hasPermission, setHasPermission] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleCameraReady = () => {
        setIsReady(true);
        if (onCameraReady) onCameraReady();
    };

    if (hasPermission === null) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="large" color="#0084ff" />
                <Text style={styles.text}>Đang kiểm tra quyền truy cập camera...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.text}>Không có quyền truy cập camera</Text>
                <Text style={styles.subText}>Vui lòng cấp quyền trong cài đặt để sử dụng tính năng này</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <Camera
                ref={cameraRef}
                style={styles.camera}
                type={cameraType}
                flashMode={flashMode}
                onCameraReady={handleCameraReady}
                ratio="16:9"
            >
                {!isReady && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Đang khởi tạo camera...</Text>
                    </View>
                )}

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={onSwitchCamera}
                    >
                        <FontAwesomeIcon icon={faCameraRotate} size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            flashMode === Camera.Constants.FlashMode.on && styles.activeButton
                        ]}
                        onPress={onToggleFlash}
                    >
                        <FontAwesomeIcon icon={faLightbulb} size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Camera>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        flex: 1,
        width: '100%',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    subText: {
        color: '#ccc',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
    },
    controls: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'column',
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    activeButton: {
        backgroundColor: 'rgba(255,204,0,0.8)',
    },
});

export default CameraPreview;
