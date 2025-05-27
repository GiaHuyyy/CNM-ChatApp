import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';

const CameraFallback = ({ onPermissionGranted }) => {
    const [permissionStatus, setPermissionStatus] = useState('checking');
    const [retryCount, setRetryCount] = useState(0);

    const checkCameraPermission = async () => {
        setPermissionStatus('checking');
        try {
            // Try using expo-permissions first
            try {
                const { status } = await Permissions.askAsync(Permissions.CAMERA);
                setPermissionStatus(status);
                if (status === 'granted') {
                    onPermissionGranted && onPermissionGranted();
                }
                return;
            } catch (permError) {
                console.log("Failed to check camera permission via Permissions:", permError);
            }

            // Try Camera module methods
            if (Camera) {
                if (typeof Camera.getCameraPermissionsAsync === 'function') {
                    const { status } = await Camera.getCameraPermissionsAsync();
                    if (status !== 'granted' && typeof Camera.requestCameraPermissionsAsync === 'function') {
                        const { status: newStatus } = await Camera.requestCameraPermissionsAsync();
                        setPermissionStatus(newStatus);
                        if (newStatus === 'granted') {
                            onPermissionGranted && onPermissionGranted();
                        }
                    } else {
                        setPermissionStatus(status);
                        if (status === 'granted') {
                            onPermissionGranted && onPermissionGranted();
                        }
                    }
                    return;
                } else if (typeof Camera.requestPermissionsAsync === 'function') {
                    const { status } = await Camera.requestPermissionsAsync();
                    setPermissionStatus(status);
                    if (status === 'granted') {
                        onPermissionGranted && onPermissionGranted();
                    }
                    return;
                }
            }

            // If we get here, we couldn't determine permission state
            setPermissionStatus('undetermined');
        } catch (error) {
            console.error("Error checking camera permission:", error);
            setPermissionStatus('error');
        }
    };

    useEffect(() => {
        checkCameraPermission();
    }, [retryCount]);

    if (permissionStatus === 'checking') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0084ff" />
                <Text style={styles.text}>Đang kiểm tra quyền truy cập camera...</Text>
            </View>
        );
    }

    if (permissionStatus === 'granted') {
        return null; // Component will be unmounted by parent
    }

    return (
        <View style={styles.container}>
            <FontAwesomeIcon icon={faCamera} size={48} color="#aaa" />
            <Text style={styles.title}>Cần cấp quyền truy cập camera</Text>
            <Text style={styles.text}>
                Vui lòng cấp quyền truy cập camera để thực hiện cuộc gọi video
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => setRetryCount(prev => prev + 1)}
            >
                <Text style={styles.buttonText}>Thử lại</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    text: {
        color: '#ddd',
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 10,
    },
    button: {
        backgroundColor: '#0084ff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});

export default CameraFallback;
