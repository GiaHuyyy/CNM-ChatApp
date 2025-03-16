import { Text, View } from "react-native";
import React from "react";
import { Tabs } from "expo-router";

import Icons from "../../constants/icons";
// import { useGlobalContext } from "../../../context/GlobalProvider";

const TabIcon = ({ Icon, name, focused }) => {
  return (
    <View className="items-center justify-center w-20 mt-3">
      {name === "Sharing" ? (
        <Icon className="h-6 w-6" fill={`${focused ? "#535CE8" : "#565E6C"}`} />
      ) : (
        <Icon className="h-6 w-6" stroke={`${focused ? "#535CE8" : "#565E6C"}`} />
      )}

      <Text className={`text-xs ${focused ? "font-lbold700 text-secondary" : "font-lregular400 text-[#565E6C]"}`}>
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  // const { colorScheme } = useGlobalContext();
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          // backgroundColor: `${colorScheme === "dark" ? "#1f2937" : "#fff"}`,
          backgroundColor: `"#fff"`,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          height: 64,
          overflow: "hidden",
          // shadowColor: `${colorScheme === "dark" ? "#1f2937" : "#171A1F"}`,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 5, // hỗ trợ box-shadow trên Android
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={Icons.Explore} name="Chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={Icons.Explore} name="Explore" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={Icons.Explore} name="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
