import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-1 bg-[#8b2369] pb-[53px]">
          <View className="px-[37px]">
            <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-white"></View>
            <Text className="mt-6 w-[280px] font-osemibold600 text-[32px] leading-[48px] text-white">
              Let's start your health journey today with us gai ghuy!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
