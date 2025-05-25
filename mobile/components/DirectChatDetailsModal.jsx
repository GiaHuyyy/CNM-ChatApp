import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    ScrollView,
    FlatList,
    Dimensions,
    Alert,
    Linking,
    TextInput,
    StatusBar,
    Platform,
    PanResponder,
    Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faBell,
    faTimes,
    faImage,
    faFile,
    faLink,
    faTrash,
    faFileAlt,
    faFilePen,
    faVideoCamera,
    faPhone,
    faEnvelope,
    faUserTie,
    faUserCircle,
    faEdit,
    faCheck,
    faArrowRight,
    faUserPlus,
    faUserMinus,
    faUsers,
    faSignOutAlt,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 60) / 3;

// Helper functions to identify file types
const isImageFile = (url) => {
    if (!url) return false;
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
    return extensions.some(ext => url.toLowerCase().endsWith(ext));
};

const isVideoFile = (url) => {
    if (!url) return false;
    const extensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
    return extensions.some(ext => url.toLowerCase().endsWith(ext));
};

const isLinkText = (text) => {
    return text && (text.startsWith("http://") || text.startsWith("https://"));
};

const DirectChatDetailsModal = ({
    visible,
    onClose,
    user,
    currentUser,
    messages,
    onDeleteConversation,
    onUpdateNickname,
    // New props for group functionality
    onLeaveGroup,
    onDeleteGroup,
    onAddMember,
    onRemoveMember,
    group = null
}) => {
    const [activeTab, setActiveTab] = useState('media');
    const [activeSection, setActiveSection] = useState('main');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
    const [showMembersList, setShowMembersList] = useState(false);

    // Add animation values for swipe transition
    const translateX = useState(new Animated.Value(0))[0];
    const mediaOpacity = useState(new Animated.Value(1))[0];

    // Add state for nickname editing
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState('');

    // Check if this is a group chat
    const isGroupChat = !!group;

    // Check if user is admin of group
    const isAdmin = isGroupChat &&
        (currentUser?._id === (group.groupAdmin?._id || group.groupAdmin));

    // Initialize nickname when component mounts or user changes
    useEffect(() => {
        if (!isGroupChat && user && user.nickname) {
            setNickname(user.nickname);
        } else if (user && user.name) {
            setNickname(''); // Start with empty if no nickname exists
        }
    }, [user, isGroupChat]);

    // Function to handle saving the nickname
    const handleSaveNickname = () => {
        if (onUpdateNickname) {
            onUpdateNickname(nickname.trim());
        }
        setIsEditingNickname(false);
    };

    // Process messages to extract media, files, and links
    const extractMediaItems = (messages, type) => {
        const items = [];

        messages.forEach(message => {
            // For links
            if (type === 'link' && message.text && isLinkText(message.text)) {
                items.push(message);
                return;
            }

            // Check for files array first (modern format)
            if (message.files && Array.isArray(message.files) && message.files.length > 0) {
                if (type === 'media') {
                    // Extract media files (images and videos)
                    const mediaFiles = message.files.filter(file =>
                        file.type?.startsWith('image/') || file.type?.startsWith('video/')
                    );

                    mediaFiles.forEach(file => {
                        items.push({
                            ...message,
                            _id: `${message._id}-${file.url}`,
                            mediaUrl: file.url,
                            mediaType: file.type?.startsWith('video/') ? 'video' : 'image',
                        });
                    });
                }
                else if (type === 'file') {
                    // Extract document files (not images or videos)
                    const docFiles = message.files.filter(file =>
                        !file.type?.startsWith('image/') && !file.type?.startsWith('video/')
                    );

                    docFiles.forEach(file => {
                        items.push({
                            ...message,
                            _id: `${message._id}-${file.url}`,
                            fileUrl: file.url,
                            fileName: file.name,
                        });
                    });
                }
            }
            else {
                // Legacy format (direct properties)
                if (type === 'media') {
                    if (message.imageUrl && isImageFile(message.imageUrl)) {
                        items.push({
                            ...message,
                            mediaUrl: message.imageUrl,
                            mediaType: 'image',
                        });
                    }
                    else if (message.fileUrl && isVideoFile(message.fileUrl)) {
                        items.push({
                            ...message,
                            mediaUrl: message.fileUrl,
                            mediaType: 'video',
                        });
                    }
                }
                else if (type === 'file') {
                    if (message.fileUrl && !isImageFile(message.fileUrl) && !isVideoFile(message.fileUrl)) {
                        items.push({
                            ...message,
                            fileUrl: message.fileUrl,
                            fileName: message.fileName || "File",
                        });
                    }
                }
            }
        });

        return items;
    };

    const mediaItems = extractMediaItems(messages, 'media');
    const fileItems = extractMediaItems(messages, 'file');
    const linkItems = extractMediaItems(messages, 'link');

    const handleMediaPress = (item, index) => {
        setSelectedMedia(item);
        setSelectedMediaIndex(index);
        setMediaViewerVisible(true);

        // Reset animation values when opening viewer
        translateX.setValue(0);
        mediaOpacity.setValue(1);
    };

    const navigateMedia = (direction) => {
        const newIndex = selectedMediaIndex + direction;

        // Check if the new index is valid
        if (newIndex >= 0 && newIndex < mediaItems.length) {
            // Animate the transition
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: direction * -300, // Move in the direction of navigation
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(mediaOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => {
                // Update the selected media
                setSelectedMedia(mediaItems[newIndex]);
                setSelectedMediaIndex(newIndex);

                // Reset animation values
                translateX.setValue(0);
                mediaOpacity.setValue(0);

                // Fade in the new media
                Animated.timing(mediaOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            });
        }
    };

    // Create pan responder for swipe gestures
    const panResponder = useState(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                // If we're at the first item and trying to swipe right (previous), or
                // at the last item and trying to swipe left (next), reduce the movement
                if ((selectedMediaIndex === 0 && gestureState.dx > 0) ||
                    (selectedMediaIndex === mediaItems.length - 1 && gestureState.dx < 0)) {
                    translateX.setValue(gestureState.dx / 3); // Reduced movement
                } else {
                    translateX.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // Determine if swipe was significant
                if (Math.abs(gestureState.dx) > 120) {
                    // Significant swipe
                    if (gestureState.dx > 0 && selectedMediaIndex > 0) {
                        // Swipe right - show previous
                        navigateMedia(-1);
                    } else if (gestureState.dx < 0 && selectedMediaIndex < mediaItems.length - 1) {
                        // Swipe left - show next
                        navigateMedia(1);
                    } else {
                        // Edge case - animate back to center
                        Animated.spring(translateX, {
                            toValue: 0,
                            tension: 40,
                            useNativeDriver: true,
                        }).start();
                    }
                } else {
                    // Not a significant swipe - animate back to center
                    Animated.spring(translateX, {
                        toValue: 0,
                        tension: 40,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    )[0];

    const handleDeleteConversation = () => {
        console.log("Delete conversation button pressed");
        if (typeof onDeleteConversation === 'function') {
            console.log("Calling onDeleteConversation function");
            Alert.alert(
                "Xóa đoạn chat",
                "Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?",
                [
                    { text: "Hủy", style: "cancel" },
                    {
                        text: "Xóa",
                        style: "destructive",
                        onPress: () => {
                            console.log("Delete confirmed by user");
                            // Close the modal first to improve user experience
                            onClose();
                            // Small delay before executing delete to ensure modal closes smoothly
                            setTimeout(() => {
                                onDeleteConversation();
                            }, 300);
                        }
                    }
                ]
            );
        } else {
            console.error("onDeleteConversation is not a function", onDeleteConversation);
            Alert.alert("Lỗi", "Không thể xóa hội thoại. Vui lòng thử lại sau.");
        }
    };

    const handleDeleteGroup = () => {
        if (typeof onDeleteGroup === 'function' && isAdmin) {
            Alert.alert(
                "Xóa nhóm chat",
                "Bạn có chắc chắn muốn xóa nhóm chat này? Hành động này không thể hoàn tác.",
                [
                    { text: "Hủy", style: "cancel" },
                    {
                        text: "Xóa",
                        style: "destructive",
                        onPress: () => {
                            onClose();
                            setTimeout(() => {
                                onDeleteGroup();
                            }, 300);
                        }
                    }
                ]
            );
        } else {
            Alert.alert("Lỗi", "Không thể xóa nhóm chat. Vui lòng thử lại sau.");
        }
    };

    const handleLeaveGroup = () => {
        if (typeof onLeaveGroup === 'function') {
            Alert.alert(
                "Rời nhóm chat",
                "Bạn có chắc chắn muốn rời khỏi nhóm chat này?",
                [
                    { text: "Hủy", style: "cancel" },
                    {
                        text: "Rời nhóm",
                        style: "destructive",
                        onPress: () => {
                            onClose();
                            setTimeout(() => {
                                onLeaveGroup();
                            }, 300);
                        }
                    }
                ]
            );
        } else {
            Alert.alert("Lỗi", "Không thể rời khỏi nhóm chat. Vui lòng thử lại sau.");
        }
    };

    const handleRemoveMember = (memberId, memberName) => {
        if (typeof onRemoveMember === 'function' && isAdmin) {
            Alert.alert(
                "Xóa thành viên",
                `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
                [
                    { text: "Hủy", style: "cancel" },
                    {
                        text: "Xóa",
                        style: "destructive",
                        onPress: () => {
                            onRemoveMember(memberId, memberName);
                        }
                    }
                ]
            );
        }
    };

    // Get safe area insets to handle notches and status bars
    const insets = useSafeAreaInsets();

    const renderHeader = () => (
        <View className="bg-white w-full z-10" style={{ paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View className="flex-row items-center justify-center h-[50px] bg-white border-b border-gray-200 px-4">
                <TouchableOpacity
                    onPress={() => {
                        if (showMembersList) {
                            setShowMembersList(false);
                        } else if (activeSection !== 'main') {
                            setActiveSection('main');
                        } else {
                            onClose();
                        }
                    }}
                    className="absolute left-4 py-2.5 px-1.5"
                >
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#333" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold">
                    {showMembersList ? "Thành viên nhóm" :
                        activeSection === 'main' ? 'Thông tin' :
                            activeSection === 'media' ? 'Ảnh/Video' :
                                activeSection === 'files' ? 'Tệp' : 'Liên kết'}
                </Text>
                <TouchableOpacity onPress={onClose} className="absolute right-4 py-2.5 px-1.5">
                    <FontAwesomeIcon icon={faTimes} size={20} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMemberListSection = () => {
        if (!isGroupChat || !group || !group.members) return null;

        return (
            <ScrollView className="flex-1 bg-gray-100">
                <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
                    <Text className="text-lg font-semibold">Thành viên ({group.members?.length || 0})</Text>

                    {isAdmin && (
                        <TouchableOpacity
                            className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full"
                            onPress={onAddMember}
                        >
                            <FontAwesomeIcon icon={faUserPlus} size={18} color="#0084ff" />
                            <Text className="ml-2 text-blue-500 text-sm">Thêm thành viên</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {group.members?.map(member => (
                    <View key={member._id} className="flex-row items-center justify-between p-3 bg-white border-b border-gray-100">
                        <View className="flex-row items-center flex-1">
                            <Image
                                source={{ uri: member.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                                className="w-10 h-10 rounded-full"
                            />
                            <View className="ml-3">
                                <Text className="text-base">
                                    {member._id === currentUser._id ? "Bạn" : member.name}
                                </Text>
                                {(group.groupAdmin?._id === member._id || group.groupAdmin === member._id) && (
                                    <View className="bg-blue-50 px-2 py-0.5 rounded mt-1 self-start">
                                        <Text className="text-xs text-blue-500">Quản trị viên</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {isAdmin && member._id !== currentUser._id && (
                            <TouchableOpacity
                                className="p-2 bg-red-50 rounded-full"
                                onPress={() => handleRemoveMember(member._id, member.name)}
                            >
                                <FontAwesomeIcon icon={faUserMinus} size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </ScrollView>
        );
    };

    const renderMainSection = () => {
        if (showMembersList) {
            return renderMemberListSection();
        }

        return (
            <ScrollView className="flex-1 bg-gray-100">
                {/* Profile Section */}
                <View className="flex-row items-center p-5 bg-white border-b border-gray-200">
                    <Image
                        source={{
                            uri: isGroupChat
                                ? (group?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || 'Group')}&background=random`)
                                : (user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`)
                        }}
                        className="w-20 h-20 rounded-full"
                    />
                    <View className="ml-4 flex-1">
                        {isGroupChat ? (
                            <Text className="text-lg font-semibold">{group?.name}</Text>
                        ) : isEditingNickname ? (
                            <View className="flex-row items-center w-full">
                                <TextInput
                                    className="flex-1 border-b border-blue-500 text-base py-1 mr-2"
                                    value={nickname}
                                    onChangeText={setNickname}
                                    placeholder={user?.name || 'Enter nickname'}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    className="p-1"
                                    onPress={handleSaveNickname}
                                >
                                    <FontAwesomeIcon icon={faCheck} size={16} color="#3b82f6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="p-1"
                                    onPress={() => setIsEditingNickname(false)}
                                >
                                    <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="flex-row items-center">
                                <Text className="text-lg font-semibold">
                                    {user?.nickname || user?.name}
                                    {user?.nickname && <Text className="text-sm text-gray-500"> ({user?.name})</Text>}
                                </Text>
                                <TouchableOpacity
                                    className="p-1 ml-2"
                                    onPress={() => setIsEditingNickname(true)}
                                >
                                    <FontAwesomeIcon icon={faEdit} size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {isGroupChat ? (
                            <Text className="text-gray-500 text-sm mt-1">
                                {group.members?.length || 0} thành viên
                            </Text>
                        ) : (
                            <Text className="text-green-500 text-sm mt-1">{user?.online ? "Đang hoạt động" : "Không hoạt động"}</Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons - Different for group and direct chat */}
                {isGroupChat ? (
                    <View className="flex-row justify-around p-4 bg-white mt-2.5">
                        <TouchableOpacity
                            className="items-center"
                            onPress={() => setShowMembersList(true)}
                        >
                            <View className="w-[50px] h-[50px] rounded-full bg-blue-500 justify-center items-center mb-1">
                                <FontAwesomeIcon icon={faUsers} size={18} color="#fff" />
                            </View>
                            <Text className="text-xs text-gray-600 mt-1">Thành viên</Text>
                        </TouchableOpacity>

                        {isAdmin ? (
                            <TouchableOpacity
                                className="items-center"
                                onPress={onAddMember}
                            >
                                <View className="w-[50px] h-[50px] rounded-full bg-green-500 justify-center items-center mb-1">
                                    <FontAwesomeIcon icon={faUserPlus} size={18} color="#fff" />
                                </View>
                                <Text className="text-xs text-gray-600 mt-1">Thêm thành viên</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                className="items-center"
                                onPress={handleLeaveGroup}
                            >
                                <View className="w-[50px] h-[50px] rounded-full bg-orange-500 justify-center items-center mb-1">
                                    <FontAwesomeIcon icon={faSignOutAlt} size={18} color="#fff" />
                                </View>
                                <Text className="text-xs text-gray-600 mt-1">Rời nhóm</Text>
                            </TouchableOpacity>
                        )}

                        {isAdmin && (
                            <TouchableOpacity
                                className="items-center"
                                onPress={handleDeleteGroup}
                            >
                                <View className="w-[50px] h-[50px] rounded-full bg-red-500 justify-center items-center mb-1">
                                    <FontAwesomeIcon icon={faTrash} size={18} color="#fff" />
                                </View>
                                <Text className="text-xs text-gray-600 mt-1">Xóa nhóm</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View className="flex-row justify-around p-4 bg-white mt-2.5">
                        <TouchableOpacity className="items-center">
                            <View className="w-[50px] h-[50px] rounded-full bg-blue-500 justify-center items-center mb-1">
                                <FontAwesomeIcon icon={faPhone} size={18} color="#fff" />
                            </View>
                            <Text className="text-xs text-gray-600 mt-1">Gọi thoại</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="items-center">
                            <View className="w-[50px] h-[50px] rounded-full bg-green-500 justify-center items-center mb-1">
                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                            </View>
                            <Text className="text-xs text-gray-600 mt-1">Gọi video</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="items-center">
                            <View className="w-[50px] h-[50px] rounded-full bg-orange-500 justify-center items-center mb-1">
                                <FontAwesomeIcon icon={faUserCircle} size={18} color="#fff" />
                            </View>
                            <Text className="text-xs text-gray-600 mt-1">Xem hồ sơ</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Group Members Section (Preview) */}
                {isGroupChat && (
                    <TouchableOpacity
                        className="p-4 bg-white mt-2.5"
                        onPress={() => setShowMembersList(true)}
                    >
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-base font-semibold">Thành viên nhóm</Text>
                            <FontAwesomeIcon icon={faChevronRight} size={16} color="#888" />
                        </View>

                        <View className="flex-row items-center">
                            {group.members?.slice(0, 5).map(member => (
                                <Image
                                    key={member._id}
                                    source={{ uri: member.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                                    className="w-9 h-9 rounded-full -mr-2 border-2 border-white"
                                />
                            ))}
                            {group.members?.length > 5 && (
                                <View className="w-9 h-9 rounded-full bg-gray-300 justify-center items-center ml-1">
                                    <Text className="text-xs font-bold text-gray-600">+{group.members.length - 5}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Additional info - only for direct chats */}
                {!isGroupChat && (
                    <View className="bg-white mt-2.5 py-1">
                        <TouchableOpacity className="flex-row items-center py-3 px-4 border-b border-gray-100">
                            <FontAwesomeIcon icon={faEnvelope} size={18} color="#666" />
                            <Text className="ml-4 text-base text-gray-700">{user?.email || "Email không có sẵn"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-3 px-4 border-b border-gray-100">
                            <FontAwesomeIcon icon={faUserTie} size={18} color="#666" />
                            <Text className="ml-4 text-base text-gray-700">{user?.status || "Trạng thái chưa cập nhật"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-3 px-4 border-b border-gray-100">
                            <FontAwesomeIcon icon={faBell} size={18} color="#666" />
                            <Text className="ml-4 text-base text-gray-700">Tắt thông báo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Media Section */}
                <View className="bg-white p-4 mt-2.5">
                    <View className="flex-row justify-between items-center mb-2.5">
                        <Text className="text-base font-semibold">Ảnh/Video</Text>
                        <TouchableOpacity onPress={() => setActiveSection('media')}>
                            <Text className="text-blue-500 text-sm">Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {mediaItems.length > 0 ? (
                        <FlatList
                            horizontal
                            data={mediaItems.slice(0, 6)}
                            keyExtractor={(item, index) => `media-${item._id || index}`}
                            renderItem={({ item, index }) => {
                                const isVideo = item.mediaType === 'video';

                                return (
                                    <TouchableOpacity
                                        className="mr-2"
                                        onPress={() => handleMediaPress(item, index)}
                                    >
                                        {isVideo ? (
                                            <View className="relative rounded overflow-hidden">
                                                <Video
                                                    source={{ uri: item.mediaUrl }}
                                                    style={{ width: 80, height: 80 }}
                                                    resizeMode="cover"
                                                    shouldPlay={false}
                                                />
                                                <View className="absolute inset-0 flex justify-center items-center bg-black/30">
                                                    <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                                </View>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: item.mediaUrl }}
                                                className="w-20 h-20 rounded"
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text className="text-center text-gray-500 py-4">Không có ảnh hoặc video được chia sẻ</Text>
                    )}
                </View>

                {/* Files Section */}
                <View className="bg-white p-4 mt-2.5">
                    <View className="flex-row justify-between items-center mb-2.5">
                        <Text className="text-base font-semibold">Tệp tin</Text>
                        <TouchableOpacity onPress={() => setActiveSection('files')}>
                            <Text className="text-blue-500 text-sm">Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {fileItems.length > 0 ? (
                        <View>
                            {fileItems.slice(0, 3).map((item, index) => (
                                <TouchableOpacity
                                    key={`file-${item._id || index}`}
                                    className="flex-row items-center py-2.5 px-1 border-b border-gray-200"
                                    onPress={() => Linking.openURL(item.fileUrl)}
                                >
                                    <FontAwesomeIcon
                                        icon={item.fileName?.toLowerCase().endsWith('.pdf') ? faFileAlt : faFilePen}
                                        size={20}
                                        color="#888"
                                    />
                                    <View className="ml-2.5 flex-1">
                                        <Text className="text-base" numberOfLines={1}>{item.fileName}</Text>
                                        <Text className="text-xs text-gray-500 mt-0.5">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text className="text-center text-gray-500 py-4">Không có tệp tin được chia sẻ</Text>
                    )}
                </View>

                {/* Links Section */}
                <View className="bg-white p-4 mt-2.5">
                    <View className="flex-row justify-between items-center mb-2.5">
                        <Text className="text-base font-semibold">Liên kết</Text>
                        <TouchableOpacity onPress={() => setActiveSection('links')}>
                            <Text className="text-blue-500 text-sm">Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {linkItems.length > 0 ? (
                        <View>
                            {linkItems.slice(0, 3).map((item, index) => (
                                <TouchableOpacity
                                    key={`link-${item._id || index}`}
                                    className="flex-row items-center py-2.5 px-1 border-b border-gray-200"
                                    onPress={() => Linking.openURL(item.text)}
                                >
                                    <FontAwesomeIcon icon={faLink} size={20} color="#888" />
                                    <View className="ml-2.5 flex-1">
                                        <Text className="text-base text-blue-500" numberOfLines={1}>{item.text}</Text>
                                        <Text className="text-xs text-gray-500 mt-0.5">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text className="text-center text-gray-500 py-4">Không có liên kết được chia sẻ</Text>
                    )}
                </View>

                {/* Delete/Leave Button */}
                {isGroupChat ? (
                    isAdmin ? (
                        <TouchableOpacity
                            className="flex-row items-center justify-center bg-white mt-5 mb-8 py-4 mx-4 rounded"
                            onPress={handleDeleteGroup}
                        >
                            <FontAwesomeIcon icon={faTrash} size={18} color="#ff3b30" />
                            <Text className="ml-2.5 text-red-600 text-base font-semibold">Xóa nhóm chat</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            className="flex-row items-center justify-center bg-white mt-5 mb-8 py-4 mx-4 rounded"
                            onPress={handleLeaveGroup}
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} size={18} color="#ff3b30" />
                            <Text className="ml-2.5 text-red-600 text-base font-semibold">Rời nhóm chat</Text>
                        </TouchableOpacity>
                    )
                ) : (
                    <TouchableOpacity
                        className="flex-row items-center justify-center bg-white mt-5 mb-8 py-4 mx-4 rounded"
                        onPress={handleDeleteConversation}
                    >
                        <FontAwesomeIcon icon={faTrash} size={18} color="#ff3b30" />
                        <Text className="ml-2.5 text-red-600 text-base font-semibold">Xóa lịch sử trò chuyện</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        );
    };

    const renderMediaSection = () => (
        <View className="flex-1 bg-white">
            <View className="flex-row border-b border-gray-200">
                <TouchableOpacity
                    className={`flex-1 items-center py-3 ${activeTab === 'media' ? 'border-b-2 border-blue-500' : ''}`}
                    onPress={() => setActiveTab('media')}
                >
                    <Text className={`text-sm ${activeTab === 'media' ? 'text-blue-500 font-semibold' : 'text-gray-600'}`}>
                        Ảnh/Video
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 items-center py-3 ${activeTab === 'files' ? 'border-b-2 border-blue-500' : ''}`}
                    onPress={() => setActiveTab('files')}
                >
                    <Text className={`text-sm ${activeTab === 'files' ? 'text-blue-500 font-semibold' : 'text-gray-600'}`}>
                        Tệp tin
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 items-center py-3 ${activeTab === 'links' ? 'border-b-2 border-blue-500' : ''}`}
                    onPress={() => setActiveTab('links')}
                >
                    <Text className={`text-sm ${activeTab === 'links' ? 'text-blue-500 font-semibold' : 'text-gray-600'}`}>
                        Liên kết
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'media' && (
                mediaItems.length > 0 ? (
                    <FlatList
                        data={mediaItems}
                        keyExtractor={(item, index) => `all-media-${item._id || index}`}
                        numColumns={3}
                        renderItem={({ item, index }) => {
                            const isVideo = item.mediaType === 'video';

                            return (
                                <TouchableOpacity
                                    style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, margin: 5 }}
                                    onPress={() => handleMediaPress(item, index)}
                                >
                                    {isVideo ? (
                                        <View className="relative rounded overflow-hidden w-full h-full">
                                            <Video
                                                source={{ uri: item.mediaUrl }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode="cover"
                                                shouldPlay={false}
                                            />
                                            <View className="absolute inset-0 flex justify-center items-center bg-black/30">
                                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: item.mediaUrl }}
                                            style={{ width: '100%', height: '100%', borderRadius: 3 }}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500">Không có ảnh hoặc video được chia sẻ</Text>
                    </View>
                )
            )}

            {activeTab === 'files' && (
                fileItems.length > 0 ? (
                    <FlatList
                        data={fileItems}
                        keyExtractor={(item, index) => `all-files-${item._id || index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center py-3 px-4 border-b border-gray-200"
                                onPress={() => Linking.openURL(item.fileUrl)}
                            >
                                <FontAwesomeIcon
                                    icon={item.fileName?.toLowerCase().endsWith('.pdf') ? faFileAlt : faFilePen}
                                    size={20}
                                    color="#888"
                                />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base" numberOfLines={1}>{item.fileName}</Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500">Không có tệp tin được chia sẻ</Text>
                    </View>
                )
            )}

            {activeTab === 'links' && (
                linkItems.length > 0 ? (
                    <FlatList
                        data={linkItems}
                        keyExtractor={(item, index) => `all-links-${item._id || index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center py-3 px-4 border-b border-gray-200"
                                onPress={() => Linking.openURL(item.text)}
                            >
                                <FontAwesomeIcon icon={faLink} size={20} color="#888" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-blue-500 text-base" numberOfLines={1}>{item.text}</Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500">Không có liên kết được chia sẻ</Text>
                    </View>
                )
            )}
        </View>
    );

    const renderMediaViewer = () => (
        <Modal
            visible={mediaViewerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMediaViewerVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setMediaViewerVisible(false)}>
                <View className="flex-1 bg-black/90 justify-center items-center">
                    <TouchableOpacity
                        className="absolute top-16 right-5 z-10 p-3 bg-black/50 rounded-full"
                        onPress={() => setMediaViewerVisible(false)}
                    >
                        <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Navigation Indicator */}
                    <View className="absolute top-16 self-center bg-black/50 py-1 px-2.5 rounded-full">
                        <Text className="text-white font-semibold">
                            {selectedMediaIndex + 1} / {mediaItems.length}
                        </Text>
                    </View>

                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <Animated.View
                            className="w-full h-4/5 justify-center items-center"
                            style={{
                                transform: [{ translateX: translateX }],
                                opacity: mediaOpacity
                            }}
                            {...panResponder.panHandlers}
                        >
                            {selectedMedia?.mediaType === 'video' ? (
                                <Video
                                    source={{ uri: selectedMedia.mediaUrl }}
                                    className="w-full h-full"
                                    resizeMode="contain"
                                    useNativeControls
                                    shouldPlay
                                    isLooping
                                />
                            ) : (
                                <Image
                                    source={{ uri: selectedMedia?.mediaUrl }}
                                    className="w-full h-full"
                                    resizeMode="contain"
                                />
                            )}
                        </Animated.View>
                    </TouchableWithoutFeedback>

                    {/* Navigation Buttons */}
                    {selectedMediaIndex > 0 && (
                        <TouchableOpacity
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-4 rounded-full"
                            onPress={() => navigateMedia(-1)}
                        >
                            <FontAwesomeIcon icon={faArrowLeft} size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {selectedMediaIndex < mediaItems.length - 1 && (
                        <TouchableOpacity
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-4 rounded-full"
                            onPress={() => navigateMedia(1)}
                        >
                            <FontAwesomeIcon icon={faArrowRight} size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Swipe Instructions - shown briefly when first opened */}
                    <Animated.View
                        className="absolute bottom-12 bg-black/50 py-2 px-4 rounded-full"
                        style={{ opacity: mediaOpacity }}
                    >
                        <Text className="text-white font-medium">Lướt sang trái/phải để chuyển ảnh</Text>
                    </Animated.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'main':
                return renderMainSection();
            case 'media':
            case 'files':
            case 'links':
                return renderMediaSection();
            default:
                return renderMainSection();
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-gray-100">
                {renderHeader()}
                <View className="flex-1">
                    {renderContent()}
                </View>
                {renderMediaViewer()}
            </View>
        </Modal>
    );
};

export default DirectChatDetailsModal;
