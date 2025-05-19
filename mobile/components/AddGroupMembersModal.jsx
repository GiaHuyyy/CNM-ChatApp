import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faSearch,
  faUserPlus,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { REACT_APP_BACKEND_URL } from '@env';

const AddGroupMembersModal = ({
  visible,
  onClose,
  groupId,
  currentUserId,
  existingMembers = [],
  socketConnection,
  onMembersAdded
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal visibility changes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [visible]);

  // Normalize ID to ensure consistent comparison
  const normalizeId = (id) => {
    if (!id) return '';
    return typeof id === 'object' ? id.toString() : id;
  };

  // Calculate existing member IDs for filtering
  const existingMemberIds = existingMembers.map(member =>
    normalizeId(member._id || member)
  );

  // Handle search input changes
  const handleSearch = async (text) => {
    setSearchQuery(text);

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await axios.post(
        `${REACT_APP_BACKEND_URL}/api/search-friend-user`,
        { search: text },
        { withCredentials: true }
      );

      console.log("Search results:", response?.data?.data?.length);

      // Filter out users who are already in the group
      const filteredResults = (response?.data?.data || []).filter(user =>
        !existingMemberIds.includes(normalizeId(user._id))
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Lỗi", "Không thể tìm kiếm người dùng");
    } finally {
      setIsSearching(false);
    }
  };

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
  const handleAddMembers = () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một người để thêm vào nhóm");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare payload
      const payload = {
        groupId: normalizeId(groupId),
        newMembers: selectedUsers.map(user => normalizeId(user._id)),
        addedBy: normalizeId(currentUserId)
      };

      console.log("Sending addMembersToGroup payload:", payload);

      // Clean up previous listeners
      socketConnection.off("membersAddedToGroup");

      // Set up new listener
      socketConnection.on("membersAddedToGroup", (response) => {
        console.log("Received response:", response);
        setIsSubmitting(false);

        if (response.success) {
          Alert.alert("Thành công", "Đã thêm thành viên vào nhóm");
          if (onMembersAdded) {
            onMembersAdded();
          }
        } else {
          Alert.alert("Lỗi", response.message || "Không thể thêm thành viên vào nhóm");
        }
      });

      // Send the emit event
      socketConnection.emit("addMembersToGroup", payload);

      // Set timeout for response handling
      setTimeout(() => {
        if (isSubmitting) {
          setIsSubmitting(false);
          socketConnection.off("membersAddedToGroup");
          Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ");
        }
      }, 10000);
    } catch (error) {
      console.error("Error adding members:", error);
      setIsSubmitting(false);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm thành viên");
    }
  };

  // Render each search result item
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => normalizeId(u._id) === normalizeId(item._id));

    return (
      <TouchableOpacity
        className={`flex-row items-center p-3 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
        onPress={() => toggleUserSelection(item)}
      >
        <Image
          source={{
            uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`
          }}
          className="w-10 h-10 rounded-full"
        />
        <View className="ml-3 flex-1">
          <Text className="font-medium">{item.name}</Text>
          <Text className="text-gray-500 text-xs">{item.email || item.phone || ''}</Text>
        </View>
        <View className={`w-6 h-6 rounded-full ${isSelected ? 'bg-blue-500' : 'border border-gray-300'} items-center justify-center`}>
          {isSelected && <FontAwesomeIcon icon={faCheck} size={12} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-xl h-[80%]">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-bold">Thêm thành viên</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesomeIcon icon={faTimes} size={20} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View className="p-4">
            <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-2">
              <FontAwesomeIcon icon={faSearch} size={16} color="#888" />
              <TextInput
                placeholder="Tìm kiếm người dùng"
                className="ml-2 flex-1"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selected users count */}
          {selectedUsers.length > 0 && (
            <View className="px-4 pb-2">
              <Text className="text-blue-500">
                Đã chọn {selectedUsers.length} người dùng
              </Text>
            </View>
          )}

          {/* Search results */}
          {isSearching ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0084FF" />
              <Text className="mt-3 text-gray-500">Đang tìm kiếm...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={item => item._id?.toString() || Math.random().toString()}
              className="flex-1"
            />
          ) : searchQuery.length > 0 ? (
            <View className="flex-1 items-center justify-center p-4">
              <FontAwesomeIcon icon={faExclamationTriangle} size={24} color="#888" />
              <Text className="mt-3 text-gray-500 text-center">
                Không tìm thấy người dùng hoặc tất cả người dùng đã ở trong nhóm
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center p-4">
              <FontAwesomeIcon icon={faUserPlus} size={40} color="#0084FF" />
              <Text className="mt-3 text-gray-500 text-center">
                Tìm kiếm người dùng để thêm vào nhóm
              </Text>
            </View>
          )}

          {/* Add button */}
          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity
              className={`py-3 rounded-lg items-center ${isSubmitting || selectedUsers.length === 0
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
                }`}
              onPress={handleAddMembers}
              disabled={isSubmitting || selectedUsers.length === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">
                  {selectedUsers.length > 0
                    ? `Thêm ${selectedUsers.length} thành viên`
                    : 'Thêm thành viên'
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

AddGroupMembersModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  groupId: PropTypes.any,
  currentUserId: PropTypes.any,
  existingMembers: PropTypes.array,
  socketConnection: PropTypes.object,
  onMembersAdded: PropTypes.func
};

export default AddGroupMembersModal;
