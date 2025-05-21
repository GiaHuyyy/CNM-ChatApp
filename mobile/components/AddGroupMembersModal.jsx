import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faSearch,
  faArrowLeft,
  faCheck,
  faUserPlus,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import PropTypes from 'prop-types';
import { REACT_APP_BACKEND_URL } from '@env';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AddGroupMembersModal = ({
  visible,
  onClose,
  groupId,
  currentUserId,
  existingMembers = [],
  socketConnection,
  onMembersAdded,
  onSuccess
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError(null);
    }
  }, [visible]);

  // Normalize ID to ensure consistent comparison
  const normalizeId = (id) => {
    if (!id) return '';
    return typeof id === 'object' ? id.toString() : id;
  };

  // Convert existingMembers to a set of IDs for faster lookups
  const existingMemberIds = new Set(existingMembers.map(member =>
    normalizeId(member._id || member)
  ));

  // Handle search with debounce
  useEffect(() => {
    if (!visible || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError(null);

        const response = await axios.post(
          `${REACT_APP_BACKEND_URL}/api/search-friend-user`,
          { search: searchQuery },
          { withCredentials: true }
        );

        console.log(`Found ${response?.data?.data?.length || 0} search results`);

        // Filter out users who are already in the group
        const filteredResults = (response?.data?.data || []).filter(user =>
          !existingMemberIds.has(normalizeId(user._id))
        );

        console.log(`${filteredResults.length} users are not already in the group`);
        setSearchResults(filteredResults);
      } catch (error) {
        console.error("Search error:", error);
        setError("Không thể tìm kiếm người dùng. Vui lòng thử lại sau.");
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, visible, existingMemberIds]);

  // Toggle user selection
  const toggleUserSelection = (user) => {
    const userId = normalizeId(user._id);

    setSelectedUsers(prev => {
      const isSelected = prev.some(u => normalizeId(u._id) === userId);

      if (isSelected) {
        return prev.filter(u => normalizeId(u._id) !== userId);
      } else {
        return [...prev, user];
      }
    });
  };

  // Add members to group
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một người để thêm vào nhóm");
      return;
    }

    if (!socketConnection) {
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
      return;
    }

    if (!groupId) {
      Alert.alert("Lỗi", "Không thể xác định nhóm chat");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Clean up existing listeners to avoid duplicates
      socketConnection.off("membersAddedToGroup");

      // Set up new listener for server response
      socketConnection.on("membersAddedToGroup", (response) => {
        console.log("Received membersAddedToGroup response:", response);
        setIsSubmitting(false);

        if (response.success) {
          // Show success message
          Alert.alert(
            "Thành công",
            "Thành viên đã được thêm vào nhóm",
            [{
              text: "OK", onPress: () => {
                if (onMembersAdded) onMembersAdded();
                if (onSuccess) onSuccess();
                onClose();
              }
            }]
          );
        } else {
          // Show error message
          setError(response.message || "Không thể thêm thành viên vào nhóm");
          Alert.alert("Lỗi", response.message || "Không thể thêm thành viên vào nhóm");
        }
      });

      // Prepare payload with selected user IDs
      const payload = {
        groupId: normalizeId(groupId),
        newMembers: selectedUsers.map(user => normalizeId(user._id)),
        addedBy: normalizeId(currentUserId)
      };

      console.log("Emitting addMembersToGroup with payload:", {
        groupId: payload.groupId,
        memberCount: payload.newMembers.length,
        addedBy: payload.addedBy
      });

      // Send the emit event
      socketConnection.emit("addMembersToGroup", payload);

      // Set timeout for server response
      setTimeout(() => {
        if (isSubmitting) {
          setIsSubmitting(false);
          socketConnection.off("membersAddedToGroup");
          setError("Không nhận được phản hồi từ máy chủ");
          Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ");
        }
      }, 10000);
    } catch (error) {
      console.error("Error adding members:", error);
      setIsSubmitting(false);
      setError("Có lỗi xảy ra khi thêm thành viên");
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm thành viên");
    }
  };

  // Render each search result
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => normalizeId(u._id) === normalizeId(item._id));

    return (
      <TouchableOpacity
        className={`flex-row items-center p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
        onPress={() => toggleUserSelection(item)}
        disabled={isSubmitting}
      >
        <Image
          source={{
            uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`
          }}
          className="w-12 h-12 rounded-full"
          defaultSource={require('../assets/images/default-avatar.jpg')} // Add a default avatar in your assets
        />
        <View className="ml-3 flex-1">
          <Text className="font-medium text-base">{item.name}</Text>
          <Text className="text-gray-500 text-sm">{item.email || item.phone || ''}</Text>
        </View>
        <View className={`w-7 h-7 rounded-full ${isSelected ? 'bg-blue-500' : 'border border-gray-300'} items-center justify-center`}>
          {isSelected && <FontAwesomeIcon icon={faCheck} size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={onClose} className="pr-4">
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#000" />
            </TouchableOpacity>
            <Text className="text-xl font-bold flex-1">Thêm thành viên</Text>

            {selectedUsers.length > 0 && !isSubmitting && (
              <TouchableOpacity
                onPress={handleAddMembers}
                className="bg-blue-500 px-4 py-1.5 rounded-full"
              >
                <Text className="text-white font-medium">Thêm</Text>
              </TouchableOpacity>
            )}

            {isSubmitting && (
              <ActivityIndicator size="small" color="#0084ff" />
            )}
          </View>

          {/* Search bar */}
          <View className="px-4 py-3 border-b border-gray-100">
            <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-2">
              <FontAwesomeIcon icon={faSearch} size={16} color="#888" />
              <TextInput
                placeholder="Tìm kiếm người dùng"
                className="ml-2 flex-1 text-base"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Selected users count */}
          {selectedUsers.length > 0 && (
            <View className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <Text className="text-blue-700 font-medium">
                Đã chọn {selectedUsers.length} người dùng
              </Text>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View className="px-4 py-3 bg-red-50 border-b border-red-100">
              <Text className="text-red-700">{error}</Text>
            </View>
          )}

          {/* Search results */}
          {isSearching ? (
            <View className="flex-1 items-center justify-center p-10">
              <ActivityIndicator size="large" color="#0084FF" />
              <Text className="mt-4 text-gray-500">Đang tìm kiếm...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={item => item._id?.toString() || Math.random().toString()}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            />
          ) : searchQuery.length > 0 ? (
            <View className="flex-1 items-center justify-center p-10">
              <FontAwesomeIcon icon={faExclamationTriangle} size={40} color="#888" />
              <Text className="mt-4 text-gray-500 text-center">
                Không tìm thấy người dùng hoặc tất cả người dùng đã ở trong nhóm
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center p-10">
              <FontAwesomeIcon icon={faUserPlus} size={60} color="#0084FF" />
              <Text className="mt-4 text-gray-600 text-center text-lg">
                Tìm kiếm người dùng để thêm vào nhóm
              </Text>
              <Text className="mt-2 text-gray-500 text-center">
                Bạn có thể tìm theo tên, email hoặc số điện thoại
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

AddGroupMembersModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  groupId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  existingMembers: PropTypes.array,
  socketConnection: PropTypes.object,
  onMembersAdded: PropTypes.func,
  onSuccess: PropTypes.func
};

export default AddGroupMembersModal;
