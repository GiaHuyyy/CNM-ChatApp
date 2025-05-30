import React, { useState, useEffect } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert, Dimensions, Animated, PanResponder, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faTimes, faPen, faInfoCircle, faImage, faUsers,
    faUserPlus, faSignOutAlt, faTrash, faCheck,
    faSearch, faUserShield, faUserMinus, faExclamationTriangle,
    faArrowLeft, faArrowRight, faVideoCamera
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import AddGroupMembersModal from './AddGroupMembersModal';
import ConfirmationModal from './ConfirmationModal';
import { Video } from 'expo-av';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 60) / 3; // 3 columns with some margin

// Enhance platform detection with more reliable checks
const IS_WEB = Platform.OS === 'web';
const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';

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

const GroupChatInfoModal = ({
    visible,
    onClose,
    group,
    currentUser,
    onLeaveGroup,
    messages,
    onAddMember,
    onRemoveMember,
    socketConnection,
    onDeleteGroup
}) => {
    const [activeTab, setActiveTab] = useState('members'); // members, media, settings
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [groupName, setGroupName] = useState('');

    // Add states for media viewing
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [mediaViewerVisible, setMediaViewerVisible] = useState(false);

    // Add animation values for swipe transition
    const translateX = useState(new Animated.Value(0))[0];
    const mediaOpacity = useState(new Animated.Value(1))[0];

    // Add states for add members modal and member removal
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [removingMember, setRemovingMember] = useState(false);

    // Add confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: "",
        message: "",
        action: null,
        type: "warning"
    });

    // Add these missing state variables for admin selection
    const [selectingNewAdmin, setSelectingNewAdmin] = useState(false);
    const [eligibleAdminMembers, setEligibleAdminMembers] = useState([]);

    // Add state for member removal modal (for web)
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);

    // Normalize IDs for comparison to handle both string and object IDs
    const normalizeId = (id) => {
        if (!id) return '';
        return typeof id === 'object' ? id.toString() : id;
    };

    // Add enhanced isGroupChat detection function with more comprehensive checks
    const isGroupChat = () => {
        if (!group) return false;

        // More comprehensive checks for group chat detection
        // 1. Check isGroup flag in various locations
        const hasGroupFlag =
            group.isGroup === true ||
            (typeof group.isGroup === 'string' && group.isGroup.toLowerCase() === 'true') ||
            group.userDetails?.isGroup === true ||
            (typeof group.userDetails?.isGroup === 'string' && group.userDetails.isGroup.toLowerCase() === 'true');

        // 2. Check for admin - direct chats don't have admins
        const hasGroupAdmin = !!group.groupAdmin || !!group.userDetails?.groupAdmin;

        // 3. Check members array in multiple possible locations
        const membersArray = group.members || group.userDetails?.members;
        const hasMultipleMembers =
            Array.isArray(membersArray) && membersArray.length > 2;

        // 4. Check for explicit properties that indicate a group chat
        const hasGroupProperties =
            group.hasOwnProperty('groupName') ||
            group.hasOwnProperty('groupAdmin') ||
            group.hasOwnProperty('groupDescription') ||
            group.hasOwnProperty('groupIcon');

        // 5. Check for naming patterns
        const nameToCheck = group.name || group.userDetails?.name || "";
        const nameIndicatesGroup =
            nameToCheck.includes('Group') ||
            nameToCheck.includes('Nhóm') ||
            nameToCheck.includes('Team') ||
            nameToCheck.includes('Chat nhóm');

        // For diagnostic purposes, log all check results
        console.log("DETAILED GROUP DETECTION:", {
            chatId: group._id || 'unknown',
            name: nameToCheck,
            hasGroupFlag,
            hasGroupAdmin,
            hasMultipleMembers: hasMultipleMembers ? (membersArray?.length || 0) : 'No valid members array',
            hasGroupProperties,
            nameIndicatesGroup,
            rawGroupData: {
                isGroup: group.isGroup,
                userDetailsIsGroup: group.userDetails?.isGroup,
                groupAdmin: group.groupAdmin ? 'exists' : 'missing',
                membersCount: membersArray?.length || 0
            }
        });

        // Consider it a group if any strong indicators are present
        const isDefinitelyGroup = hasGroupFlag || hasGroupAdmin || hasMultipleMembers || hasGroupProperties;

        // If we have a definitive answer, use it
        if (isDefinitelyGroup) {
            console.log("DETECTED AS GROUP: Strong indicators present");
            return true;
        }

        // If name suggests it might be a group, log this as a weak indicator
        if (nameIndicatesGroup) {
            console.log("DETECTED AS GROUP: Based on name pattern only (weak indicator)");
            return true;
        }

        // If no indicators suggest it's a group, it's likely a direct chat
        console.log("DETECTED AS DIRECT CHAT: No group indicators found");
        return false;
    };

    // Calculate if the current user is admin
    const calculateIsAdmin = () => {
        if (!group || !currentUser) return false;

        const groupAdminId = normalizeId(group.groupAdmin?._id || group.groupAdmin);
        const userId = normalizeId(currentUser._id);

        const result = groupAdminId === userId;
        console.log("Admin check:", {
            isAdmin: result,
            userIdNormalized: userId,
            groupAdminIdNormalized: groupAdminId,
            groupAdminRaw: group.groupAdmin
        });
        return result;
    };

    const isAdmin = calculateIsAdmin();
    const isGroup = isGroupChat();

    useEffect(() => {
        if (group) {
            setGroupName(group.name || '');
            console.log("Group loaded:", {
                name: group.name,
                members: group.members?.length,
                isAdmin: isAdmin,
                isGroup: isGroup,
                adminId: normalizeId(group.groupAdmin),
                currentUserId: normalizeId(currentUser._id)
            });

            // If this isn't a group chat, show a warning
            if (!isGroup) {
                console.warn("Non-group chat object passed to GroupChatInfoModal:", group);
            }
        }
    }, [group, currentUser]);

    // Adjust the component title based on chat type with a clearer approach
    const getModalTitle = () => {
        if (!group) return "Thông tin";

        // Get the group status with detailed logging
        const groupStatus = isGroupChat();
        console.log(`Modal title determination: isGroup=${groupStatus}, name=${group.name || 'unnamed'}`);

        return groupStatus ? "Thông tin nhóm" : "Thông tin hội thoại";
    };

    const filteredMembers = searchQuery.trim()
        ? group?.members?.filter(m =>
            m.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ) || []
        : group?.members || [];

    const handleSaveGroupName = () => {
        if (!isAdmin) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Chỉ quản trị viên mới có thể đổi tên nhóm",
                type: "error"
            });
            setEditMode(false);
            return;
        }

        if (!groupName.trim()) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Tên nhóm không được để trống",
                type: "error"
            });
            return;
        }

        setIsLoading(true);

        // Remove existing listeners to avoid duplicates
        socketConnection.off("groupRenamed");

        // Updated group info
        const groupData = {
            groupId: normalizeId(group?._id),
            userId: normalizeId(currentUser._id),
            name: groupName.trim()
        };

        console.log("Emitting renameGroup with payload:", groupData);

        // Listen for the response before emitting
        socketConnection.on("groupRenamed", (response) => {
            setIsLoading(false);

            if (response.success) {
                setConfirmModal({
                    visible: true,
                    title: "Thành công",
                    message: "Đã cập nhật tên nhóm",
                    type: "success"
                });
                setEditMode(false);
            } else {
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: response.message || "Không thể cập nhật tên nhóm",
                    type: "error"
                });
            }
        });

        socketConnection.emit("renameGroup", groupData);

        // Set timeout in case of no response
        setTimeout(() => {
            if (isLoading) {
                socketConnection.off("groupRenamed");
                setIsLoading(false);
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: "Không nhận được phản hồi từ máy chủ. Vui lòng thử lại sau.",
                    type: "error"
                });
            }
        }, 8000);
    };

    // Enhanced member removal function using techniques from GroupInfoModal
    const handleRemoveMemberWithConfirmation = (memberId, memberName) => {
        if (!socketConnection) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể kết nối đến máy chủ",
                type: "error"
            });
            return;
        }

        if (!group || !memberId) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Thông tin thành viên không hợp lệ",
                type: "error"
            });
            return;
        }

        const groupIdStr = normalizeId(group._id);
        const memberIdStr = normalizeId(memberId);
        const adminIdStr = normalizeId(currentUser._id);
        const groupAdminIdStr = normalizeId(group.groupAdmin?._id || group.groupAdmin);

        console.log("Attempt to remove member:", {
            groupId: groupIdStr,
            memberId: memberIdStr,
            adminId: adminIdStr,
            groupAdminId: groupAdminIdStr,
            isRealAdmin: adminIdStr === groupAdminIdStr
        });

        if (adminIdStr !== groupAdminIdStr) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Bạn không có quyền xóa thành viên",
                type: "error"
            });
            return;
        }

        if (memberIdStr === adminIdStr) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Bạn không thể xóa chính mình. Hãy sử dụng chức năng rời nhóm.",
                type: "error"
            });
            return;
        }

        // Store the member to remove
        const memberData = {
            id: memberIdStr,
            name: memberName
        };

        // Show platform-specific confirmation UI
        if (IS_WEB) {
            // For web: show custom modal
            setMemberToRemove(memberData);
            setShowRemoveMemberModal(true);
        } else {
            // For mobile: use native Alert
            Alert.alert(
                "Xác nhận xóa thành viên",
                `Bạn có chắc muốn xóa ${memberName} khỏi nhóm?`,
                [
                    {
                        text: "Hủy",
                        style: "cancel"
                    },
                    {
                        text: "Xóa",
                        style: "destructive",
                        onPress: () => performMemberRemoval(groupIdStr, memberIdStr, memberName, adminIdStr)
                    }
                ],
                { cancelable: true }
            );
        }
    };

    // Function to perform the actual member removal
    const performMemberRemoval = (groupId, memberId, memberName, adminId) => {
        setRemovingMember(true);

        // Clean up previous listeners
        socketConnection.off("memberRemoved");
        socketConnection.off("memberRemovedFromGroup");

        // Set up listener for both potential event names
        const handleMemberRemovalResponse = (response) => {
            console.log("Response from member removal:", response);
            setRemovingMember(false);

            if (response.success) {
                setConfirmModal({
                    visible: true,
                    title: "Thành công",
                    message: "Đã xóa thành viên khỏi nhóm",
                    type: "success"
                });

                // Call the original handler which updates UI
                if (onRemoveMember) {
                    onRemoveMember(groupId, memberId, memberName);
                }
            } else {
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: response.message || "Không thể xóa thành viên",
                    type: "error"
                });
            }
        };

        socketConnection.on("memberRemoved", handleMemberRemovalResponse);
        socketConnection.on("memberRemovedFromGroup", handleMemberRemovalResponse);

        // Try both payload formats to ensure compatibility
        const payloadStandard = {
            groupId: groupId,
            userId: adminId,
            memberId: memberId
        };

        const payloadAlternate = {
            groupId: groupId,
            memberId: memberId,
            adminId: adminId
        };

        console.log("Emitting removeMember with payload:", payloadStandard);
        socketConnection.emit("removeMember", payloadStandard);

        // Try alternative event name if the server might be listening for it
        console.log("Emitting removeMemberFromGroup with payload:", payloadAlternate);
        socketConnection.emit("removeMemberFromGroup", payloadAlternate);

        // Set timeout for no response
        setTimeout(() => {
            if (removingMember) {
                console.log("No response received for member removal");
                setRemovingMember(false);
                socketConnection.off("memberRemoved");
                socketConnection.off("memberRemovedFromGroup");
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: "Không nhận được phản hồi từ máy chủ",
                    type: "error"
                });
            }
        }, 10000);
    };

    const handleDeleteGroupWithAlert = () => {
        console.log("Group disbanding attempt", {
            groupId: group?._id,
            isAdmin,
            socketConnected: !!socketConnection?.connected
        });

        if (!isAdmin) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Chỉ quản trị viên mới có thể giải tán nhóm",
                type: "error"
            });
            return;
        }

        if (!socketConnection?.connected) {
            setConfirmModal({
                visible: true,
                title: "Lỗi kết nối",
                message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
                type: "error"
            });
            return;
        }

        // Clean group ID
        const groupIdStr = normalizeId(group?._id);
        const userIdStr = normalizeId(currentUser?._id);

        if (!groupIdStr) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể xác định nhóm chat",
                type: "error"
            });
            return;
        }

        setConfirmModal({
            visible: true,
            title: "Giải tán nhóm",
            message: "Bạn có chắc chắn muốn giải tán nhóm này? Nhóm sẽ bị xóa hoàn toàn và tất cả thành viên sẽ bị xóa khỏi nhóm. Hành động này không thể hoàn tác.",
            type: "danger",
            action: () => {
                // Show loading state
                setConfirmModal({
                    visible: true,
                    title: "Đang xử lý",
                    message: "Đang giải tán nhóm...",
                    type: "loading"
                });

                // Remove any existing listeners
                socketConnection.off("groupDeleted");

                // Set a timeout to handle no response
                const timeoutId = setTimeout(() => {
                    console.log("No response received for group deletion");
                    socketConnection.off("groupDeleted");

                    setConfirmModal({
                        visible: true,
                        title: "Lỗi kết nối",
                        message: "Máy chủ không phản hồi. Vui lòng thử lại sau hoặc kiểm tra kết nối của bạn.",
                        type: "error"
                    });
                }, 10000);

                // Set up the response handler
                socketConnection.on("groupDeleted", (response) => {
                    // Clear timeout since we got a response
                    clearTimeout(timeoutId);

                    console.log("Group deletion response:", response);

                    if (response.success) {
                        // Close all modals
                        setConfirmModal({
                            visible: false,
                            title: "",
                            message: "",
                            type: ""
                        });

                        // First close the current modal
                        onClose();

                        // Show success message with improved reliability for mobile
                        setTimeout(() => {
                            Alert.alert(
                                "Thành công",
                                "Đã giải tán nhóm thành công",
                                [{
                                    text: "OK",
                                    onPress: () => {
                                        console.log("Group deletion confirmed by user");
                                        // Call parent handler for cleanup and navigation
                                        if (onDeleteGroup) {
                                            // Pass true to indicate navigation back to main chat should happen
                                            onDeleteGroup(groupIdStr, true);
                                        }
                                    }
                                }],
                                { cancelable: false }
                            );
                        }, 300); // Give UI time to update
                    } else {
                        // Show error message
                        setConfirmModal({
                            visible: true,
                            title: "Lỗi",
                            message: response.message || "Không thể giải tán nhóm chat",
                            type: "error"
                        });
                    }
                });

                // Create a standardized payload
                const payload = {
                    groupId: groupIdStr,
                    userId: userIdStr
                };

                console.log("Emitting deleteGroup with payload:", payload);
                socketConnection.emit("deleteGroup", payload);
            }
        });
    };

    const handleLeaveGroupWithConfirmation = () => {
        console.log("Leave group function called. Platform:", Platform.OS);

        if (!group || !onLeaveGroup) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể rời khỏi nhóm. Vui lòng thử lại sau.",
                type: "error"
            });
            return;
        }

        // Check if user is the admin
        const groupAdminId = normalizeId(group.groupAdmin?._id || group.groupAdmin);
        const userId = normalizeId(currentUser._id);
        const isCurrentUserAdmin = groupAdminId === userId;

        if (isCurrentUserAdmin) {
            // Admin needs to transfer ownership first
            setConfirmModal({
                visible: true,
                title: "Chuyển quyền quản trị",
                message: "Bạn là quản trị viên của nhóm này. Vui lòng chọn người quản trị mới trước khi rời nhóm.",
                type: "warning",
                action: () => {
                    // Close confirmation modal
                    setConfirmModal({ visible: false });
                    // Show admin selection UI
                    showSelectNewAdminUI();
                }
            });
        } else {
            // Regular member can leave directly
            if (IS_WEB) {
                console.log("Web platform detected, showing web modal");
                setShowLeaveConfirmModal(true);
            } else {
                // Mobile: use native Alert with improved handling
                console.log("Mobile platform detected, showing native Alert", Platform.OS);

                // Use setTimeout to ensure UI is ready
                setTimeout(() => {
                    Alert.alert(
                        "Rời nhóm",
                        "Bạn có chắc chắn muốn rời khỏi nhóm này?",
                        [
                            {
                                text: "Hủy",
                                style: "cancel"
                            },
                            {
                                text: "Rời nhóm",
                                style: "destructive",
                                onPress: () => {
                                    console.log("User confirmed leaving group");
                                    onClose(); // Close modal first for better UX
                                    setTimeout(() => {
                                        onLeaveGroup(group._id); // Call parent handler
                                    }, 300);
                                }
                            }
                        ],
                        { cancelable: true }
                    );
                }, 100);
            }
        }
    };

    // New function to show UI for selecting new admin
    const showSelectNewAdminUI = () => {
        // We'll implement a simplified version since this is in mobile
        // You can adapt this to match your mobile UI patterns

        // Get all members except current admin
        const adminId = normalizeId(currentUser._id);
        const eligibleMembers = group.members.filter(member =>
            normalizeId(member._id) !== adminId
        );

        if (eligibleMembers.length === 0) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không có thành viên nào để chuyển quyền quản trị.",
                type: "error"
            });
            return;
        }

        // Set state to show member selection UI in a different part of your component
        setSelectingNewAdmin(true);
        setEligibleAdminMembers(eligibleMembers);
    };

    // Function to handle the admin transfer
    const handleTransferAdminAndLeave = (newAdminId) => {
        if (!socketConnection || !newAdminId || !group?._id) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể chuyển quyền quản trị. Vui lòng thử lại.",
                type: "error"
            });
            return;
        }

        // Make sure the admin selection UI is closed
        setSelectingNewAdmin(false);

        // Show loading state
        setConfirmModal({
            visible: true,
            title: "Đang xử lý",
            message: "Đang chuyển quyền quản trị và rời nhóm...",
            type: "loading"
        });

        // Clean up previous listeners
        socketConnection.off("adminTransferred");

        // Listen for the response
        socketConnection.on("adminTransferred", (response) => {
            if (response.success) {
                // Close all modals
                setConfirmModal({
                    visible: false
                });

                // Close this modal
                onClose();

                // IMMEDIATE NAVIGATION: Call the leave group handler first to handle navigation
                if (onLeaveGroup) {
                    // For web, we need to add a slight delay to ensure UI updates properly
                    if (IS_WEB) {
                        setTimeout(() => {
                            onLeaveGroup(group._id);
                        }, 100);
                    } else {
                        onLeaveGroup(group._id);
                    }
                }

                // Then show success message (after navigation has started)
                setTimeout(() => {
                    Alert.alert(
                        "Thành công",
                        "Bạn đã chuyển quyền quản trị và rời nhóm thành công"
                    );
                }, IS_WEB ? 500 : 300); // Longer delay for web
            } else {
                setConfirmModal({
                    visible: true,
                    title: "Lỗi",
                    message: response.message || "Không thể chuyển quyền quản trị",
                    type: "error"
                });
            }
        });

        // Emit the event to transfer admin and leave
        socketConnection.emit("transferAdminAndLeave", {
            groupId: group._id,
            currentAdminId: currentUser._id,
            newAdminId: newAdminId
        });
    };

    // Enhanced member item display with better admin indicator
    const renderMemberItem = ({ item }) => {
        const memberId = normalizeId(item._id);
        const currentUserId = normalizeId(currentUser._id);
        const adminId = normalizeId(group?.groupAdmin?._id || group?.groupAdmin);

        const isCurrentUser = memberId === currentUserId;
        const isMemberAdmin = memberId === adminId;

        return (
            <View className="flex-row items-center py-3 px-2 border-b border-gray-100 justify-between">
                <View className="flex-row items-center flex-1">
                    <Image
                        source={{
                            uri: item.profilePic ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`
                        }}
                        className="w-10 h-10 rounded-full"
                    />
                    <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                            <Text className="font-medium">{item.name}</Text>
                            {isCurrentUser && (
                                <Text className="ml-2 text-gray-500 text-xs">(Bạn)</Text>
                            )}
                        </View>
                        {isMemberAdmin && (
                            <View className="flex-row items-center mt-1">
                                <FontAwesomeIcon icon={faUserShield} size={12} color="#3b82f6" />
                                <Text className="text-blue-600 text-xs ml-1">Quản trị viên</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Only show remove button if current user is admin and the member is not themselves or admin */}
                {isAdmin && !isCurrentUser && !isMemberAdmin && (
                    <TouchableOpacity
                        className="bg-red-50 py-1 px-3 rounded-full"
                        onPress={() => handleRemoveMemberWithConfirmation(item._id, item.name)}
                        disabled={removingMember}
                    >
                        {removingMember ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <View className="flex-row items-center">
                                <FontAwesomeIcon icon={faUserMinus} size={12} color="#ef4444" className="mr-1" />
                                <Text className="text-red-500 text-sm">Xóa</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const handleAddMemberClick = () => {
        // First close this modal, then open the add members modal
        onClose(); // Close the group info modal first

        // Add a small delay before opening the new modal for better UX
        setTimeout(() => {
            if (onAddMember) {
                onAddMember(); // Use the existing handler if provided
            } else {
                setShowAddMembersModal(true); // Open the modal directly if not
            }
        }, 300);
    };

    // Add handler for when members are added
    const handleMembersAdded = () => {
        console.log("Members added successfully");
        setShowAddMembersModal(false);

        // Refresh group data
        if (socketConnection && group?._id) {
            socketConnection.emit("joinRoom", group._id);
        }
    };

    // Extract media items from messages
    const extractMediaItems = () => {
        if (!messages || !Array.isArray(messages)) return [];

        const items = [];

        messages.forEach(message => {
            // Check for files array first (modern format)
            if (message.files && Array.isArray(message.files) && message.files.length > 0) {
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
                        createdAt: message.createdAt,
                        sender: message.sender
                    });
                });
            } else {
                // Legacy format (direct properties)
                if (message.imageUrl && isImageFile(message.imageUrl)) {
                    items.push({
                        ...message,
                        mediaUrl: message.imageUrl,
                        mediaType: 'image',
                    });
                } else if (message.fileUrl && isVideoFile(message.fileUrl)) {
                    items.push({
                        ...message,
                        mediaUrl: message.fileUrl,
                        mediaType: 'video',
                    });
                }
            }
        });

        // Sort by date, newest first
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    const mediaItems = extractMediaItems();

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

    // Create pan responder for swipe gestures in media viewer
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

    const renderMembersTab = () => (
        <View className="flex-1">
            <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-1 mb-3 mx-2">
                <FontAwesomeIcon icon={faSearch} size={14} color="#888" />
                <TextInput
                    placeholder="Tìm thành viên"
                    className="ml-2 text-sm flex-1"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <FontAwesomeIcon icon={faTimes} size={14} color="#888" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Add member count and admin info */}
            <View className="mx-2 mb-2 bg-blue-50 p-2 rounded-lg">
                <View className="flex-row items-center">
                    <FontAwesomeIcon icon={faUsers} size={14} color="#3b82f6" />
                    <Text className="ml-2 text-sm">
                        <Text className="font-bold">{group?.members?.length || 0}</Text> thành viên
                    </Text>
                </View>
                <View className="flex-row items-center mt-1">
                    <FontAwesomeIcon icon={faUserShield} size={14} color="#3b82f6" />
                    <Text className="ml-2 text-sm">
                        Quản trị viên: <Text className="font-bold">
                            {normalizeId(group?.groupAdmin) === normalizeId(currentUser._id)
                                ? 'Bạn'
                                : (group?.members?.find(m =>
                                    normalizeId(m._id) === normalizeId(group?.groupAdmin) ||
                                    normalizeId(m._id) === normalizeId(group?.groupAdmin?._id)
                                )?.name || 'Không xác định')}
                        </Text>
                    </Text>
                </View>
            </View>

            <FlatList
                data={filteredMembers}
                keyExtractor={item => item._id?.toString() || Math.random().toString()}
                renderItem={renderMemberItem}
                ListEmptyComponent={
                    <View className="p-4 items-center justify-center">
                        <Text className="text-gray-500">
                            {searchQuery.trim() ? "Không tìm thấy thành viên" : "Không có thành viên"}
                        </Text>
                    </View>
                }
            />

            {/* Changed: Now all members can add new members, not just admins */}
            <TouchableOpacity
                className="flex-row items-center justify-center py-3 bg-blue-50 mt-2"
                onPress={handleAddMemberClick}
            >
                <FontAwesomeIcon icon={faUserPlus} size={16} color="#3b82f6" className="mr-2" />
                <Text className="text-blue-500 font-medium">Thêm thành viên</Text>
            </TouchableOpacity>
        </View>
    );

    // Fix the Media tab rendering to prevent infinite loops
    const renderMediaTab = () => (
        <View className="flex-1">
            {mediaItems.length > 0 ? (
                <FlatList
                    data={mediaItems}
                    keyExtractor={(item, index) => `media-${item._id || index}`}
                    numColumns={3}
                    renderItem={({ item, index }) => {
                        const isVideo = item.mediaType === 'video';

                        return (
                            <TouchableOpacity
                                style={{
                                    width: THUMBNAIL_SIZE,
                                    height: THUMBNAIL_SIZE,
                                    margin: 5,
                                }}
                                onPress={() => handleMediaPress(item, index)}
                                activeOpacity={0.8}
                            >
                                {isVideo ? (
                                    <View className="relative overflow-hidden rounded-md" style={{ width: '100%', height: '100%' }}>
                                        <Video
                                            source={{ uri: item.mediaUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                            shouldPlay={false}
                                        />
                                        <View className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <FontAwesomeIcon icon={faVideoCamera} size={20} color="#fff" />
                                        </View>
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: item.mediaUrl }}
                                        style={{ width: '100%', height: '100%', borderRadius: 4 }}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500">Không có ảnh hoặc video trong cuộc trò chuyện</Text>
                </View>
            )}
        </View>
    );

    // Add a memoized MediaTab component to prevent unnecessary re-renders
    const MediaTabContent = React.memo(() => renderMediaTab());

    // Keep the existing renderContent function
    const renderContent = () => {
        switch (activeTab) {
            case 'members':
                return renderMembersTab();
            case 'media':
                // Use the memoized component instead of the function directly
                return <MediaTabContent />;
            case 'settings':
                return renderSettingsTab();
            default:
                return renderMembersTab();
        }
    };

    // Add the missing renderSettingsTab function that was referenced but not defined
    const renderSettingsTab = () => (
        <View className="flex-1">
            <View className="bg-white p-4 rounded-lg mb-4">
                <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-medium">Tên nhóm</Text>
                    {isAdmin && !editMode && (
                        <TouchableOpacity onPress={() => setEditMode(true)}>
                            <FontAwesomeIcon icon={faPen} size={16} color="#0068FF" />
                        </TouchableOpacity>
                    )}
                </View>

                {editMode ? (
                    <View className="mt-2">
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            className="border border-gray-300 rounded p-2 mb-2"
                            maxLength={50}
                            autoFocus
                        />
                        <View className="flex-row justify-end">
                            <TouchableOpacity
                                className="bg-gray-200 px-3 py-1 rounded-lg mr-2"
                                onPress={() => {
                                    setEditMode(false);
                                    setGroupName(group?.name || '');
                                }}
                            >
                                <Text>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="bg-blue-500 px-3 py-1 rounded-lg"
                                onPress={handleSaveGroupName}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white">Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <Text className="text-gray-600 mt-1">{group?.name || "Không có tên"}</Text>
                )}
            </View>

            {/* Group Leave Option */}
            <View className="mt-4">
                <Text className="px-4 text-gray-500 font-semibold mb-2">Rời nhóm</Text>
                <TouchableOpacity
                    className="flex-row items-center p-4 bg-yellow-50"
                    onPress={handleLeaveGroupWithConfirmation}
                >
                    <FontAwesomeIcon icon={faSignOutAlt} size={18} color="#F59E0B" />
                    <Text className="ml-3 text-yellow-600 font-medium">Rời nhóm chat</Text>
                </TouchableOpacity>
            </View>

            {/* Group Danger Zone */}
            <View className="mt-8">
                <Text className="px-4 text-red-500 font-semibold mb-2">Nguy hiểm</Text>

                {isAdmin ? (
                    <TouchableOpacity
                        className="flex-row items-center p-4 bg-red-50"
                        onPress={handleDeleteGroupWithAlert}
                        activeOpacity={0.6}
                    >
                        <FontAwesomeIcon icon={faTrash} size={18} color="#ef4444" />
                        <Text className="ml-3 text-red-600 font-medium">Giải tán nhóm</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="p-4 bg-gray-50 flex-row items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} size={16} color="#888" className="mr-2" />
                        <Text className="text-gray-500">Chỉ quản trị viên mới có thể giải tán nhóm</Text>
                    </View>
                )}
            </View>
        </View>
    );

    // Add media viewer modal
    const renderMediaViewer = () => (
        <Modal
            visible={mediaViewerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMediaViewerVisible(false)}
        >
            <View className="flex-1 bg-black/90 items-center justify-center">
                <TouchableOpacity
                    className="absolute top-10 right-5 z-10 p-2 bg-black/50 rounded-full"
                    onPress={() => setMediaViewerVisible(false)}
                >
                    <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
                </TouchableOpacity>

                {/* Navigation Indicator */}
                <View className="absolute top-10 self-center bg-black/50 py-1 px-3 rounded-full">
                    <Text className="text-white font-semibold">
                        {selectedMediaIndex + 1} / {mediaItems.length}
                    </Text>
                </View>

                <Animated.View
                    className="w-full h-4/5 items-center justify-center"
                    style={{
                        transform: [{ translateX: translateX }],
                        opacity: mediaOpacity
                    }}
                    {...panResponder.panHandlers}
                >
                    {selectedMedia?.mediaType === 'video' ? (
                        <Video
                            source={{ uri: selectedMedia.mediaUrl }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                            useNativeControls
                            shouldPlay
                            isLooping
                        />
                    ) : (
                        <Image
                            source={{ uri: selectedMedia?.mediaUrl }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                        />
                    )}
                </Animated.View>

                {/* Navigation Buttons */}
                {selectedMediaIndex > 0 && (
                    <TouchableOpacity
                        className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full"
                        onPress={() => navigateMedia(-1)}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} size={24} color="#fff" />
                    </TouchableOpacity>
                )}

                {selectedMediaIndex < mediaItems.length - 1 && (
                    <TouchableOpacity
                        className="absolute right-5 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full"
                        onPress={() => navigateMedia(1)}
                    >
                        <FontAwesomeIcon icon={faArrowRight} size={24} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* Swipe Instructions */}
                <Animated.View className="absolute bottom-12 bg-black/50 py-2 px-4 rounded-full" style={{ opacity: mediaOpacity }}>
                    <Text className="text-white font-medium">Lướt sang trái/phải để chuyển ảnh</Text>
                </Animated.View>
            </View>
        </Modal>
    );

    // Render function to display the admin selection UI - improve for platform compatibility
    const renderAdminSelectionUI = () => {
        if (!selectingNewAdmin) return null;

        return (
            <Modal
                visible={selectingNewAdmin}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectingNewAdmin(false)}
            >
                <View className="flex-1 bg-black/50">
                    <View className={`bg-white rounded-t-xl flex-1 ${IS_MOBILE ? 'mt-20' : 'mt-[10vh]'}`}>
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-xl font-bold">Chọn quản trị viên mới</Text>
                            <TouchableOpacity onPress={() => setSelectingNewAdmin(false)}>
                                <FontAwesomeIcon icon={faTimes} size={20} />
                            </TouchableOpacity>
                        </View>

                        <View className="p-4">
                            <Text className="text-gray-600 mb-4">
                                Bạn cần chọn người quản trị mới trước khi rời nhóm.
                            </Text>

                            {eligibleAdminMembers.length > 0 ? (
                                <FlatList
                                    data={eligibleAdminMembers}
                                    keyExtractor={item => item._id?.toString() || Math.random().toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            className="flex-row items-center py-3 px-2 border-b border-gray-100"
                                            onPress={() => {
                                                // Close the admin selection UI first
                                                setSelectingNewAdmin(false);

                                                // Then show confirmation
                                                setConfirmModal({
                                                    visible: true,
                                                    title: "Xác nhận",
                                                    message: `Bạn có chắc chắn muốn chuyển quyền quản trị cho ${item.name} và rời nhóm?`,
                                                    type: "warning",
                                                    action: () => {
                                                        handleTransferAdminAndLeave(item._id);
                                                    }
                                                });
                                            }}
                                        >
                                            <Image
                                                source={{
                                                    uri: item.profilePic ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`
                                                }}
                                                className="w-10 h-10 rounded-full"
                                            />
                                            <View className="ml-3 flex-1">
                                                <Text className="font-medium">{item.name}</Text>
                                            </View>
                                            <FontAwesomeIcon icon={faUserShield} size={16} color="#3b82f6" />
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <View className="p-4 items-center justify-center">
                                    <Text className="text-gray-500">Không có thành viên nào để chuyển quyền quản trị</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Add web remove member confirmation modal
    const renderRemoveMemberModal = () => {
        if (!IS_WEB || !showRemoveMemberModal || !memberToRemove) return null;

        return (
            <Modal
                visible={showRemoveMemberModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRemoveMemberModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center">
                    <View className="bg-white rounded-lg p-5 w-[90%] max-w-[400px]">
                        <Text className="text-xl font-bold mb-3 text-center">Xác nhận xóa thành viên</Text>
                        <Text className="text-gray-700 text-center mb-5">
                            Bạn có chắc muốn xóa {memberToRemove.name} khỏi nhóm?
                        </Text>

                        <View className="flex-row justify-center">
                            <TouchableOpacity
                                className="bg-gray-200 py-2 px-5 rounded-lg mr-4"
                                onPress={() => setShowRemoveMemberModal(false)}
                            >
                                <Text className="font-medium">Hủy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-red-500 py-2 px-5 rounded-lg"
                                onPress={() => {
                                    setShowRemoveMemberModal(false);
                                    const groupId = normalizeId(group._id);
                                    const adminId = normalizeId(currentUser._id);
                                    performMemberRemoval(groupId, memberToRemove.id, memberToRemove.name, adminId);
                                }}
                                disabled={removingMember}
                            >
                                {removingMember ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text className="font-medium text-white">Xóa</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Make sure the web leave confirmation modal state is correctly initialized
    const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);

    // Improved web leave confirmation modal
    const renderWebLeaveConfirmModal = () => {
        if (!showLeaveConfirmModal) return null;

        return (
            <Modal
                visible={showLeaveConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLeaveConfirmModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center">
                    <View className="bg-white rounded-lg p-5 w-[90%] max-w-[400px]">
                        <Text className="text-xl font-bold mb-3 text-center">Rời nhóm</Text>
                        <Text className="text-gray-700 text-center mb-5">
                            Bạn có chắc chắn muốn rời khỏi nhóm này?
                        </Text>

                        <View className="flex-row justify-center">
                            <TouchableOpacity
                                className="bg-gray-200 py-2 px-5 rounded-lg mr-4"
                                onPress={() => setShowLeaveConfirmModal(false)}
                            >
                                <Text className="font-medium">Hủy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-red-500 py-2 px-5 rounded-lg"
                                onPress={() => {
                                    setShowLeaveConfirmModal(false);
                                    onClose(); // Close group info modal
                                    setTimeout(() => {
                                        if (onLeaveGroup) onLeaveGroup(group._id);
                                    }, 300);
                                }}
                            >
                                <Text className="font-medium text-white">Rời nhóm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <View className="flex-1 bg-black/40">
                    <View className={`bg-white rounded-t-xl flex-1 ${IS_MOBILE ? 'mt-20' : 'mt-[10vh]'}`}>
                        {/* Header with updated title */}
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-xl font-bold">{getModalTitle()}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <FontAwesomeIcon icon={faTimes} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Group Info Header with clear indicators */}
                        <View className="items-center p-4">
                            <Image
                                source={{
                                    uri: group?.profilePic ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || "Chat")}&background=random&size=200`
                                }}
                                className="w-24 h-24 rounded-full mb-2"
                            />
                            <Text className="text-xl font-bold">{group?.name || "Chat"}</Text>
                            {isGroup ? (
                                <View className="flex-row items-center mt-1">
                                    <FontAwesomeIcon icon={faUsers} size={14} color="#3b82f6" className="mr-2" />
                                    <Text className="text-gray-500">{group?.members?.length || 0} thành viên</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center mt-1">
                                    <View className={`w-2.5 h-2.5 rounded-full ${true ? 'bg-green-500' : 'bg-gray-400'} mr-2`} />
                                    <Text className="text-gray-500">
                                        {true ? 'Đang hoạt động' : 'Không hoạt động'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Tabs - Only show all tabs for group chats */}
                        <View className="flex-row border-b border-gray-200">
                            <TouchableOpacity
                                className={`flex-1 p-3 items-center ${activeTab === 'members' ? "border-b-2 border-blue-500" : ""}`}
                                onPress={() => setActiveTab('members')}
                            >
                                <FontAwesomeIcon
                                    icon={faUsers}
                                    size={18}
                                    color={activeTab === 'members' ? "#0068FF" : "#666"}
                                />
                                <Text className={activeTab === 'members' ? "text-blue-500 font-medium mt-1" : "text-gray-600 mt-1"}>
                                    {isGroup ? "Thành viên" : "Thông tin"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 p-3 items-center ${activeTab === 'media' ? "border-b-2 border-blue-500" : ""}`}
                                onPress={() => setActiveTab('media')}
                            >
                                <FontAwesomeIcon
                                    icon={faImage}
                                    size={18}
                                    color={activeTab === 'media' ? "#0068FF" : "#666"}
                                />
                                <Text className={activeTab === 'media' ? "text-blue-500 font-medium mt-1" : "text-gray-600 mt-1"}>
                                    Ảnh/video
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 p-3 items-center ${activeTab === 'settings' ? "border-b-2 border-blue-500" : ""}`}
                                onPress={() => setActiveTab('settings')}
                            >
                                <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    size={18}
                                    color={activeTab === 'settings' ? "#0068FF" : "#666"}
                                />
                                <Text className={activeTab === 'settings' ? "text-blue-500 font-medium mt-1" : "text-gray-600 mt-1"}>
                                    Tùy chọn
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        <View className="flex-1 p-2">
                            {renderContent()}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Media viewer modal */
                renderMediaViewer()}

            {/* Admin selection UI for transfer */
                renderAdminSelectionUI()}

            {/* Web-specific leave confirmation modal */
                Platform.OS === 'web' && renderWebLeaveConfirmModal()}

            {/* Member removal confirmation modal for web */}
            {renderRemoveMemberModal()}

            {/* Add members modal */}
            {!onAddMember && (
                <AddGroupMembersModal
                    visible={showAddMembersModal}
                    onClose={() => setShowAddMembersModal(false)}
                    groupId={group?._id}
                    currentUserId={currentUser?._id}
                    existingMembers={group?.members || []}
                    socketConnection={socketConnection}
                    onMembersAdded={handleMembersAdded}
                    onSuccess={() => {
                        setShowAddMembersModal(false);
                        // Don't automatically reopen the group info modal
                    }}
                />
            )}

            {/* Generic confirmation modal */}
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
        </>
    );
};

GroupChatInfoModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    group: PropTypes.object,
    currentUser: PropTypes.object.isRequired,
    onLeaveGroup: PropTypes.func,
    messages: PropTypes.array,
    onAddMember: PropTypes.func,
    onRemoveMember: PropTypes.func,
    socketConnection: PropTypes.object,
    onDeleteGroup: PropTypes.func
};

export default GroupChatInfoModal;