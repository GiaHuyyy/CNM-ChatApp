import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { tw } from 'nativewind';

const MessageBubble = ({ message, isSender }) => {
  // Style cho bubble tin nhắn
  const bubbleStyle = isSender 
    ? tw`self-end bg-blue-500 p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg shadow-md`
    : tw`self-start bg-gray-100 p-3 rounded-tr-lg rounded-tl-lg rounded-br-lg shadow-md`;
    
  const textStyle = isSender 
    ? tw`text-white text-base` 
    : tw`text-gray-800 text-base`;

  // Hiển thị thời gian gửi tin nhắn
  const timeStyle = isSender
    ? tw`text-white text-xs opacity-80`
    : tw`text-gray-500 text-xs`;

  return (
    <View style={[tw`m-2 max-w-4/5`, bubbleStyle]}>
      {message.type === 'text' && (
        <View>
          <Text style={textStyle}>{message.text}</Text>
          <Text style={[tw`mt-1`, timeStyle]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      {message.type === 'image' && message.imageUrl && (
        <View>
          <Image 
            source={{ uri: message.imageUrl }} 
            style={tw`rounded-lg max-w-full max-h-72`} 
            resizeMode="cover" 
          />
          <Text style={[tw`mt-1`, timeStyle]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );
};

export default MessageBubble; 