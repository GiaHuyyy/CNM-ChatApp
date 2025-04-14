import { useRef, useState } from "react";
import { View, Image, FlatList, Dimensions, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomLinkButton from "../components/CustomLinkButton";

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
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / width); // Dùng Math.round thay vì Math.floor
    console.log("Current Index:", slideIndex); // Kiểm tra giá trị index
    setCurrentIndex(slideIndex);
  };

  const handleDotPress = (index) => {
    flatListRef.current.scrollToOffset({ offset: index * width, animated: true });
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Hiển thị hình nền dạng Carousel */}
      <View className="flex-1 justify-center items-center">
        <FlatList
          ref={flatListRef}
          data={backgrounds}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll} // Xử lý khi cuộn xong
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <Image
              source={item}
              style={{ width: width, height: 500 }}
              resizeMode="cover"
            />
          )}
        />
      </View>

      {/* Pagination dots */}
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
      <CustomLinkButton
        title="Tạo tài khoản mới"
        containerStyles="bg-gray-300 py-3 w-4/5 mx-auto"
        textStyles="text-black text-lg"
        href={"/sign-up"}
      />
    </SafeAreaView>
  );
}
