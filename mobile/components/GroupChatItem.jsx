import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faUsers,
    faImage,
    faFilePen,
    faMagnifyingGlass,
    faTimes,
    faCheck,
    faEllipsisVertical
} from '@fortawesome/free-solid-svg-icons';

const GroupChatItem = ({ group, onPress, currentUserId, onLongPress }) => {
    const isAdmin = group.groupAdmin === currentUserId || group.groupAdmin?._id === currentUserId;
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (text) => {
        setSearchQuery(text);
        setIsSearching(true);

        if (text.trim() === '') {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Filter members based on search query
        const memberResults = group.members?.filter(member =>
            member.name?.toLowerCase().includes(text.toLowerCase())
        ) || [];

        // Search messages (simplified - in real app, might need API call)
        const messageResults = group.messages?.filter(message =>
            message.text?.toLowerCase().includes(text.toLowerCase())
        ) || [];

        setSearchResults([
            ...memberResults.map(member => ({ ...member, type: 'member' })),
            ...messageResults.map(message => ({ ...message, type: 'message' }))
        ]);

        setIsSearching(false);
    };

    const renderSearchItem = ({ item }) => {
        if (item.type === 'member') {
            return (
                <TouchableOpacity
                    className="flex-row items-center p-3 border-b border-gray-100"
                    onPress={() => {
                        // Handle member selection
                        setShowSearchModal(false);
                    }}
                >
                    <Image
                        source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}` }}
                        className="w-10 h-10 rounded-full"
                    />
                    <View className="ml-3 flex-1">
                        <Text className="font-medium">{item.name}</Text>
                        <Text className="text-gray-500 text-xs">Thành viên</Text>
                    </View>
                </TouchableOpacity>
            );
        } else {
            return (
                <TouchableOpacity
                    className="flex-row items-center p-3 border-b border-gray-100"
                    onPress={() => {
                        // Handle message selection
                        setShowSearchModal(false);
                    }}
                >
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                        <FontAwesomeIcon icon={faFilePen} size={16} color="#0068FF" />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="font-medium" numberOfLines={1}>{item.text}</Text>
                        <Text className="text-gray-500 text-xs">
                            {new Date(item.createdAt).toLocaleTimeString()}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }
    };

    return (
        <>
            <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
                onPress={() => onPress(group)}
                onLongPress={() => onLongPress && onLongPress(group)}
            >
                <View className="relative">
                    <Image
                        source={{ uri: group?.userDetails?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.userDetails?.name || "Group")}&background=random` }}
                        className="w-12 h-12 rounded-full"
                    />
                    <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full h-4 w-4 items-center justify-center">
                        <FontAwesomeIcon icon={faUsers} size={10} color="#fff" />
                    </View>
                </View>

                <View className="ml-3 flex-1 overflow-hidden">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <Text className="text-[15px] font-semibold">{group?.userDetails?.name}</Text>
                            {isAdmin && (
                                <View className="ml-2 bg-blue-100 px-1.5 py-0.5 rounded">
                                    <Text className="text-xs text-blue-700">Admin</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            className="p-1"
                            onPress={() => setShowSearchModal(true)}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text numberOfLines={1} className="text-gray-500 text-sm">
                        {group?.latestMessage?.msgByUserId === currentUserId ? (
                            <Text>Bạn: </Text>
                        ) : (
                            group?.members?.find((m) => m._id === group?.latestMessage?.msgByUserId)?.name && (
                                <Text>
                                    {group?.members?.find((m) => m._id === group?.latestMessage?.msgByUserId)?.name}:
                                </Text>
                            )
                        )}
                        <Text>
                            {group?.latestMessage?.text || ""}
                            {group?.latestMessage?.imageUrl && (
                                " [Hình ảnh]"
                            )}
                            {group?.latestMessage?.fileUrl && !group?.latestMessage?.imageUrl && (
                                ` [${group?.latestMessage?.fileName || "Tài liệu"}]`
                            )}
                        </Text>
                    </Text>
                </View>

                <View className="items-end">
                    <Text className="text-xs text-gray-500">
                        {group?.latestMessage?.createdAt &&
                            new Date(group?.latestMessage?.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                    </Text>
                    {group?.unseenMessages > 0 && (
                        <View className="bg-red-700 rounded-full h-5 w-5 items-center justify-center mt-1">
                            <Text className="text-white text-xs">{group?.unseenMessages}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Search Modal */}
            <Modal
                visible={showSearchModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSearchModal(false)}
            >
                <View className="flex-1 bg-black/50 pt-10">
                    <View className="flex-1 bg-white rounded-t-3xl">
                        <View className="p-4 border-b border-gray-200">
                            <View className="flex-row items-center">
                                <TouchableOpacity
                                    className="mr-3"
                                    onPress={() => setShowSearchModal(false)}
                                >
                                    <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
                                </TouchableOpacity>

                                <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3 py-2">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
                                    <TextInput
                                        placeholder={`Tìm kiếm trong "${group?.userDetails?.name}"`}
                                        className="ml-2 flex-1"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        autoFocus
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => handleSearch('')}>
                                            <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        {isSearching ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#0084FF" />
                                <Text className="mt-2 text-gray-500">Đang tìm kiếm...</Text>
                            </View>
                        ) : searchResults.length > 0 ? (
                            <FlatList
                                data={searchResults}
                                renderItem={renderSearchItem}
                                keyExtractor={(item, index) => `${item.type}-${item._id || index}`}
                            />
                        ) : searchQuery.length > 0 ? (
                            <View className="flex-1 items-center justify-center p-4">
                                <Text className="text-gray-500">Không tìm thấy kết quả</Text>
                            </View>
                        ) : (
                            <View className="flex-1 items-center justify-center p-4">
                                <Text className="text-gray-500">Nhập từ khóa để tìm kiếm</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

GroupChatItem.propTypes = {
    group: PropTypes.object.isRequired,
    onPress: PropTypes.func.isRequired,
    currentUserId: PropTypes.string.isRequired,
    onLongPress: PropTypes.func
};

export default GroupChatItem;
