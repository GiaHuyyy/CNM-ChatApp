import { Stack } from "expo-router";
import { NativeWindStyleSheet } from "nativewind";
import { Provider } from "react-redux";
import { store } from "./redux/store"; // đúng đường dẫn tới store.js của bạn
import GlobalProvider from "./context/GlobalProvider"; // đúng đường dẫn tới file GlobalProvider

NativeWindStyleSheet.setOutput({
  default: "native",
});

const RootLayout = () => {
  return (
    <GlobalProvider>
      <Provider store={store}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </Provider>
    </GlobalProvider>
  );
};

export default RootLayout;
