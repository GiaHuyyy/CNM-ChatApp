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
  StatusBar,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faUserPlus,
  faSearch,
  faPhone,
  faVideo,
  faAddressBook,
  faBirthdayCake,
  faUserFriends,
  faAngleRight,
  faTimes
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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ContactScreen = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('friends');
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

  // Nhóm danh bạ theo chữ cái
  const groupedContacts = contacts.reduce((groups, contact) => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(contact);
    return groups;
  }, {});

  const renderQuickFeatures = () => (
    <View className="bg-white mb-2">
      <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
          <FontAwesomeIcon icon={faUserPlus} size={20} color="#0068FF" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold">Lời mời kết bạn ({friendRequests.length})</Text>
        </View>
        <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
          <FontAwesomeIcon icon={faAddressBook} size={20} color="#0068FF" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold">Danh bạ máy</Text>
          <Text className="text-sm text-gray-500">Liên hệ có dùng Zalo</Text>
        </View>
        <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center px-4 py-3">
        <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
          <FontAwesomeIcon icon={faBirthdayCake} size={20} color="#0068FF" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold">Sinh nhật</Text>
          <Text className="text-sm text-gray-500">Có thể bạn muốn gửi lời chúc</Text>
        </View>
        <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View className="flex-row bg-white px-4 py-2 border-b border-gray-200">
      <TouchableOpacity
        onPress={() => setActiveTab('friends')}
        className={`mr-6 pb-2 ${activeTab === 'friends' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-base ${activeTab === 'friends' ? 'text-blue-500 font-semibold' : 'text-gray-500'}`}>
          Bạn bè
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('groups')}
        className={`mr-6 pb-2 ${activeTab === 'groups' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-base ${activeTab === 'groups' ? 'text-blue-500 font-semibold' : 'text-gray-500'}`}>
          Nhóm
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('oa')}
        className={`pb-2 ${activeTab === 'oa' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-base ${activeTab === 'oa' ? 'text-blue-500 font-semibold' : 'text-gray-500'}`}>
          OA
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContactList = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {contacts.length}</Text>
        <Text className="text-gray-500">Mới truy cập</Text>
      </View>

      <ScrollView className="flex-1">
        {renderQuickFeatures()}

        {Object.keys(groupedContacts).sort().map(letter => (
          <View key={letter}>
            <Text className="px-4 py-2 bg-gray-50 text-gray-500">{letter}</Text>
            {groupedContacts[letter].map(contact => (
              <TouchableOpacity
                key={contact._id}
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
              >
                <Image
                  source={{ uri: contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}` }}
                  className="w-12 h-12 rounded-full"
                />
                <Text className="ml-3 flex-1 text-base">{contact.name}</Text>
                <View className="flex-row">
                  <TouchableOpacity className="mr-4">
                    <FontAwesomeIcon icon={faPhone} size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <FontAwesomeIcon icon={faVideo} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Alphabet Index */}
      <View className="absolute right-0 top-0 bottom-0 w-6 bg-transparent justify-center">
        {ALPHABET.map(letter => (
          <TouchableOpacity
            key={letter}
            className="py-0.5 items-center"
          >
            <Text className="text-xs text-blue-500">{letter}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render search results component
  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View className="flex-1 bg-white items-center justify-center p-4">
          <ActivityIndicator size="large" color="#0068FF" />
          <Text className="mt-2 text-gray-500">Đang tìm kiếm...</Text>
        </View>
      );
    }

    if (searchResults && searchResults.length > 0) {
      return (
        <View className="flex-1 bg-white">
          <Text className="px-4 py-2 bg-gray-50 text-gray-500">
            Kết quả tìm kiếm ({searchResults.length})
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
              >
                <Image
                  source={{ uri: item.avatar || item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}` }}
                  className="w-12 h-12 rounded-full"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold">{item.name}</Text>
                  {item.email && <Text className="text-sm text-gray-500">{item.email}</Text>}
                </View>
                <TouchableOpacity className="bg-blue-500 px-3 py-1 rounded-full">
                  <Text className="text-white">Kết bạn</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-8">
                <Text className="text-gray-500">Không có kết quả phù hợp</Text>
              </View>
            }
          />
        </View>
      );
    }

    return null;
  };

  // Add a function to clear the search
  const clearSearch = () => {
    setSearchQuery('');
    dispatch(clearSearchResults());
  };
  
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0068FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      <View className="flex-1 bg-gray-100">
        {/* Header */}
        <View className="bg-[#0068FF] px-4 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center bg-[#1976F0] rounded-full px-3 py-2">
                <FontAwesomeIcon icon={faSearch} size={16} color="#fff" />
                <TextInput
                  className="flex-1 ml-2 text-white"
                  placeholder="Tìm kiếm"
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch}>
                    <FontAwesomeIcon icon={faTimes} size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity className="ml-3">
              <FontAwesomeIcon icon={faUserPlus} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {renderTabs()}

        {/* Show search results if there's a query, otherwise show contacts */}
        {searchQuery.length > 0 ? renderSearchResults() : activeTab === 'friends' && renderContactList()}
      </View>
    </SafeAreaView>
  );
};

export default ContactScreen;
