import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faUserFriends,
  faUserPlus,
  faCircle,
  faSearch,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContacts,
  fetchFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  searchUsers,
  clearSearchResults,
  clearError,
} from '../redux/contactSlice';

const ContactScreen = () => {
  const dispatch = useDispatch();
  const [selectedTab, setSelectedTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    contacts,
    friendRequests,
    loading,
    error,
    searchResults,
    searchLoading,
  } = useSelector((state) => state.contacts);

  useEffect(() => {
    dispatch(fetchContacts());
    dispatch(fetchFriendRequests());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch) {
      dispatch(searchUsers(debouncedSearch));
    } else {
      dispatch(clearSearchResults());
    }
  }, [debouncedSearch, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Lỗi', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleAcceptRequest = async (requestId) => {
    try {
      await dispatch(acceptFriendRequest(requestId)).unwrap();
    } catch (error) {
      Alert.alert('Lỗi', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await dispatch(rejectFriendRequest(requestId)).unwrap();
    } catch (error) {
      Alert.alert('Lỗi', error);
    }
  };

  const TabButton = ({ title, icon, isSelected, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-3 ${
        isSelected ? 'border-b-2 border-primary' : ''
      }`}
    >
      <FontAwesomeIcon
        icon={icon}
        size={20}
        color={isSelected ? '#0068FF' : '#6b7280'}
      />
      <Text
        className={`ml-2 font-medium ${
          isSelected ? 'text-primary' : 'text-gray-500'
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const FriendItem = ({ friend }) => (
    <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
      <View className="relative">
        <Image
          source={{ uri: friend.avatar || 'https://via.placeholder.com/50' }}
          className="w-12 h-12 rounded-full"
        />
        {friend.isOnline && (
          <View className="absolute bottom-0 right-0 bg-status-online w-3 h-3 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-text-primary">
          {friend.name}
        </Text>
        <Text className="text-sm text-text-secondary">
          {friend.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const FriendRequestItem = ({ request }) => (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      <Image
        source={{ uri: request.sender.avatar || 'https://via.placeholder.com/50' }}
        className="w-12 h-12 rounded-full"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-text-primary">
          {request.sender.name}
        </Text>
        <Text className="text-sm text-text-secondary">
          {request.mutualFriends} bạn chung
        </Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => handleAcceptRequest(request._id)}
          className="bg-primary px-4 py-2 rounded-button mr-2"
        >
          <Text className="text-white font-medium">Đồng ý</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRejectRequest(request._id)}
          className="bg-gray-200 px-4 py-2 rounded-button"
        >
          <Text className="text-gray-700 font-medium">Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const SearchResultItem = ({ user }) => (
    <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
      <View className="relative">
        <Image
          source={{ uri: user.avatar || 'https://via.placeholder.com/50' }}
          className="w-12 h-12 rounded-full"
        />
        {user.isOnline && (
          <View className="absolute bottom-0 right-0 bg-status-online w-3 h-3 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-text-primary">
          {user.name}
        </Text>
        <Text className="text-sm text-text-secondary">
          {user.email}
        </Text>
      </View>
      {!contacts.some(contact => contact._id === user._id) && (
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-button">
          <Text className="text-white font-medium">Kết bạn</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white py-4 px-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-text-primary">Danh bạ</Text>
      </View>

      <View className="p-3 border-b border-gray-200">
        <View className="flex-row items-center bg-background-dark rounded-button px-3 py-2">
          <FontAwesomeIcon icon={faSearch} size={16} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-text-primary text-base"
            placeholder="Tìm kiếm người dùng..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {!searchQuery && (
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
      )}

      <ScrollView className="flex-1">
        {searchQuery ? (
          searchLoading ? (
            <View className="flex-1 items-center justify-center p-4">
              <ActivityIndicator size="small" color="#0068FF" />
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <SearchResultItem key={user._id} user={user} />
            ))
          ) : (
            <View className="p-4 items-center">
              <Text className="text-text-secondary">Không tìm thấy kết quả</Text>
            </View>
          )
        ) : selectedTab === 'friends' ? (
          contacts.length > 0 ? (
            contacts.map((friend) => (
              <FriendItem key={friend._id} friend={friend} />
            ))
          ) : (
            <View className="p-4 items-center">
              <Text className="text-text-secondary">Chưa có bạn bè</Text>
            </View>
          )
        ) : friendRequests.length > 0 ? (
          friendRequests.map((request) => (
            <FriendRequestItem key={request._id} request={request} />
          ))
        ) : (
          <View className="p-4 items-center">
            <Text className="text-text-secondary">Không có lời mời kết bạn</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ContactScreen;
