import { useRef, useState } from "react";
import { View, Image, FlatList, Dimensions, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../components/CustomButton";
import CustomLinkButton from "../components/CustomLinkButton";
import { router, Link } from "expo-router";

const backgrounds = [
  require("../assets/images/bg-1.jpg"),
  require("../assets/images/bg-2.jpg"),
  require("../assets/images/bg-3.jpg"),
  require("../assets/images/bg-4.jpg"),
  require("../assets/images/bg-5.jpg"),
];

const { width } = Dimensions.get("window");

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const handleDotPress = (index) => {
    flatListRef.current.scrollToOffset({ offset: index * width, animated: true });
    setCurrentIndex(index);
  };

  // Hàm xử lý khi bấm nút đăng nhập
  const handleLogin = () => {
    console.log("Đăng nhập");
  };

  // Hàm xử lý khi bấm nút tạo tài khoản mới
  const handleSignUp = () => {
    console.log("Tạo tài khoản mới");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Hiển thị hình nền dạng Carousel */}
      <View className="flex-1 justify-center items-center">
        <FlatList
          ref={flatListRef} // Gán ref vào FlatList
          data={backgrounds}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          renderItem={({ item }) => (
            <Image source={item} className="w-screen h-[500px]" resizeMode="cover" />
          )}
        />
      </View>

      {/* Pagination dots (bấm để chuyển ảnh) */}
      <View className="flex-row justify-center mb-6">
        {backgrounds.map((_, index) => (
          <TouchableOpacity key={index} onPress={() => handleDotPress(index)}>
            <View
              className={`w-2 h-2 mx-1 rounded-full ${index === currentIndex ? "bg-blue-500" : "bg-gray-300"}`}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Nút đăng nhập */}
      <CustomLinkButton
        title="Đăng nhập"
        containerStyles="bg-blue-500 py-3 w-4/5 mx-auto mb-3"
        textStyles="text-white text-lg font-bold text-center"
        href={"/sign-in"}
      />

      {/* Nút tạo tài khoản mới */}
      <CustomButton
        title="Tạo tài khoản mới"
        handlePress={handleSignUp}
        containerStyles="bg-gray-300 py-3 w-4/5 mx-auto"
        textStyles="text-black text-lg"
      />
    </SafeAreaView>
  );
}
