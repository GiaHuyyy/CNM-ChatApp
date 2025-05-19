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
    SafeAreaView,
    Alert
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faMagnifyingGlass,
    faTimes,
    faUsers,
    faShare
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';

const ShareMessageModal = ({ visible, onClose, message, allUsers, socketConnection, currentUser, onSuccess }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isSharing, setIsSharing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Filter users based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(allUsers);
            return;
        }

        const filtered = allUsers.filter(user => {
            const userName = user.userDetails?.name || user.name || '';
            return userName.toLowerCase().includes(searchQuery.toLowerCase());
        });

        setFilteredUsers(filtered);
    }, [searchQuery, allUsers]);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            setSelectedUser(null);
            setIsSharing(false);
            setFilteredUsers(allUsers);
        }
    }, [visible, allUsers]);

    const handleShareMessage = async (recipient) => {
        if (!socketConnection || !message) {
            Alert.alert('Lỗi', 'Không thể chia sẻ tin nhắn. Vui lòng thử lại.');
            return;
        }

        setIsSharing(true);
        setSelectedUser(recipient);

        try {
            // Create shared content object with original message data
            const sharedContent = {
                originalText: message.text || '',
                originalSender: message.msgByUserId === currentUser._id ? 'Bạn' : 'Người dùng khác',
                originalImage: message.imageUrl || '',
                originalFile: message.fileUrl || '',
                originalFileName: message.fileName || '',
                isShared: true
            };

            // Create message data
            const recipientId = recipient.userDetails?._id || recipient._id;
            const isGroup = recipient.userDetails?.isGroup || recipient.isGroup;

            const messageData = isGroup ? {
                conversationId: recipientId,
                text: message.text || '',
                msgByUserId: currentUser._id,
                sharedContent,
                isShared: true
            } : {
                sender: currentUser._id,
                receiver: recipientId,
                text: message.text || '',
                msgByUserId: currentUser._id,
                sharedContent,
                isShared: true
            };

            // Include media if present in original message
            if (message.imageUrl) messageData.imageUrl = message.imageUrl;
            if (message.fileUrl) messageData.fileUrl = message.fileUrl;
            if (message.fileName) messageData.fileName = message.fileName;

            // Preserve files array if present
            if (message.files && message.files.length > 0) {
                messageData.files = message.files;
            }

            // Send message using appropriate event
            const eventName = isGroup ? 'newGroupMessage' : 'newMessage';
            socketConnection.emit(eventName, messageData);

            setIsSharing(false);

            // Notify parent component of successful share
            if (onSuccess) {
                onSuccess(recipient);
            }

            onClose();
        } catch (error) {
            console.error('Error sharing message:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi chia sẻ tin nhắn.');
            setIsSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                {/* Header */}
                <View className="bg-blue-500 p-4">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={onClose}>
                            <FontAwesomeIcon icon={faArrowLeft} size={20} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-semibold text-lg flex-1 ml-3">Chia sẻ tin nhắn</Text>
                    </View>

                    {/* Search input */}
                    <View className="mt-3 bg-white rounded-full flex-row items-center px-3 py-1">
                        <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
                        <TextInput
                            className="flex-1 ml-2 text-sm"
                            placeholder="Tìm kiếm người nhận..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Message preview */}
                <View className="p-4 border-b border-gray-200">
                    <Text className="text-gray-500 mb-2">Nội dung chia sẻ:</Text>
                    <View className="bg-gray-100 p-3 rounded-lg">
                        {message?.text ? (
                            <Text className="text-gray-800" numberOfLines={3}>{message.text}</Text>
                        ) : message?.files && message.files.length > 0 ? (
                            <View>
                                <Text className="text-gray-800">Media content</Text>
                                {message.files.some(file => file.type?.startsWith('image/')) && (
                                    <Text className="text-gray-500 text-xs mt-1">Hình ảnh</Text>
                                )}
                                {message.files.some(file => file.type?.startsWith('video/')) && (
                                    <Text className="text-gray-500 text-xs mt-1">Video</Text>
                                )}
                                {message.files.some(file => !file.type?.startsWith('image/') && !file.type?.startsWith('video/')) && (
                                    <Text className="text-gray-500 text-xs mt-1">File đính kèm</Text>
                                )}
                            </View>
                        ) : message?.imageUrl ? (
                            <Text className="text-gray-800">Hình ảnh</Text>
                        ) : message?.fileUrl ? (
                            <Text className="text-gray-800">{message.fileName || 'File đính kèm'}</Text>
                        ) : (
                            <Text className="text-gray-500">Không có nội dung</Text>
                        )}
                    </View>
                </View>

                {/* Contact list */}
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    renderItem={({ item }) => {
                        const contactName = item.userDetails?.name || item.name || 'Người dùng';
                        const contactImage = item.userDetails?.profilePic ||
                            item.profilePic ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}`;
                        const isGroup = item.userDetails?.isGroup || item.isGroup;
                        const isSelected = selectedUser &&
                            (selectedUser._id === item._id ||
                                (selectedUser.userDetails && item.userDetails && selectedUser.userDetails._id === item.userDetails._id));

                        return (
                            <TouchableOpacity
                                className={`flex-row items-center p-3 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''} ${isSharing ? 'opacity-50' : ''}`}
                                onPress={() => !isSharing && handleShareMessage(item)}
                                disabled={isSharing}
                            >
                                <View className="relative">
                                    <Image
                                        source={{ uri: contactImage }}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    {isGroup && (
                                        <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full w-4 h-4 items-center justify-center">
                                            <FontAwesomeIcon icon={faUsers} size={8} color="white" />
                                        </View>
                                    )}
                                </View>
                                <View className="ml-3 flex-1">
                                    <Text className="font-medium">{contactName}</Text>
                                    <Text className="text-gray-500 text-xs">
                                        {isGroup ? 'Nhóm' : 'Chat riêng'}
                                    </Text>
                                </View>
                                {isSharing && isSelected ? (
                                    <ActivityIndicator size="small" color="#0084ff" />
                                ) : (
                                    <FontAwesomeIcon icon={faShare} size={16} color="#0084ff" />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={() => (
                        <View className="p-5 items-center justify-center">
                            <Text className="text-gray-500">
                                {searchQuery ? "Không tìm thấy kết quả" : "Không có liên hệ"}
                            </Text>
                        </View>
                    )}
                />
            </SafeAreaView>
        </Modal>
    );
};

ShareMessageModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    message: PropTypes.object,
    allUsers: PropTypes.array.isRequired,
    socketConnection: PropTypes.object,
    currentUser: PropTypes.object.isRequired,
    onSuccess: PropTypes.func
};

export default ShareMessageModal;
