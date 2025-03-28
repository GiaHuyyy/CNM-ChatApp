import { Text } from "react-native";
import React from "react";
import { Link } from "expo-router";

const CustomLinkButton = ({ title, containerStyles, textStyles, Icon, isLoading, href }) => {
    return (
        <Link
            href={href}
            activeOpacity={0.7}
            className={`min-h-[52px] flex items-center justify-center space-x-2 rounded-full ${containerStyles} ${isLoading ? "opacity-50" : ""}`}
            disabled={isLoading}
        >
            {Icon && <Icon />}
            <Text className={`${textStyles} text-lg leading-7 text-center`}>{title}</Text>
        </Link>
    );
};

export default CustomLinkButton;
