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
    StyleSheet,
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
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={styles.header}>
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
                    style={styles.backButton}
                >
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {showMembersList ? "Thành viên nhóm" :
                        activeSection === 'main' ? 'Thông tin' :
                            activeSection === 'media' ? 'Ảnh/Video' :
                                activeSection === 'files' ? 'Tệp' : 'Liên kết'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <FontAwesomeIcon icon={faTimes} size={20} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMemberListSection = () => {
        if (!isGroupChat || !group || !group.members) return null;

        return (
            <ScrollView style={styles.container}>
                <View style={styles.memberListHeader}>
                    <Text style={styles.memberListTitle}>Thành viên ({group.members?.length || 0})</Text>

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.addMemberButton}
                            onPress={onAddMember}
                        >
                            <FontAwesomeIcon icon={faUserPlus} size={18} color="#0084ff" />
                            <Text style={styles.addMemberText}>Thêm thành viên</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {group.members?.map(member => (
                    <View key={member._id} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                            <Image
                                source={{ uri: member.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                                style={styles.memberAvatar}
                            />
                            <View style={styles.memberNameContainer}>
                                <Text style={styles.memberName}>
                                    {member._id === currentUser._id ? "Bạn" : member.name}
                                </Text>
                                {(group.groupAdmin?._id === member._id || group.groupAdmin === member._id) && (
                                    <View style={styles.adminBadge}>
                                        <Text style={styles.adminBadgeText}>Quản trị viên</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {isAdmin && member._id !== currentUser._id && (
                            <TouchableOpacity
                                style={styles.removeMemberButton}
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
            <ScrollView style={styles.container}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <Image
                        source={{
                            uri: isGroupChat
                                ? (group?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || 'Group')}&background=random`)
                                : (user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`)
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.nameContainer}>
                        {isGroupChat ? (
                            <Text style={styles.name}>{group?.name}</Text>
                        ) : isEditingNickname ? (
                            <View style={styles.nicknameEditContainer}>
                                <TextInput
                                    style={styles.nicknameInput}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    placeholder={user?.name || 'Enter nickname'}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={styles.saveNicknameButton}
                                    onPress={handleSaveNickname}
                                >
                                    <FontAwesomeIcon icon={faCheck} size={16} color="#3b82f6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelNicknameButton}
                                    onPress={() => setIsEditingNickname(false)}
                                >
                                    <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.nameRow}>
                                <Text style={styles.name}>
                                    {user?.nickname || user?.name}
                                    {user?.nickname && <Text style={styles.realName}> ({user?.name})</Text>}
                                </Text>
                                <TouchableOpacity
                                    style={styles.editNicknameButton}
                                    onPress={() => setIsEditingNickname(true)}
                                >
                                    <FontAwesomeIcon icon={faEdit} size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {isGroupChat ? (
                            <Text style={styles.groupMembersCount}>
                                {group.members?.length || 0} thành viên
                            </Text>
                        ) : (
                            <Text style={styles.status}>{user?.online ? "Đang hoạt động" : "Không hoạt động"}</Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons - Different for group and direct chat */}
                {isGroupChat ? (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowMembersList(true)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#4299E1' }]}>
                                <FontAwesomeIcon icon={faUsers} size={18} color="#fff" />
                            </View>
                            <Text style={styles.actionText}>Thành viên</Text>
                        </TouchableOpacity>

                        {isAdmin ? (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onAddMember}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#48BB78' }]}>
                                    <FontAwesomeIcon icon={faUserPlus} size={18} color="#fff" />
                                </View>
                                <Text style={styles.actionText}>Thêm thành viên</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleLeaveGroup}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#ED8936' }]}>
                                    <FontAwesomeIcon icon={faSignOutAlt} size={18} color="#fff" />
                                </View>
                                <Text style={styles.actionText}>Rời nhóm</Text>
                            </TouchableOpacity>
                        )}

                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleDeleteGroup}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#F56565' }]}>
                                    <FontAwesomeIcon icon={faTrash} size={18} color="#fff" />
                                </View>
                                <Text style={styles.actionText}>Xóa nhóm</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                            <View style={[styles.iconContainer, { backgroundColor: '#4299E1' }]}>
                                <FontAwesomeIcon icon={faPhone} size={18} color="#fff" />
                            </View>
                            <Text style={styles.actionText}>Gọi thoại</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <View style={[styles.iconContainer, { backgroundColor: '#48BB78' }]}>
                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                            </View>
                            <Text style={styles.actionText}>Gọi video</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <View style={[styles.iconContainer, { backgroundColor: '#ED8936' }]}>
                                <FontAwesomeIcon icon={faUserCircle} size={18} color="#fff" />
                            </View>
                            <Text style={styles.actionText}>Xem hồ sơ</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Group Members Section (Preview) */}
                {isGroupChat && (
                    <TouchableOpacity
                        style={styles.membersPreview}
                        onPress={() => setShowMembersList(true)}
                    >
                        <View style={styles.membersPreviewHeader}>
                            <Text style={styles.membersPreviewTitle}>Thành viên nhóm</Text>
                            <FontAwesomeIcon icon={faChevronRight} size={16} color="#888" />
                        </View>

                        <View style={styles.memberAvatarsRow}>
                            {group.members?.slice(0, 5).map(member => (
                                <Image
                                    key={member._id}
                                    source={{ uri: member.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                                    style={styles.memberAvatarSmall}
                                />
                            ))}
                            {group.members?.length > 5 && (
                                <View style={styles.moreMembersCircle}>
                                    <Text style={styles.moreMembersText}>+{group.members.length - 5}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Additional info - only for direct chats */}
                {!isGroupChat && (
                    <View style={styles.infoSection}>
                        <TouchableOpacity style={styles.infoRow} onPress={() => { }}>
                            <FontAwesomeIcon icon={faEnvelope} size={18} color="#666" />
                            <Text style={styles.infoText}>{user?.email || "Email không có sẵn"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.infoRow} onPress={() => { }}>
                            <FontAwesomeIcon icon={faUserTie} size={18} color="#666" />
                            <Text style={styles.infoText}>{user?.status || "Trạng thái chưa cập nhật"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.infoRow} onPress={() => { }}>
                            <FontAwesomeIcon icon={faBell} size={18} color="#666" />
                            <Text style={styles.infoText}>Tắt thông báo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Media Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ảnh/Video</Text>
                        <TouchableOpacity onPress={() => setActiveSection('media')}>
                            <Text style={styles.seeAllText}>Xem tất cả</Text>
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
                                        style={styles.mediaItem}
                                        onPress={() => handleMediaPress(item, index)}
                                    >
                                        {isVideo ? (
                                            <View style={styles.videoContainer}>
                                                <Video
                                                    source={{ uri: item.mediaUrl }}
                                                    style={styles.mediaThumbnail}
                                                    resizeMode="cover"
                                                    shouldPlay={false}
                                                />
                                                <View style={styles.playIconOverlay}>
                                                    <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                                </View>
                                            </View>
                                        ) : (
                                            <Image source={{ uri: item.mediaUrl }} style={styles.mediaThumbnail} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.emptyText}>Không có ảnh hoặc video được chia sẻ</Text>
                    )}
                </View>

                {/* Files Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Tệp tin</Text>
                        <TouchableOpacity onPress={() => setActiveSection('files')}>
                            <Text style={styles.seeAllText}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {fileItems.length > 0 ? (
                        <View>
                            {fileItems.slice(0, 3).map((item, index) => (
                                <TouchableOpacity
                                    key={`file-${item._id || index}`}
                                    style={styles.fileItem}
                                    onPress={() => Linking.openURL(item.fileUrl)}
                                >
                                    <FontAwesomeIcon
                                        icon={item.fileName?.toLowerCase().endsWith('.pdf') ? faFileAlt : faFilePen}
                                        size={20}
                                        color="#888"
                                    />
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
                                        <Text style={styles.fileDate}>
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Không có tệp tin được chia sẻ</Text>
                    )}
                </View>

                {/* Links Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Liên kết</Text>
                        <TouchableOpacity onPress={() => setActiveSection('links')}>
                            <Text style={styles.seeAllText}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {linkItems.length > 0 ? (
                        <View>
                            {linkItems.slice(0, 3).map((item, index) => (
                                <TouchableOpacity
                                    key={`link-${item._id || index}`}
                                    style={styles.linkItem}
                                    onPress={() => Linking.openURL(item.text)}
                                >
                                    <FontAwesomeIcon icon={faLink} size={20} color="#888" />
                                    <View style={styles.linkInfo}>
                                        <Text style={styles.linkUrl} numberOfLines={1}>{item.text}</Text>
                                        <Text style={styles.linkDate}>
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Không có liên kết được chia sẻ</Text>
                    )}
                </View>

                {/* Delete/Leave Button */}
                {isGroupChat ? (
                    isAdmin ? (
                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={handleDeleteGroup}
                        >
                            <FontAwesomeIcon icon={faTrash} size={18} color="#ff3b30" />
                            <Text style={styles.dangerButtonText}>Xóa nhóm chat</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={handleLeaveGroup}
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} size={18} color="#ff3b30" />
                            <Text style={styles.dangerButtonText}>Rời nhóm chat</Text>
                        </TouchableOpacity>
                    )
                ) : (
                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleDeleteConversation}
                    >
                        <FontAwesomeIcon icon={faTrash} size={18} color="#ff3b30" />
                        <Text style={styles.dangerButtonText}>Xóa lịch sử trò chuyện</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        );
    };

    const renderMediaSection = () => (
        <View style={styles.fullSection}>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'media' && styles.activeTab]}
                    onPress={() => setActiveTab('media')}
                >
                    <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>
                        Ảnh/Video
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'files' && styles.activeTab]}
                    onPress={() => setActiveTab('files')}
                >
                    <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
                        Tệp tin
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'links' && styles.activeTab]}
                    onPress={() => setActiveTab('links')}
                >
                    <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>
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
                                    style={styles.gridMediaItem}
                                    onPress={() => handleMediaPress(item, index)}
                                >
                                    {isVideo ? (
                                        <View style={styles.videoContainer}>
                                            <Video
                                                source={{ uri: item.mediaUrl }}
                                                style={styles.gridMediaThumbnail}
                                                resizeMode="cover"
                                                shouldPlay={false}
                                            />
                                            <View style={styles.playIconOverlay}>
                                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: item.mediaUrl }} style={styles.gridMediaThumbnail} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có ảnh hoặc video được chia sẻ</Text>
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
                                style={styles.fileItem}
                                onPress={() => Linking.openURL(item.fileUrl)}
                            >
                                <FontAwesomeIcon
                                    icon={item.fileName?.toLowerCase().endsWith('.pdf') ? faFileAlt : faFilePen}
                                    size={20}
                                    color="#888"
                                />
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
                                    <Text style={styles.fileDate}>
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có tệp tin được chia sẻ</Text>
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
                                style={styles.linkItem}
                                onPress={() => Linking.openURL(item.text)}
                            >
                                <FontAwesomeIcon icon={faLink} size={20} color="#888" />
                                <View style={styles.linkInfo}>
                                    <Text style={styles.linkUrl} numberOfLines={1}>{item.text}</Text>
                                    <Text style={styles.linkDate}>
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có liên kết được chia sẻ</Text>
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
                <View style={styles.mediaViewerContainer}>
                    <TouchableOpacity
                        style={styles.closeMediaButton}
                        onPress={() => setMediaViewerVisible(false)}
                    >
                        <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Navigation Indicator */}
                    <View style={styles.mediaCountIndicator}>
                        <Text style={styles.mediaCountText}>
                            {selectedMediaIndex + 1} / {mediaItems.length}
                        </Text>
                    </View>

                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <Animated.View
                            style={[
                                styles.mediaViewerContent,
                                {
                                    transform: [{ translateX: translateX }],
                                    opacity: mediaOpacity
                                }
                            ]}
                            {...panResponder.panHandlers}
                        >
                            {selectedMedia?.mediaType === 'video' ? (
                                <Video
                                    source={{ uri: selectedMedia.mediaUrl }}
                                    style={styles.fullSizeMedia}
                                    resizeMode="contain"
                                    useNativeControls
                                    shouldPlay
                                    isLooping
                                />
                            ) : (
                                <Image
                                    source={{ uri: selectedMedia?.mediaUrl }}
                                    style={styles.fullSizeMedia}
                                    resizeMode="contain"
                                />
                            )}
                        </Animated.View>
                    </TouchableWithoutFeedback>

                    {/* Navigation Buttons */}
                    {selectedMediaIndex > 0 && (
                        <TouchableOpacity
                            style={[styles.navButton, styles.prevButton]}
                            onPress={() => navigateMedia(-1)}
                        >
                            <FontAwesomeIcon icon={faArrowLeft} size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {selectedMediaIndex < mediaItems.length - 1 && (
                        <TouchableOpacity
                            style={[styles.navButton, styles.nextButton]}
                            onPress={() => navigateMedia(1)}
                        >
                            <FontAwesomeIcon icon={faArrowRight} size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Swipe Instructions - shown briefly when first opened */}
                    <Animated.View style={[styles.swipeInstructions, { opacity: mediaOpacity }]}>
                        <Text style={styles.swipeText}>Lướt sang trái/phải để chuyển ảnh</Text>
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
            <View style={styles.modalContainer}>
                {renderHeader()}
                <View style={styles.contentContainer}>
                    {renderContent()}
                </View>
                {renderMediaViewer()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#ffffff',
        width: '100%',
        zIndex: 10,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingHorizontal: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        position: 'absolute',
        left: 15,
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    nameContainer: {
        marginLeft: 15,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        marginRight: 8,
    },
    realName: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'normal',
    },
    editNicknameButton: {
        padding: 4,
    },
    nicknameEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        width: '100%',
    },
    nicknameInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#3b82f6',
        fontSize: 16,
        paddingVertical: 4,
        marginRight: 8,
    },
    saveNicknameButton: {
        padding: 4,
        marginRight: 8,
    },
    cancelNicknameButton: {
        padding: 4,
    },
    status: {
        fontSize: 14,
        color: '#4CAF50',
        marginTop: 5,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#fff',
        marginTop: 10,
    },
    actionButton: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    actionText: {
        fontSize: 12,
        color: '#555',
        marginTop: 5,
    },
    infoSection: {
        backgroundColor: '#fff',
        marginTop: 10,
        paddingVertical: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoText: {
        marginLeft: 15,
        fontSize: 15,
        color: '#333',
    },
    section: {
        marginTop: 10,
        backgroundColor: '#fff',
        padding: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    seeAllText: {
        fontSize: 14,
        color: '#0084ff',
    },
    mediaItem: {
        marginRight: 8,
    },
    mediaThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 5,
    },
    videoContainer: {
        position: 'relative',
        borderRadius: 5,
        overflow: 'hidden',
    },
    playIconOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    fileInfo: {
        marginLeft: 10,
        flex: 1,
    },
    fileName: {
        fontSize: 15,
    },
    fileDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    linkInfo: {
        marginLeft: 10,
        flex: 1,
    },
    linkUrl: {
        fontSize: 15,
        color: '#0084ff',
    },
    linkDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginTop: 20,
        marginBottom: 30,
        padding: 15,
        borderRadius: 5,
    },
    dangerButtonText: {
        color: '#ff3b30',
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        padding: 15,
    },
    fullSection: {
        flex: 1,
        backgroundColor: '#fff',
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#0084ff',
    },
    tabText: {
        fontSize: 15,
        color: '#555',
    },
    activeTabText: {
        color: '#0084ff',
        fontWeight: '600',
    },
    gridMediaItem: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        margin: 5,
    },
    gridMediaThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: 3,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    mediaViewerContent: {
        width: '100%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeMediaButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
    },
    fullSizeMedia: {
        width: '100%',
        height: '80%',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        zIndex: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 15,
        borderRadius: 30,
        transform: [{ translateY: -25 }],
    },
    prevButton: {
        left: 15,
    },
    nextButton: {
        right: 15,
    },
    mediaCountIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
    },
    mediaCountText: {
        color: 'white',
        fontWeight: '600',
    },
    swipeInstructions: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    swipeText: {
        color: 'white',
        fontWeight: '500',
    },

    // Add new styles for group functionality
    groupMembersCount: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    memberListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    memberListTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    addMemberButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6f7ff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    addMemberText: {
        color: '#0084ff',
        fontSize: 14,
        marginLeft: 6,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    memberNameContainer: {
        marginLeft: 12,
        flex: 1,
    },
    memberName: {
        fontSize: 16,
    },
    adminBadge: {
        backgroundColor: '#e6f7ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    adminBadgeText: {
        color: '#0084ff',
        fontSize: 12,
    },
    removeMemberButton: {
        padding: 8,
        backgroundColor: '#ffeeee',
        borderRadius: 20,
    },
    membersPreview: {
        backgroundColor: '#fff',
        padding: 15,
        marginTop: 10,
    },
    membersPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    membersPreviewTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    memberAvatarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: -8,
        borderWidth: 2,
        borderColor: '#fff',
    },
    moreMembersCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    moreMembersText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    }
});

export default DirectChatDetailsModal;
