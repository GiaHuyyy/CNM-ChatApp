import { TouchableOpacity, Text } from "react-native";
import React from "react";

const CustomButton = ({ title, handlePress, containerStyles, textStyles, Icon, isLoading }) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`min-h-[52px] flex-row items-center justify-center space-x-2 rounded-full ${containerStyles} ${isLoading ? "opacity-50" : ""}`}
      disabled={isLoading}
    >
      {Icon && <Icon />}
      <Text className={`${textStyles} font-lregular400 text-lg leading-7`}>{title}</Text>
    </TouchableOpacity>
  );
};

export default CustomButton;
