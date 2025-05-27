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
        try {
            setIsSharing(true);
            setSelectedUser(recipient);

            // Get recipient ID from the appropriate property
            const recipientId = recipient.userDetails?._id || recipient._id;
            if (!recipientId) {
                throw new Error('Invalid recipient ID');
            }

            // Determine if this is a group or direct message
            const isGroup = recipient.userDetails?.isGroup === true ||
                recipient.isGroup === true ||
                (typeof recipient.userDetails?.isGroup === 'string' &&
                    recipient.userDetails?.isGroup.toLowerCase() === 'true');

            console.log(`Sharing message to ${isGroup ? 'group' : 'direct'} chat:`, {
                recipientId: recipientId,
                isGroup: isGroup,
                messageType: message.text ? 'text' : 'media',
                hasFiles: message.files?.length > 0 || !!message.imageUrl || !!message.fileUrl
            });

            // FIXED: Create a properly structured message object for the server
            const messageData = {
                // Common fields for both direct and group messages
                text: message.text || "",
                msgByUserId: currentUser._id,
                isShared: true, // Important flag to mark as shared message

                // For direct messages
                sender: currentUser._id,
                receiver: isGroup ? undefined : recipientId,

                // For group messages
                conversationId: isGroup ? recipientId : undefined,

                // Shared content with complete information
                sharedContent: {
                    originalSender: message.msgByUserName || currentUser.name || "Unknown",
                    originalText: message.text || "",
                    originalMessageId: message._id
                }
            };

            // Handle files if present
            if (message.files && message.files.length > 0) {
                console.log(`Sharing message with ${message.files.length} files`);

                // Ensure files have the correct structure
                messageData.files = message.files.map(file => ({
                    url: file.url,
                    name: file.name || "File",
                    type: file.type || inferFileTypeFromUrl(file.url)
                }));

                // Log files being shared
                console.log("Files being shared:", messageData.files.map(f => ({
                    name: f.name,
                    type: f.type
                })));
            } else if (message.imageUrl) {
                // Handle legacy imageUrl format
                console.log("Sharing message with legacy imageUrl");
                messageData.files = [{
                    url: message.imageUrl,
                    name: message.fileName || "Image.jpg",
                    type: "image/jpeg"
                }];
            } else if (message.fileUrl) {
                // Handle legacy fileUrl format
                console.log("Sharing message with legacy fileUrl");
                messageData.files = [{
                    url: message.fileUrl,
                    name: message.fileName || "File",
                    type: inferFileTypeFromUrl(message.fileUrl) || "application/octet-stream"
                }];
            }

            // FIXED: Log the complete message data for debugging
            console.log('Sending message data:', JSON.stringify(messageData, null, 2));

            // Send message using appropriate event
            const eventName = isGroup ? 'newGroupMessage' : 'newMessage';
            socketConnection.emit(eventName, messageData);

            // Wait briefly to ensure the message is processed
            await new Promise(resolve => setTimeout(resolve, 500));

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

    // Helper function to determine file type from URL
    const inferFileTypeFromUrl = (url) => {
        if (!url) return 'application/octet-stream';

        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return 'image/jpeg';
        } else if (url.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
            return 'video/mp4';
        } else if (url.match(/\.(pdf)$/i)) {
            return 'application/pdf';
        } else if (url.match(/\.(doc|docx)$/i)) {
            return 'application/msword';
        }

        return 'application/octet-stream';
    };

    // Add this useEffect to listen for socket events
    useEffect(() => {
        if (!socketConnection || !visible) return;

        // Listen for message sharing success
        const handleMessageSent = (data) => {
            console.log('Message successfully sent:', data);
        };

        // Listen for message sharing errors
        const handleError = (error) => {
            console.error('Socket error when sharing message:', error);
            Alert.alert('Lỗi', error?.message || 'Có lỗi xảy ra khi chia sẻ tin nhắn.');
            setIsSharing(false);
        };

        socketConnection.on('messageSent', handleMessageSent);
        socketConnection.on('error', handleError);

        return () => {
            socketConnection.off('messageSent', handleMessageSent);
            socketConnection.off('error', handleError);
        };
    }, [socketConnection, visible]);

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
