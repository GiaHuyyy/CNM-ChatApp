import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, Modal } from 'react-native';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
    faTimes, faUserShield, faSignOutAlt, faTrash,
    faUserPlus, faUserMinus
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from 'prop-types';
import AddGroupMembersModal from './AddGroupMembersModal';
import ConfirmationModal from './ConfirmationModal';

const GroupInfoModal = ({
    visible,
    onClose,
    group,
    currentUserId,
    onLeaveGroup,
    onDeleteGroup,
    socketConnection
}) => {
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [removingMember, setRemovingMember] = useState(false);

    // Add state for confirmation modal
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: "",
        message: "",
        action: null,
        type: "warning"
    });

    useEffect(() => {
        if (group) {
            const adminId = group.groupAdmin?._id || group.groupAdmin;
            console.log("Group Admin Check:", {
                adminId: typeof adminId === 'object' ? adminId.toString() : adminId,
                currentUserId,
                isAdmin: adminId === currentUserId || adminId?._id === currentUserId
            });
        }
    }, [group, currentUserId]);

    const handleRemoveMember = (memberId, memberName) => {
        if (!socketConnection) {
            setConfirmModal({
                visible: true,
                title: "Lỗi",
                message: "Không thể kết nối đến máy chủ",
                type: "error"
            });
            return;
        }

        const groupIdStr = typeof group._id === 'object' ? group._id.toString() : group._id;
        const memberIdStr = typeof memberId === 'object' ? memberId.toString() : memberId;
        const adminIdStr = typeof currentUserId === 'object' ? currentUserId.toString() : currentUserId;
        const groupAdminIdStr = typeof (group.groupAdmin?._id || group.groupAdmin) === 'object'
            ? (group.groupAdmin?._id || group.groupAdmin).toString()
            : (group.groupAdmin?._id || group.groupAdmin);

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

        setConfirmModal({
            visible: true,
            title: "Xác nhận xóa thành viên",
            message: `Bạn có chắc muốn xóa ${memberName} khỏi nhóm?`,
            type: "warning",
            action: () => {
                setRemovingMember(true);

                socketConnection.off("memberRemovedFromGroup");

                socketConnection.on("memberRemovedFromGroup", (response) => {
                    console.log("Response from memberRemovedFromGroup:", response);
                    setRemovingMember(false);

                    if (response.success) {
                        setConfirmModal({
                            visible: true,
                            title: "Thành công",
                            message: "Đã xóa thành viên khỏi nhóm",
                            type: "success",
                            action: onClose
                        });
                    } else {
                        setConfirmModal({
                            visible: true,
                            title: "Lỗi",
                            message: response.message || "Không thể xóa thành viên",
                            type: "error"
                        });
                    }
                });

                const payload = {
                    groupId: groupIdStr,
                    memberId: memberIdStr,
                    adminId: adminIdStr
                };

                console.log("Emitting removeMemberFromGroup with payload:", payload);

                socketConnection.emit("removeMemberFromGroup", payload);

                setTimeout(() => {
                    if (removingMember) {
                        console.log("No response received for member removal");
                        setRemovingMember(false);
                        socketConnection.off("memberRemovedFromGroup");
                        setConfirmModal({
                            visible: true,
                            title: "Lỗi",
                            message: "Không nhận được phản hồi từ máy chủ",
                            type: "error"
                        });
                    }
                }, 10000);
            }
        });
    };

    const normalizeId = (id) => {
        if (!id) return '';
        return typeof id === 'object' ? id.toString() : id;
    };

    const calculateIsAdmin = () => {
        if (!group || !currentUserId) return false;

        const groupAdminId = normalizeId(group.groupAdmin?._id || group.groupAdmin);
        const userId = normalizeId(currentUserId);

        return groupAdminId === userId;
    };

    const isReallyAdmin = calculateIsAdmin();

    const renderMemberItem = ({ item }) => {
        const memberId = item._id || item;
        const memberIdStr = typeof memberId === 'object' ? memberId.toString() : memberId;
        const currentUserIdStr = typeof currentUserId === 'object' ? currentUserId.toString() : currentUserId;
        const groupAdminIdStr = typeof (group.groupAdmin?._id || group.groupAdmin) === 'object'
            ? (group.groupAdmin?._id || group.groupAdmin).toString()
            : (group.groupAdmin?._id || group.groupAdmin);

        const isCurrentUser = memberIdStr === currentUserIdStr;
        const isMemberAdmin = memberIdStr === groupAdminIdStr;
        const memberName = item.name || (isCurrentUser ? 'Bạn' : 'Người dùng');

        console.log(`Member item: ${memberName}`, {
            memberId: memberIdStr,
            isCurrentUser,
            isMemberAdmin
        });

        return (
            <View className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center flex-1">
                    <Image
                        source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}` }}
                        className="w-8 h-8 rounded-full mr-2"
                    />
                    <View className="flex-1">
                        <Text>{memberName}</Text>
                        {isMemberAdmin && (
                            <View className="px-2 py-0.5 bg-blue-100 rounded mt-1">
                                <Text className="text-xs text-blue-600">Quản trị viên</Text>
                            </View>
                        )}
                    </View>
                </View>

                {isReallyAdmin && !isCurrentUser && !isMemberAdmin && (
                    <TouchableOpacity
                        className="bg-red-100 p-2 rounded-full"
                        onPress={() => handleRemoveMember(memberId, memberName)}
                        disabled={removingMember}
                    >
                        <FontAwesomeIcon icon={faUserMinus} size={14} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
                <View className="bg-white w-[90%] rounded-xl p-5 max-h-[80%]">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold">Thông tin nhóm</Text>
                        <TouchableOpacity onPress={onClose}>
                            <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {group && (
                        <>
                            <View className="items-center mb-4">
                                <Image
                                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name || "Group")}&background=random` }}
                                    className="w-20 h-20 rounded-full mb-2"
                                />
                                <Text className="text-lg font-bold">{group.name}</Text>
                                <Text className="text-sm text-gray-500">{group.members?.length || 0} thành viên</Text>
                            </View>

                            <View className="mb-4 bg-blue-50 p-3 rounded-lg flex-row items-center">
                                <FontAwesomeIcon icon={faUserShield} size={16} color="#0084ff" className="mr-2" />
                                <Text>
                                    Quản trị viên: {' '}
                                    <Text className="font-bold">
                                        {normalizeId(group.groupAdmin) === normalizeId(currentUserId)
                                            ? 'Bạn'
                                            : (group.members?.find(m =>
                                                normalizeId(m._id) === normalizeId(group.groupAdmin) ||
                                                normalizeId(m._id) === normalizeId(group.groupAdmin?._id)
                                            )?.name || 'Không xác định')}
                                    </Text>
                                </Text>
                            </View>

                            <View className="border-t border-gray-200 py-4 mb-2">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="font-semibold">Thành viên:</Text>
                                    {isReallyAdmin && (
                                        <TouchableOpacity
                                            className="bg-blue-500 px-3 py-1 rounded-full flex-row items-center"
                                            onPress={() => setShowAddMembersModal(true)}
                                        >
                                            <FontAwesomeIcon icon={faUserPlus} size={12} color="white" className="mr-1" />
                                            <Text className="text-white text-xs">Thêm thành viên</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <FlatList
                                    data={group.members}
                                    keyExtractor={(item) => (item._id || item).toString()}
                                    style={{ maxHeight: 200 }}
                                    renderItem={renderMemberItem}
                                />
                            </View>

                            <View className="flex-row justify-center space-x-4 mt-2">
                                {isReallyAdmin ? (
                                    <TouchableOpacity
                                        className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
                                        onPress={onDeleteGroup}
                                    >
                                        <FontAwesomeIcon icon={faTrash} size={16} color="white" className="mr-2" />
                                        <Text className="text-white">Xóa nhóm</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
                                        onPress={onLeaveGroup}
                                    >
                                        <FontAwesomeIcon icon={faSignOutAlt} size={16} color="white" className="mr-2" />
                                        <Text className="text-white">Rời nhóm</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </View>

            <AddGroupMembersModal
                visible={showAddMembersModal}
                onClose={() => setShowAddMembersModal(false)}
                groupId={group?._id}
                currentUserId={currentUserId}
                existingMembers={group?.members || []}
                socketConnection={socketConnection}
                onMembersAdded={() => {
                    setShowAddMembersModal(false);
                    onClose();
                }}
            />

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

GroupInfoModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    group: PropTypes.object,
    currentUserId: PropTypes.string.isRequired,
    onLeaveGroup: PropTypes.func,
    onDeleteGroup: PropTypes.func,
    socketConnection: PropTypes.object
};

export default GroupInfoModal;
