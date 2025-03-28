import { useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const backgrounds = [
  require("../assets/images/bg-1.jpg"),
  require("../assets/images/bg-2.jpg"),
  require("../assets/images/bg-3.jpg"),
  require("../assets/images/bg-4.jpg"),
  require("../assets/images/bg-5.jpg"),
];

const { width } = Dimensions.get("window");
const imageHeight = 500; // Chiều cao ảnh

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  // Xử lý khi cuộn ngang
  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  // Xử lý khi bấm vào dot
  const handleDotPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Hiển thị hình nền dạng Carousel */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <FlatList
          ref={flatListRef}
          data={backgrounds}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          renderItem={({ item }) => (
            <Image source={item} style={{ width, height: imageHeight, resizeMode: "cover" }} />
          )}
        />
      </View>

      {/* Pagination dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16 }}>
        {backgrounds.map((_, index) => (
          <TouchableOpacity key={index} onPress={() => handleDotPress(index)}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: index === currentIndex ? "#007AFF" : "#D1D5DB",
                marginHorizontal: 5,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Nút đăng nhập */}
      <TouchableOpacity style={{ backgroundColor: "#007AFF", paddingVertical: 12, width: "80%", borderRadius: 50, alignSelf: "center", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Đăng nhập</Text>
      </TouchableOpacity>

      {/* Nút tạo tài khoản mới */}
      <TouchableOpacity style={{ backgroundColor: "#D1D5DB", paddingVertical: 12, width: "80%", borderRadius: 50, alignSelf: "center", alignItems: "center" }}>
        <Text style={{ color: "black", fontSize: 18 }}>Tạo tài khoản mới</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
