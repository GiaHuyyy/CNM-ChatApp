import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, FlatList } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUserFriends, faUserPlus, faCircle } from '@fortawesome/free-solid-svg-icons';

// Dữ liệu mẫu cho danh sách bạn bè
const SAMPLE_FRIENDS = [
  {
    id: '1',
    name: 'Trần Chí Bảo',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    isOnline: true,
    lastSeen: 'Vừa mới truy cập',
  },
  {
    id: '2',
    name: 'Tô Vũ Gia Huy',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    isOnline: false,
    lastSeen: '2 giờ trước',
  },
  // Thêm dữ liệu mẫu khác nếu cần
];

// Dữ liệu mẫu cho lời mời kết bạn
const SAMPLE_REQUESTS = [
  {
    id: '3',
    name: 'Lê Văn Hoàng',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    mutualFriends: 5,
    requestTime: '2 ngày trước',
  },
  // Thêm dữ liệu mẫu khác nếu cần
];

const ContactScreen = () => {
  // State quản lý tab đang được chọn
  const [selectedTab, setSelectedTab] = useState('friends');

  // Component Tab Button
  const TabButton = ({ title, icon, isSelected, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-3 ${
        isSelected ? 'border-b-2 border-blue-500' : ''
      }`}
    >
      <FontAwesomeIcon
        icon={icon}
        size={20}
        color={isSelected ? '#3b82f6' : '#6b7280'}
      />
      <Text
        className={`ml-2 font-medium ${
          isSelected ? 'text-blue-500' : 'text-gray-500'
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  // Component hiển thị một người bạn trong danh sách
  const FriendItem = ({ friend }) => (
    <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
      <View className="relative">
        <Image
          source={{ uri: friend.avatar }}
          className="w-12 h-12 rounded-full"
        />
        {friend.isOnline && (
          <View className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold">{friend.name}</Text>
        <Text className="text-sm text-gray-500">
          {friend.isOnline ? 'Đang hoạt động' : friend.lastSeen}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Component hiển thị một lời mời kết bạn
  const FriendRequestItem = ({ request }) => (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      <Image
        source={{ uri: request.avatar }}
        className="w-12 h-12 rounded-full"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold">{request.name}</Text>
        <Text className="text-sm text-gray-500">
          {request.mutualFriends} bạn chung • {request.requestTime}
        </Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity className="bg-blue-500 px-4 py-2 rounded-lg mr-2">
          <Text className="text-white font-medium">Đồng ý</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-gray-200 px-4 py-2 rounded-lg">
          <Text className="text-gray-700 font-medium">Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white py-4 px-4 border-b border-gray-200">
        <Text className="text-xl font-bold">Danh bạ</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row border-b border-gray-200">
        <TabButton
          title="Bạn bè"
          icon={faUserFriends}
          isSelected={selectedTab === 'friends'}
          onPress={() => setSelectedTab('friends')}
        />
        <TabButton
          title="Lời mời kết bạn"
          icon={faUserPlus}
          isSelected={selectedTab === 'requests'}
          onPress={() => setSelectedTab('requests')}
        />
      </View>

      {/* Content Area */}
      <ScrollView className="flex-1">
        {selectedTab === 'friends' ? (
          // Danh sách bạn bè
          SAMPLE_FRIENDS.map(friend => (
            <FriendItem key={friend.id} friend={friend} />
          ))
        ) : (
          // Danh sách lời mời kết bạn
          SAMPLE_REQUESTS.map(request => (
            <FriendRequestItem key={request.id} request={request} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default ContactScreen;
