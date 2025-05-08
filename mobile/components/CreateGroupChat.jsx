import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faTimes,
  faMagnifyingGlass,
  faCheck,
  faUserPlus,
  faUsers,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import PropTypes from "prop-types";
import { REACT_APP_BACKEND_URL } from "@env";

const CreateGroupChat = ({ visible, onClose, socketConnection, userId, onGroupCreated }) => {
  // State variables
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allAvailableUsers, setAllAvailableUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Debug socket connection status
  const [socketStatus, setSocketStatus] = useState({
    connected: false,
    lastChecked: null,
  });

  // Check socket connection status when modal is opened
  useEffect(() => {
    if (visible && socketConnection) {
      setSocketStatus({
        connected: socketConnection.connected,
        lastChecked: new Date().toLocaleTimeString(),
      });

      // Set up event listeners to track connection
      const handleConnect = () => {
        console.log("Socket connected");
        setSocketStatus((prev) => ({
          ...prev,
          connected: true,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      };

      const handleDisconnect = () => {
        console.log("Socket disconnected");
        setSocketStatus((prev) => ({
          ...prev,
          connected: false,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      };

      socketConnection.on("connect", handleConnect);
      socketConnection.on("disconnect", handleDisconnect);

      return () => {
        socketConnection.off("connect", handleConnect);
        socketConnection.off("disconnect", handleDisconnect);
      };
    }
  }, [visible, socketConnection]);

  // Load users when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadUsers();
      // Reset state when modal opens
      setGroupName("");
      setSelectedUsers([]);
      setSearchQuery("");
    }
  }, [visible]);

  // Load all available users
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.post(
        `${REACT_APP_BACKEND_URL}/api/search-friend-user`,
        { search: "" } // Empty search to get all users
      );

      if (response.data && response.data.data) {
        // Filter out group chats, only include user contacts
        const users = response.data.data.filter((item) => !item.isGroup);
        setAllAvailableUsers(users);
        console.log(`Loaded ${users.length} friends`);
      } else {
        console.warn("Unexpected API response format:", response.data);
        setAllAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách bạn bè");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Handle user search
  const handleSearch = async (text) => {
    setSearchQuery(text);

    if (!text.trim()) {
      setFilteredUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    try {
      const response = await axios.post(`${REACT_APP_BACKEND_URL}/api/search-friend-user`, { search: text });

      if (response.data && response.data.data) {
        // Only include users, not groups
        const results = response.data.data.filter((item) => !item.isGroup);
        setFilteredUsers(results);
        console.log(`Found ${results.length} matches for "${text}"`);
      } else {
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setFilteredUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      if (selectedUsers.length >= 20) {
        Alert.alert("Giới hạn", "Nhóm chat có thể có tối đa 20 thành viên");
        return;
      }
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Create group function
  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length < 2) {
      Alert.alert("Thiếu thành viên", "Vui lòng chọn ít nhất 2 thành viên để tạo nhóm");
      return;
    }

    if (!socketConnection) {
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    // Clean up any previous listeners to avoid duplicate events
    socketConnection.off("groupCreated");

    // Set up socket event listener for group creation response
    socketConnection.on("groupCreated", (response) => {
      console.log("Group creation response:", response);
      setIsCreatingGroup(false);

      if (response && response.success) {
        Alert.alert("Thành công", "Đã tạo nhóm chat thành công", [
          {
            text: "OK",
            onPress: () => {
              onClose();
              if (onGroupCreated) onGroupCreated(response.conversationId);
            },
          },
        ]);
      } else {
        Alert.alert("Lỗi", response?.message || "Không thể tạo nhóm chat, vui lòng thử lại");
      }
    });

    // Start creating group
    setIsCreatingGroup(true);

    // Get only the member IDs, not the full user objects
    const memberIds = selectedUsers.map((id) => (typeof id === "object" ? id.toString() : id));

    // Add the current user to the members array if not already included
    if (!memberIds.includes(userId)) {
      memberIds.push(userId);
    }

    // Create the payload exactly matching the web client implementation
    const payload = {
      name: groupName.trim(),
      members: memberIds,
      creator: userId,
    };

    console.log("Creating group with payload:", {
      name: payload.name,
      memberCount: payload.members.length,
      members: payload.members,
    });

    // Log socket connection status for debugging
    console.log("Socket connected status:", socketConnection.connected);

    // Emit the socket event to create the group
    socketConnection.emit("createGroupChat", payload);

    // Add timeout for server response
    setTimeout(() => {
      if (isCreatingGroup) {
        socketConnection.off("groupCreated");
        setIsCreatingGroup(false);
        Alert.alert("Timeout", "Server không phản hồi. Vui lòng thử lại sau.", [{ text: "OK" }]);
      }
    }, 15000); // Extended timeout to 15 seconds
  };

  // Render each user item in the list
  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      className={`flex-row items-center p-3 border-b border-gray-100 ${
        selectedUsers.includes(item._id) ? "bg-blue-50" : ""
      }`}
      onPress={() => toggleUserSelection(item._id)}
    >
      <Image
        source={{
          uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`,
        }}
        className="w-10 h-10 rounded-full"
      />
      <Text className="ml-3 flex-1 font-medium">{item.name}</Text>
      {selectedUsers.includes(item._id) ? (
        <View className="h-6 w-6 bg-blue-500 rounded-full items-center justify-center">
          <FontAwesomeIcon icon={faCheck} size={12} color="white" />
        </View>
      ) : (
        <View className="h-6 w-6 rounded-full border border-gray-300 items-center justify-center">
          <FontAwesomeIcon icon={faUserPlus} size={12} color="#666" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
        <View className="bg-white w-[90%] rounded-xl p-5 max-h-[80%]">
          {/* Header with title and close button */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faUsers} size={20} color="#0084ff" className="mr-2" />
              <Text className="text-lg font-bold">Tạo nhóm chat mới</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Socket connection status indicator */}
          <View className="flex-row items-center mb-3">
            <View className={`h-2 w-2 rounded-full mr-2 ${socketStatus.connected ? "bg-green-500" : "bg-red-500"}`} />
            <Text className="text-xs text-gray-500">
              {socketStatus.connected ? "Kết nối máy chủ: Đã kết nối" : "Kết nối máy chủ: Đang kết nối..."}
            </Text>
          </View>

          {/* Group name input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-600 mb-1">Tên nhóm</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>

          {/* Search input */}
          <View className="border border-gray-300 rounded-lg p-2 mb-4 flex-row items-center">
            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" className="mr-2" />
            <TextInput
              placeholder="Tìm kiếm bạn bè"
              className="flex-1"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected users display */}
          <View className="mb-3">
            <Text className="font-semibold">Đã chọn ({selectedUsers.length}/20):</Text>
            {selectedUsers.length > 0 ? (
              <View className="flex-row flex-wrap mt-2">
                {selectedUsers.map((userId) => {
                  const user = allAvailableUsers.find((u) => u._id === userId);
                  return user ? (
                    <View key={userId} className="bg-blue-100 rounded-full px-2 py-1 mr-2 mb-2 flex-row items-center">
                      <Text className="mr-1">{user.name}</Text>
                      <TouchableOpacity onPress={() => toggleUserSelection(userId)}>
                        <FontAwesomeIcon icon={faTimes} size={14} color="#555" />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>
            ) : (
              <Text className="text-gray-500 italic mt-1">Chưa chọn thành viên nào</Text>
            )}
          </View>

          <Text className="font-semibold mb-2">Danh sách bạn bè:</Text>

          {/* User list */}
          {isLoadingUsers ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="large" color="#0084ff" />
              <Text className="mt-3 text-gray-500">Đang tải danh sách bạn bè...</Text>
            </View>
          ) : (
            <FlatList
              data={searchQuery.trim() ? filteredUsers : allAvailableUsers}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 300 }}
              renderItem={renderUserItem}
              ListEmptyComponent={() => (
                <View className="items-center justify-center py-8">
                  {searchQuery.trim() ? (
                    <>
                      <FontAwesomeIcon icon={faMagnifyingGlass} size={30} color="#ccc" />
                      <Text className="text-center text-gray-500 mt-2">Không tìm thấy kết quả cho "{searchQuery}"</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserCircle} size={30} color="#ccc" />
                      <Text className="text-center text-gray-500 mt-2">Không có bạn bè nào</Text>
                    </>
                  )}
                </View>
              )}
            />
          )}

          {/* Loading indicator when creating group */}
          {isCreatingGroup && (
            <View className="mb-4 bg-blue-50 p-3 rounded-lg">
              <ActivityIndicator size="small" color="#0084ff" className="mb-2" />
              <Text className="text-blue-600 text-center">Đang tạo nhóm chat, vui lòng đợi...</Text>
            </View>
          )}

          {/* Create group button */}
          <TouchableOpacity
            className={`mt-4 py-3 rounded-lg items-center ${
              groupName.trim() && selectedUsers.length >= 2 && socketStatus.connected ? "bg-blue-500" : "bg-gray-300"
            }`}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length < 2 || !socketStatus.connected || isCreatingGroup}
          >
            {isCreatingGroup ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold">
                {socketStatus.connected ? "Tạo nhóm" : "Đang kết nối..."}
              </Text>
            )}
          </TouchableOpacity>

          {/* Show troubleshooting message if there's a connection issue */}
          {!socketStatus.connected && (
            <Text className="text-xs text-center text-red-500 mt-2">Đang đợi kết nối đến máy chủ...</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

CreateGroupChat.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  socketConnection: PropTypes.object,
  userId: PropTypes.string.isRequired,
  onGroupCreated: PropTypes.func,
};

export default CreateGroupChat;
