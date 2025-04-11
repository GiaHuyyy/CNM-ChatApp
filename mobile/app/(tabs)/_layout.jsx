import { Tabs } from "expo-router";
import Icons from "../../constants/icons";
import { Image } from "react-native";

const tabConfig = [
  {
    name: "chat",
    title: "Chat",
    icon: Icons.chat,
    iconFilled: Icons.chatFilled,
  },
  {
    name: "explore",
    title: "Explore",
    icon: Icons.explore,
    iconFilled: Icons.exploreFilled,
  },
  {
    name: "user",
    title: "User",
    icon: Icons.user,
    iconFilled: Icons.userFilled,
  },
  {
    name: "contact",
    title: "Contacts",
    icon: Icons.contact,
    iconFilled: Icons.contactFilled,
  },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const currentTab = tabConfig.find((tab) => tab.name === route.name);

        if (!currentTab) {
          console.warn("No tab config found for route:", route.name);
        }

        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarIcon: ({ focused }) => {
            // fallback in case currentTab is undefined
            const iconSource = focused
              ? currentTab?.iconFilled ?? Icons.userFilled
              : currentTab?.icon ?? Icons.user;

            return (
              <Image
                source={iconSource}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
            );
          },
        };
      }}
    >
      {tabConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title }}
        />
      ))}
    </Tabs>
  );
}
