import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    Image, Modal, ActivityIndicator
} from 'react-native';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
    faTimes, faMagnifyingGlass, faCheck, faUserPlus,
    faUsers, faUserCircle
} from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import PropTypes from 'prop-types';
import ConfirmationModal from './ConfirmationModal';

const AddGroupMembersModal = ({
    visible,
    onClose,
    groupId,
    currentUserId,
    existingMembers,
    socketConnection,
    onMembersAdded
}) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [allAvailableUsers, setAllAvailableUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: "",
        message: "",
        action: null,
        type: "info"
    });

    // Get the list of existing member IDs
    const existingMemberIds = useMemo(() => {
        return existingMembers.map(member =>
            typeof member === 'object' ? member._id : member
        );
    }, [existingMembers]);

    useEffect(() => {
        if (visible) {
            loadUsers();
            setSelectedUsers([]);
            setSearchQuery('');
        }
    }, [visible, existingMemberIds]);

    // Load all available users who are not already in the group
    const loadUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await axios.post(
                "http://localhost:5000/api/search-friend-user",
                { search: "" }
            );

            if (response.data && response.data.data) {
                // Filter out users who are already in the group
                const availableUsers = response.data.data.filter(user =>
                    !user.isGroup &&
                    !existingMemberIds.includes(user._id) &&
                    user._id !== currentUserId
                );

                setAllAvailableUsers(availableUsers);
                console.log(`Loaded ${availableUsers.length} available users to add`);
            } else {
                setAllAvailableUsers([]);
            }
        } catch (error) {
            console.error("Error loading users:", error);
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể tải danh sách người dùng",
                type: "error"
            });
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Search functionality
    const handleSearch = async (text) => {
        setSearchQuery(text);

        if (!text.trim()) {
            setFilteredUsers([]);
            return;
        }

        setIsLoadingUsers(true);
        try {
            const response = await axios.post(
                "http://localhost:5000/api/search-friend-user",
                { search: text }
            );

            if (response.data && response.data.data) {
                // Filter search results to exclude existing members
                const results = response.data.data.filter(user =>
                    !user.isGroup &&
                    !existingMemberIds.includes(user._id) &&
                    user._id !== currentUserId
                );

                setFilteredUsers(results);
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

    const toggleUserSelection = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    // Add selected members to the group
    const handleAddMembers = () => {
        if (selectedUsers.length === 0) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Vui lòng chọn ít nhất một người dùng để thêm vào nhóm",
                type: "error"
            });
            return;
        }

        if (!socketConnection) {
            setConfirmModal({
                visible: true,
                title: "Lỗi kết nối",
                message: "Không thể kết nối đến máy chủ",
                type: "error"
            });
            return;
        }

        setIsAddingMembers(true);

        // Clean up previous listeners
        socketConnection.off("membersAddedToGroup");

        // Listen for response
        socketConnection.on("membersAddedToGroup", (response) => {
            setIsAddingMembers(false);

            if (response.success) {
                setConfirmModal({
                    visible: true,
                    title: "Thành công",
                    message: "Đã thêm thành viên vào nhóm",
                    type: "success",
                    action: onMembersAdded
                });
            } else {
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: response.message || "Không thể thêm thành viên vào nhóm",
                    type: "error"
                });
            }
        });

        // Send request to add members
        socketConnection.emit("addMembersToGroup", {
            groupId: groupId,
            newMembers: selectedUsers,
            addedBy: currentUserId
        });

        // Set timeout in case of no response
        setTimeout(() => {
            if (isAddingMembers) {
                setIsAddingMembers(false);
                socketConnection.off("membersAddedToGroup");
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: "Không nhận được phản hồi từ máy chủ",
                    type: "error"
                });
            }
        }, 10000);
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity
            className={`flex-row items-center p-3 border-b border-gray-100 ${selectedUsers.includes(item._id) ? 'bg-blue-50' : ''
                }`}
            onPress={() => toggleUserSelection(item._id)}
        >
            <Image
                source={{
                    uri: item.profilePic ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`
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
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
                <View className="bg-white w-[90%] rounded-xl p-5 max-h-[80%]">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                            <FontAwesomeIcon icon={faUsers} size={20} color="#0084ff" className="mr-2" />
                            <Text className="text-lg font-bold">Thêm thành viên mới</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {/* Search input */}
                    <View className="border border-gray-300 rounded-lg p-2 mb-4 flex-row items-center">
                        <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" className="mr-2" />
                        <TextInput
                            placeholder="Tìm kiếm người dùng"
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
                        <Text className="font-semibold">Đã chọn ({selectedUsers.length}):</Text>
                        {selectedUsers.length > 0 ? (
                            <View className="flex-row flex-wrap mt-2">
                                {selectedUsers.map(userId => {
                                    const user = allAvailableUsers.find(u => u._id === userId);
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

                    {/* Available users list */}
                    <Text className="font-semibold mb-2">Bạn bè có thể thêm:</Text>
                    {isLoadingUsers ? (
                        <View className="items-center justify-center py-10">
                            <ActivityIndicator size="large" color="#0084ff" />
                            <Text className="mt-3 text-gray-500">Đang tải danh sách người dùng...</Text>
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
                                            <Text className="text-center text-gray-500 mt-2">
                                                Không tìm thấy kết quả cho "{searchQuery}"
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faUserCircle} size={30} color="#ccc" />
                                            <Text className="text-center text-gray-500 mt-2">
                                                Không có người dùng nào có thể thêm
                                            </Text>
                                        </>
                                    )}
                                </View>
                            )}
                        />
                    )}

                    {/* Add button */}
                    <TouchableOpacity
                        className={`mt-4 py-3 rounded-lg items-center ${selectedUsers.length > 0 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                        onPress={handleAddMembers}
                        disabled={selectedUsers.length === 0 || isAddingMembers}
                    >
                        {isAddingMembers ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-semibold">Thêm vào nhóm</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Confirmation Modal */}
            <ConfirmationModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    if (confirmModal.action) {
                        confirmModal.action();
                    }
                    setConfirmModal({ ...confirmModal, visible: false });
                }}
                onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
                type={confirmModal.type}
            />
        </Modal>
    );
};

AddGroupMembersModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    groupId: PropTypes.string,
    currentUserId: PropTypes.string.isRequired,
    existingMembers: PropTypes.array.isRequired,
    socketConnection: PropTypes.object,
    onMembersAdded: PropTypes.func
};

export default AddGroupMembersModal;
