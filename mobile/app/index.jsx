import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../components/CustomButton";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMessage } from "@fortawesome/free-regular-svg-icons";
export default function App() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-1 bg-[#8b2369] pb-[53px]">
          <View className="px-[37px]">
            <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-white">
              <FontAwesomeIcon icon={faMessage} />
            </View>
            <Text className="mt-6 w-[280px] font-osemibold600 text-[32px] leading-[48px] text-white">
              Let's start your health journey today with us gai ghuy!
            </Text>
            <CustomButton
              title="Continue"
              handlePress={() => router.push("/sign-in")}
              containerStyles="bg-white mt-11 mx-[21px]"
              textStyles="text-primary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
