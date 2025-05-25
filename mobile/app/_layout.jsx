import { Stack } from "expo-router";
import { NativeWindStyleSheet } from "nativewind";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import GlobalProvider from "./context/GlobalProvider";
import '../utils/logConfig';

// Add necessary permissions for WebRTC
import { PermissionsAndroid, Platform } from 'react-native';
import { useEffect } from "react";

// Configure NativeWind
NativeWindStyleSheet.setOutput({
  default: "native",
});

const RootLayout = () => {
  // Request necessary permissions for Android devices
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          if (
            granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
            granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            console.log('Some permissions denied');
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };

    requestPermissions();
  }, []);

  return (
    <Provider store={store}>
      <GlobalProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </GlobalProvider>
    </Provider>
  );
};

export default RootLayout;
