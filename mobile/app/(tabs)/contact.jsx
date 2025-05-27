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
  FlatList,
  PermissionsAndroid,
  Platform,
  Linking
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
import axios from 'axios';
import * as Contacts from 'expo-contacts';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ContactScreen = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('phonebook');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sentRequests, setSentRequests] = useState([]); // Lưu lời mời đã gửi
  const [phoneContacts, setPhoneContacts] = useState([]); // Danh bạ máy
  const [contactsLoading, setContactsLoading] = useState(false);
  const currentUserId = useSelector((state) => state.user._id);

  const {
    friendRequests,
    loading,
    error,
    searchResults,
    searchLoading,
    contacts
  } = useSelector((state) => state.contacts);

  // Khi vào màn contact, lấy toàn bộ user (searchUsers với query rỗng)
  useEffect(() => {
    dispatch(fetchFriendRequests());
    dispatch(searchUsers(''));
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch !== '') {
      dispatch(searchUsers(debouncedSearch));
    } else {
      dispatch(searchUsers(''));
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

  const handleSendFriendRequest = async (userId) => {
    try {
      const token = useSelector((state) => state.user.token); // Lấy token từ Redux
      const res = await axios.post(
        'https://cnm-chatapp-server.onrender.com/api/send-friend-request',
        { receiverId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        Alert.alert('Thành công', res.data.message || 'Đã gửi lời mời kết bạn');
        // Lấy thông tin user vừa gửi lời mời để thêm vào sentRequests
        const sentUser = searchResults.find(u => u._id === userId);
        if (sentUser) {
          setSentRequests(prev => [{ receiver: sentUser, _id: Date.now().toString() }, ...prev]);
        }
      } else {
        Alert.alert('Lỗi', res.data?.message || 'Không gửi được lời mời kết bạn');
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không gửi được lời mời kết bạn');
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

  // Tabs UI: Đưa tab Danh bạ lên đầu, canh chỉnh đều, nổi bật tab đang chọn
  const renderTabs = () => (
    <View className="flex-row bg-white px-2 py-2 border-b border-gray-200 justify-between">
      <TouchableOpacity
        onPress={() => setActiveTab('phonebook')}
        className={`flex-1 items-center pb-2 ${activeTab === 'phonebook' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-xs ${activeTab === 'phonebook' ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>Danh bạ máy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('friends')}
        className={`flex-1 items-center pb-2 ${activeTab === 'friends' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-xs ${activeTab === 'friends' ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>Bạn bè</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('received')}
        className={`flex-1 items-center pb-2 ${activeTab === 'received' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-xs ${activeTab === 'received' ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>Lời mời kết bạn</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('sent')}
        className={`flex-1 items-center pb-2 ${activeTab === 'sent' ? 'border-b-2 border-blue-500' : ''}`}
      >
        <Text className={`text-xs ${activeTab === 'sent' ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>Đã gửi</Text>
      </TouchableOpacity>
    </View>
  );

  // Render friends list (dùng contacts)
  const renderFriendList = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {contacts.length}</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {contacts.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">Không có bạn bè nào.</Text>
          ) : (
            contacts.map(friend => (
              <TouchableOpacity
                key={friend._id}
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
              >
                <Image
                  source={{ uri: friend.profilePic || friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}` }}
                  className="w-12 h-12 rounded-full"
                />
                <Text className="ml-3 flex-1 text-base">{friend.name}</Text>
                <View className="flex-row">
                  <TouchableOpacity className="mr-4">
                    <FontAwesomeIcon icon={faPhone} size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <FontAwesomeIcon icon={faVideo} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  // Render user list (dùng searchResults)
  const renderUserList = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {searchResults.length}</Text>
      </View>
      {searchLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {searchResults.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">Không có người dùng nào.</Text>
          ) : (
            searchResults.map(user => (
              <TouchableOpacity
                key={user._id}
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
              >
                <Image
                  source={{ uri: user.profilePic || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }}
                  className="w-12 h-12 rounded-full"
                />
                <Text className="ml-3 flex-1 text-base">{user.name}</Text>
                <TouchableOpacity className="bg-blue-500 px-3 py-1 rounded-full" onPress={() => handleSendFriendRequest(user._id)}>
                  <Text className="text-white">Kết bạn</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderFriendRequests = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {friendRequests.length}</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {friendRequests.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">Không có lời mời kết bạn nào.</Text>
          ) : (
            friendRequests.map(req => (
              <View key={req._id} className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <Image
                  source={{ uri: req.sender?.profilePic || req.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.sender?.name || '')}` }}
                  className="w-12 h-12 rounded-full"
                />
                <Text className="ml-3 flex-1 text-base">{req.sender?.name}</Text>
                <View className="flex-row">
                  <TouchableOpacity className="bg-blue-500 px-3 py-1 rounded-full mr-2" onPress={() => handleAcceptRequest(req._id)}>
                    <Text className="text-white">Chấp nhận</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-gray-300 px-3 py-1 rounded-full" onPress={() => handleRejectRequest(req._id)}>
                    <Text className="text-black">Từ chối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderSentRequests = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {sentRequests.length}</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {sentRequests.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">Không có lời mời đã gửi nào.</Text>
          ) : (
            sentRequests.map(req => (
              <View key={req._id} className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <Image
                  source={{ uri: req.receiver?.profilePic || req.receiver?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.receiver?.name || '')}` }}
                  className="w-12 h-12 rounded-full"
                />
                <Text className="ml-3 flex-1 text-base">{req.receiver?.name}</Text>
                <Text className="text-gray-400">Đã gửi</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  // Lấy danh sách lời mời đã gửi khi vào màn hình
  useEffect(() => {
    const fetchSentRequests = async () => {
      try {
        const token = useSelector((state) => state.user.token);
        const res = await axios.get('https://cnm-chatapp-server.onrender.com/api/sent-friend-requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setSentRequests(res.data.data || []);
        } else {
          setSentRequests([]);
        }
      } catch (err) {
        setSentRequests([]);
      }
    };
    fetchSentRequests();
  }, []);

  // Hàm xin quyền và lấy danh bạ
  const getPhoneContacts = async () => {
    try {
      setContactsLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Từ chối', 'Bạn đã từ chối quyền truy cập danh bạ.');
        setContactsLoading(false);
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      setPhoneContacts(data || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể truy cập danh bạ.');
    } finally {
      setContactsLoading(false);
    }
  };

  // Hàm lọc danh bạ máy theo searchQuery
  const filteredPhoneContacts = searchQuery.length > 0
    ? phoneContacts.filter(contact => {
        // Lấy tên đầy đủ, loại bỏ khoảng trắng thừa và chuyển về chữ thường
        const name = (
          contact.name ||
          contact.displayName ||
          contact.firstName ||
          contact.givenName ||
          ''
        ).replace(/\s+/g, ' ').trim().toLowerCase();
        const lastName = (contact.lastName || contact.familyName || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const fullName = (name + ' ' + lastName).replace(/\s+/g, ' ').trim();
        const query = searchQuery.replace(/\s+/g, ' ').trim().toLowerCase();
        // Kiểm tra từng số điện thoại
        const phoneMatch = (contact.phoneNumbers || []).some(p =>
          p.number && p.number.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
        );
        // Kiểm tra tên (fullName, name, lastName)
        const nameMatch =
          fullName.includes(query) ||
          name.includes(query) ||
          lastName.includes(query);
        return nameMatch || phoneMatch;
      })
    : phoneContacts;

  // Render danh bạ máy (sử dụng filteredPhoneContacts)
  const renderPhoneContacts = () => (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <Text className="text-gray-500">Tất cả {phoneContacts.length}</Text>
        <TouchableOpacity onPress={getPhoneContacts}>
          <Text className="text-blue-500">Làm mới</Text>
        </TouchableOpacity>
      </View>
      {contactsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {phoneContacts.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">Không có liên hệ nào.</Text>
          ) : (
            phoneContacts.map((contact, idx) => {
              const phone = contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : '';
              return (
                <TouchableOpacity
                  key={contact.id || idx}
                  className="flex-row items-center px-4 py-3 border-b border-gray-100"
                  onPress={() => openPhoneDialer(phone)}
                >
                  <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                    <FontAwesomeIcon icon={faAddressBook} size={20} color="#0068FF" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base">{contact.name || contact.displayName || `${contact.firstName || ''} ${contact.lastName || ''}`}</Text>
                    {phone && (
                      <Text className="text-sm text-gray-500">{phone}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );

  // Khi chuyển sang tab danh bạ thì tự động lấy danh bạ nếu chưa có
  useEffect(() => {
    if (activeTab === 'phonebook' && phoneContacts.length === 0) {
      getPhoneContacts();
    }
  }, [activeTab]);

  // Hàm mở app gọi điện
  const openPhoneDialer = (phoneNumber) => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng gọi điện.');
    });
  };

  // Đưa renderPhoneContacts lên đầu phần render
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
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
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

        {/* Danh bạ luôn là tab đầu tiên và mặc định */}
        {activeTab === 'phonebook' && renderPhoneContacts()}
        {activeTab === 'friends' && renderFriendList()}
        {activeTab === 'received' && renderFriendRequests()}
        {activeTab === 'sent' && renderSentRequests()}
      </View>
    </SafeAreaView>
  );
};

export default ContactScreen;
