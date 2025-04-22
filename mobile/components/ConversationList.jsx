import React from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ConversationItem = ({ conversation, onPress }) => {
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  return (
    <TouchableOpacity
      onPress={() => onPress(conversation)}
      className="flex-row items-center p-3 border-b border-gray-100"
    >
      <View className="relative">
        <Image
          source={{ uri: conversation.avatar }}
          className="w-12 h-12 rounded-full"
        />
        {conversation.isOnline && (
          <View className="absolute bottom-0 right-0 bg-status-online w-3 h-3 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-base font-semibold text-text-primary">
            {conversation.name}
          </Text>
          {lastMessage && (
            <Text className="text-xs text-text-tertiary">
              {format(new Date(lastMessage.timestamp), 'HH:mm', { locale: vi })}
            </Text>
          )}
        </View>
        <View className="flex-row items-center mt-1">
          <Text
            className={`flex-1 text-sm ${
              unreadCount > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'
            }`}
            numberOfLines={1}
          >
            {lastMessage?.content || 'Chưa có tin nhắn'}
          </Text>
          {unreadCount > 0 && (
            <View className="bg-primary rounded-full px-2 py-1 ml-2">
              <Text className="text-xs text-white">{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ConversationList = ({ conversations, onConversationPress }) => {
  return (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <ConversationItem
          conversation={item}
          onPress={onConversationPress}
        />
      )}
      keyExtractor={item => item.id}
      className="bg-white"
    />
  );
};

export default ConversationList; 