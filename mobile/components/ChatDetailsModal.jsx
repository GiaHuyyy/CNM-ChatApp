import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    FlatList,
    StyleSheet,
    Dimensions,
    Alert,
    Linking
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faBell,
    faTimes,
    faImage,
    faFile,
    faLink,
    faUserPlus,
    faSignOut,
    faTrash,
    faEdit,
    faUsers,
    faVideoCamera,
    faEllipsisV,
    faMicrophone,
    faMicrophoneSlash
} from '@fortawesome/free-solid-svg-icons';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 60) / 3;

const ChatDetailsModal = ({
    visible,
    onClose,
    chatData,
    currentUser,
    messages,
    socketConnection,
    onAddMember,
    onEditGroupInfo,
    onLeaveGroup,
    onRemoveMember,
    onToggleMute,
    onDeleteConversation
}) => {
    const [activeTab, setActiveTab] = useState('media');
    const [activeSection, setActiveSection] = useState('main'); // 'main', 'members', 'media', 'files', 'links'
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [mediaViewerVisible, setMediaViewerVisible] = useState(false);

    // Process messages to extract media, files, and links
    const media = messages.filter(msg =>
        (msg.files && msg.files.some(file =>
            file.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))
        )) || msg.imageUrl
    );

    const files = messages.filter(msg =>
        (msg.files && msg.files.some(file =>
            file.type && !file.type.startsWith('image/') && !file.type.startsWith('video/')
        )) || (msg.fileUrl && !msg.imageUrl)
    );

    const links = messages.filter(msg =>
        msg.text && (msg.text.startsWith('http://') || msg.text.startsWith('https://'))
    );

    const isAdmin = chatData?.isGroup && chatData?.groupAdmin === currentUser?._id;
    const isMuted = (memberId) => {
        if (!chatData?.mutedMembers || !Array.isArray(chatData.mutedMembers)) return false;
        return chatData.mutedMembers.some(id => id === memberId);
    };

    const handleMediaPress = (item) => {
        setSelectedMedia(item);
        setMediaViewerVisible(true);
    };

    const handleRemoveMember = (memberId, memberName) => {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${memberName} from this group?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => onRemoveMember(memberId) }
            ]
        );
    };

    const handleToggleMute = (memberId, memberName, isMuted) => {
        Alert.alert(
            isMuted ? "Unmute Member" : "Mute Member",
            isMuted
                ? `Allow ${memberName} to send messages in this group?`
                : `Prevent ${memberName} from sending messages in this group?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: isMuted ? "Unmute" : "Mute",
                    onPress: () => onToggleMute(memberId, !isMuted)
                }
            ]
        );
    };

    const handleLeaveOrDeleteChat = () => {
        if (chatData?.isGroup) {
            if (isAdmin) {
                Alert.alert(
                    "Delete Group",
                    "Are you sure you want to delete this group? This action cannot be undone.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: onDeleteConversation }
                    ]
                );
            } else {
                Alert.alert(
                    "Leave Group",
                    "Are you sure you want to leave this group?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Leave", style: "destructive", onPress: onLeaveGroup }
                    ]
                );
            }
        } else {
            Alert.alert(
                "Delete Conversation",
                "Are you sure you want to delete this conversation?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: onDeleteConversation }
                ]
            );
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => {
                if (activeSection !== 'main') {
                    setActiveSection('main');
                } else {
                    onClose();
                }
            }} style={styles.backButton}>
                <FontAwesomeIcon icon={faArrowLeft} size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
                {activeSection === 'main' ? 'Conversation Info' :
                    activeSection === 'members' ? 'Group Members' :
                        activeSection === 'media' ? 'Media' :
                            activeSection === 'files' ? 'Files' : 'Links'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={20} color="#333" />
            </TouchableOpacity>
        </View>
    );

    const renderMainSection = () => (
        <ScrollView style={styles.container}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
                <Image
                    source={{ uri: chatData?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData?.name || 'User')}` }}
                    style={styles.avatar}
                />
                <View style={styles.nameContainer}>
                    <Text style={styles.name}>{chatData?.name}</Text>
                    {chatData?.isGroup && (
                        <Text style={styles.memberCount}>
                            {chatData?.members?.length || 0} members
                        </Text>
                    )}
                </View>
                {chatData?.isGroup && (isAdmin || currentUser?._id === chatData?.groupAdmin) && (
                    <TouchableOpacity onPress={onEditGroupInfo} style={styles.editButton}>
                        <FontAwesomeIcon icon={faEdit} size={18} color="#0084ff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                    <View style={styles.iconContainer}>
                        <FontAwesomeIcon icon={faBell} size={18} color="#555" />
                    </View>
                    <Text style={styles.actionText}>Mute</Text>
                </TouchableOpacity>

                {chatData?.isGroup && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setActiveSection('members')}
                    >
                        <View style={styles.iconContainer}>
                            <FontAwesomeIcon icon={faUsers} size={18} color="#555" />
                        </View>
                        <Text style={styles.actionText}>Members</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onAddMember}
                >
                    <View style={styles.iconContainer}>
                        <FontAwesomeIcon icon={faUserPlus} size={18} color="#555" />
                    </View>
                    <Text style={styles.actionText}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Media Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Media & Files</Text>
                    <TouchableOpacity onPress={() => setActiveSection('media')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {media.length > 0 ? (
                    <FlatList
                        horizontal
                        data={media.slice(0, 6)}
                        keyExtractor={(item, index) => `media-${item._id || index}`}
                        renderItem={({ item }) => {
                            // Get the file or fallback to legacy format
                            const file = item.files && item.files.length > 0
                                ? item.files.find(f => f.type && (f.type.startsWith('image/') || f.type.startsWith('video/')))
                                : null;

                            const url = file ? file.url : item.imageUrl;
                            const isVideo = file ? file.type.startsWith('video/') : url.match(/\.(mp4|mov|avi|wmv)$/i);

                            return (
                                <TouchableOpacity
                                    style={styles.mediaItem}
                                    onPress={() => handleMediaPress({ ...item, url, isVideo })}
                                >
                                    {isVideo ? (
                                        <View style={styles.videoContainer}>
                                            <Video
                                                source={{ uri: url }}
                                                style={styles.mediaThumbnail}
                                                resizeMode="cover"
                                                shouldPlay={false}
                                            />
                                            <View style={styles.playIconOverlay}>
                                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: url }} style={styles.mediaThumbnail} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        showsHorizontalScrollIndicator={false}
                    />
                ) : (
                    <Text style={styles.emptyText}>No media shared</Text>
                )}
            </View>

            {/* Files Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Files</Text>
                    <TouchableOpacity onPress={() => setActiveSection('files')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {files.length > 0 ? (
                    <View>
                        {files.slice(0, 3).map((item, index) => {
                            // Get the file or fallback to legacy format
                            const file = item.files && item.files.length > 0
                                ? item.files.find(f => f.type && !f.type.startsWith('image/') && !f.type.startsWith('video/'))
                                : null;

                            const url = file ? file.url : item.fileUrl;
                            const name = file ? file.name : item.fileName || "File";

                            return (
                                <TouchableOpacity
                                    key={`file-${item._id || index}`}
                                    style={styles.fileItem}
                                    onPress={() => Linking.openURL(url)}
                                >
                                    <FontAwesomeIcon icon={faFile} size={20} color="#888" />
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
                                        <Text style={styles.fileDate}>
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>No files shared</Text>
                )}
            </View>

            {/* Links Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Links</Text>
                    <TouchableOpacity onPress={() => setActiveSection('links')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {links.length > 0 ? (
                    <View>
                        {links.slice(0, 3).map((item, index) => (
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
                    <Text style={styles.emptyText}>No links shared</Text>
                )}
            </View>

            {/* Leave/Delete Button */}
            <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleLeaveOrDeleteChat}
            >
                <FontAwesomeIcon
                    icon={chatData?.isGroup && !isAdmin ? faSignOut : faTrash}
                    size={18}
                    color="#ff3b30"
                />
                <Text style={styles.dangerButtonText}>
                    {chatData?.isGroup
                        ? isAdmin ? "Delete Group" : "Leave Group"
                        : "Delete Conversation"}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderMediaSection = () => (
        <View style={styles.fullSection}>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'media' && styles.activeTab]}
                    onPress={() => setActiveTab('media')}
                >
                    <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>
                        Media
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'files' && styles.activeTab]}
                    onPress={() => setActiveTab('files')}
                >
                    <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
                        Files
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'links' && styles.activeTab]}
                    onPress={() => setActiveTab('links')}
                >
                    <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>
                        Links
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'media' && (
                media.length > 0 ? (
                    <FlatList
                        data={media}
                        keyExtractor={(item, index) => `all-media-${item._id || index}`}
                        numColumns={3}
                        renderItem={({ item }) => {
                            // Get the file or fallback to legacy format
                            const file = item.files && item.files.length > 0
                                ? item.files.find(f => f.type && (f.type.startsWith('image/') || f.type.startsWith('video/')))
                                : null;

                            const url = file ? file.url : item.imageUrl;
                            const isVideo = file ? file.type.startsWith('video/') : url.match(/\.(mp4|mov|avi|wmv)$/i);

                            return (
                                <TouchableOpacity
                                    style={styles.gridMediaItem}
                                    onPress={() => handleMediaPress({ ...item, url, isVideo })}
                                >
                                    {isVideo ? (
                                        <View style={styles.videoContainer}>
                                            <Video
                                                source={{ uri: url }}
                                                style={styles.gridMediaThumbnail}
                                                resizeMode="cover"
                                                shouldPlay={false}
                                            />
                                            <View style={styles.playIconOverlay}>
                                                <FontAwesomeIcon icon={faVideoCamera} size={18} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: url }} style={styles.gridMediaThumbnail} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No media shared</Text>
                    </View>
                )
            )}

            {activeTab === 'files' && (
                files.length > 0 ? (
                    <FlatList
                        data={files}
                        keyExtractor={(item, index) => `all-files-${item._id || index}`}
                        renderItem={({ item }) => {
                            // Get the file or fallback to legacy format
                            const file = item.files && item.files.length > 0
                                ? item.files.find(f => f.type && !f.type.startsWith('image/') && !f.type.startsWith('video/'))
                                : null;

                            const url = file ? file.url : item.fileUrl;
                            const name = file ? file.name : item.fileName || "File";

                            return (
                                <TouchableOpacity
                                    style={styles.fileItem}
                                    onPress={() => Linking.openURL(url)}
                                >
                                    <FontAwesomeIcon icon={faFile} size={20} color="#888" />
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
                                        <Text style={styles.fileDate}>
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No files shared</Text>
                    </View>
                )
            )}

            {activeTab === 'links' && (
                links.length > 0 ? (
                    <FlatList
                        data={links}
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
                        <Text style={styles.emptyText}>No links shared</Text>
                    </View>
                )
            )}
        </View>
    );

    const renderMembersSection = () => (
        <View style={styles.fullSection}>
            {chatData?.isGroup && (
                <>
                    <TouchableOpacity
                        style={styles.addMemberButton}
                        onPress={onAddMember}
                    >
                        <FontAwesomeIcon icon={faUserPlus} size={18} color="#fff" />
                        <Text style={styles.addMemberText}>Add Member</Text>
                    </TouchableOpacity>

                    <FlatList
                        data={chatData?.members || []}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const isCurrentUser = item._id === currentUser?._id;
                            const memberMuted = isMuted(item._id);

                            return (
                                <View style={styles.memberItem}>
                                    <Image
                                        source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}` }}
                                        style={styles.memberAvatar}
                                    />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>
                                            {isCurrentUser ? "You" : item.name}
                                            {item._id === chatData?.groupAdmin && " (Admin)"}
                                        </Text>
                                        {memberMuted && (
                                            <Text style={styles.mutedText}>Muted</Text>
                                        )}
                                    </View>

                                    {isAdmin && !isCurrentUser && (
                                        <View style={styles.memberActions}>
                                            <TouchableOpacity
                                                style={styles.memberActionButton}
                                                onPress={() => handleToggleMute(item._id, item.name, memberMuted)}
                                            >
                                                <FontAwesomeIcon
                                                    icon={memberMuted ? faMicrophoneSlash : faMicrophone}
                                                    size={16}
                                                    color={memberMuted ? "#ff3b30" : "#0084ff"}
                                                />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.memberActionButton}
                                                onPress={() => handleRemoveMember(item._id, item.name)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} size={16} color="#ff3b30" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        }}
                    />
                </>
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
            <View style={styles.mediaViewerContainer}>
                <TouchableOpacity
                    style={styles.closeMediaButton}
                    onPress={() => setMediaViewerVisible(false)}
                >
                    <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
                </TouchableOpacity>

                {selectedMedia?.isVideo ? (
                    <Video
                        source={{ uri: selectedMedia.url }}
                        style={styles.fullSizeMedia}
                        resizeMode="contain"
                        useNativeControls
                        shouldPlay
                        isLooping
                    />
                ) : (
                    <Image
                        source={{ uri: selectedMedia?.url }}
                        style={styles.fullSizeMedia}
                        resizeMode="contain"
                    />
                )}
            </View>
        </Modal>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'main':
                return renderMainSection();
            case 'members':
                return renderMembersSection();
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
                {renderContent()}
                {renderMediaViewer()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        paddingTop: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
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
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    nameContainer: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
    },
    memberCount: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    editButton: {
        padding: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    actionButton: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    actionText: {
        fontSize: 12,
        color: '#555',
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
        width: 80,
        height: 80,
        borderRadius: 5,
        position: 'relative',
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
        borderRadius: 5,
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
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    memberInfo: {
        flex: 1,
        marginLeft: 10,
    },
    memberName: {
        fontSize: 16,
    },
    mutedText: {
        fontSize: 12,
        color: '#ff3b30',
    },
    memberActions: {
        flexDirection: 'row',
    },
    memberActionButton: {
        padding: 8,
        marginLeft: 5,
    },
    addMemberButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0084ff',
        padding: 12,
        margin: 15,
        borderRadius: 5,
    },
    addMemberText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '500',
    },
    mediaViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeMediaButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 10,
    },
    fullSizeMedia: {
        width: '100%',
        height: '80%',
    },
});

export default ChatDetailsModal;
