import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image, Modal, SafeAreaView, Dimensions, Platform, Linking, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faThumbsUp } from '@fortawesome/free-regular-svg-icons';
import {
  faEllipsisVertical,
  faQuoteRight,
  faShare,
  faPencil,
  faTrash,
  faPlay,
  faFileAlt,
  faFilePdf,
  faFileWord,
  faFileImage,
  faFileVideo,
  faTimes,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import { Video } from 'expo-av';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ConfirmationModal from './ConfirmationModal';

// Common emoji reactions
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageBubble = ({
  message,
  isCurrentUser,
  onReaction,
  userProfilePic,
  onEditMessage,
  onDeleteMessage,
  onImagePress,
  onVideoPress,
  onDocumentPress,
  senderName = "",
  isGroupChat = false,
  showTime = true,
  forceImageUpdate = false
}) => {
  // Action menu state
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  // Add new state for emoji reaction popup
  const [showReactionSelector, setShowReactionSelector] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });

  // Add local state to track reactions for immediate UI updates
  const [localReactions, setLocalReactions] = useState(message.reactions || []);

  // Media modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Add state to track image loading
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Refs
  const videoRef = useRef(null);
  const actionMenuTimer = useRef(null);
  const messageRef = useRef(null);

  // Update local reactions when message reactions change from props
  useEffect(() => {
    setLocalReactions(message.reactions || []);
  }, [message.reactions]);

  // Extract the correct image URL based on both old and new schemas
  useEffect(() => {
    let url = '';

    console.log(`Processing message ${message._id} files:`, {
      hasFilesArray: !!message.files && Array.isArray(message.files),
      filesLength: message.files?.length || 0,
      firstFileUrl: message.files?.[0]?.url || 'none',
      firstFileType: message.files?.[0]?.type || 'unknown',
      imageUrl: message.imageUrl || 'none',
      fileUrl: message.fileUrl || 'none'
    });

    if (message.imageUrl) {
      url = message.imageUrl;
    } else if (message.files && message.files.length > 0) {
      // Look for image files in the files array
      const imageFile = message.files.find(file =>
        (file.type && file.type.startsWith('image/')) ||
        (file.url && (
          file.url.endsWith('.jpg') ||
          file.url.endsWith('.jpeg') ||
          file.url.endsWith('.png') ||
          file.url.endsWith('.gif') ||
          file.url.endsWith('.webp')
        ))
      );

      if (imageFile) {
        url = imageFile.url;
        console.log(`Found image in files array: ${url}`);
      }
    }

    if (url) {
      setImageUrl(url);
      console.log(`Set image URL for message ${message._id}:`, url);
    }
  }, [message]);

  // Reset image state when image URL changes
  useEffect(() => {
    if (imageUrl) {
      console.log(`Processing image URL for message ${message._id}:`, imageUrl);
      setImageLoaded(false);
      setImageError(false);

      if (Platform.OS === "web" && typeof window !== 'undefined') {
        try {
          const img = new window.Image();
          img.onload = () => {
            console.log("Image loaded successfully:", imageUrl);
            setImageLoaded(true);
          };
          img.onerror = (error) => {
            console.error("Error loading image:", error);
            setImageError(true);
          };
          img.src = imageUrl;
        } catch (error) {
          console.error("Error preloading image:", error);
          setImageError(true);
        }
      }
    }
  }, [imageUrl, forceImageUpdate]);

  // Screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Content type detection - improve with better file detection
  const hasImage = message.imageUrl ||
    (message.files && message.files.some(file =>
      (file.type && file.type.startsWith('image/')) ||
      (file.url && (
        file.url.endsWith('.jpg') ||
        file.url.endsWith('.jpeg') ||
        file.url.endsWith('.png') ||
        file.url.endsWith('.gif') ||
        file.url.endsWith('.webp')
      ))
    ));

  const hasVideo = (message.files && message.files.some(file =>
    (file.type && file.type.startsWith('video/')) ||
    (file.url && file.url.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i))
  )) || (message.fileUrl && message.fileUrl.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i));

  const hasDocument = (message.files && message.files.some(file =>
    (file.type && !file.type.startsWith('image/') && !file.type.startsWith('video/')) ||
    (file.url && !file.url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mkv|m4v)$/i))
  )) || (message.fileUrl && !hasVideo && !message.imageUrl);

  const hasFile = hasImage || hasVideo || hasDocument;

  const getFileDetails = () => {
    // Try to get from files array first
    if (message.files && message.files.length > 0) {
      const file = message.files[0];  // Use first file
      console.log("File details from files array:", {
        url: file.url || 'missing',
        name: file.name || 'Unnamed file',
        type: file.type || 'unknown'
      });

      return {
        url: file.url,
        name: file.name || 'Unnamed file',
        type: file.type || inferFileTypeFromUrl(file.url)
      };
    }

    // Fallback to older format
    const inferredType = message.fileUrl ? inferFileTypeFromUrl(message.fileUrl) :
      (message.imageUrl ? 'image/jpeg' : 'application/octet-stream');

    console.log("Fallback file details:", {
      url: message.fileUrl || message.imageUrl || 'none',
      name: message.fileName || 'Unnamed file',
      type: inferredType
    });

    return {
      url: message.fileUrl || message.imageUrl,
      name: message.fileName || 'Unnamed file',
      type: inferredType
    };
  };

  // Helper function to infer file type from URL
  const inferFileTypeFromUrl = (url) => {
    if (!url) return 'application/octet-stream';

    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return 'image/jpeg';
    } else if (url.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i)) {
      return 'video/mp4';
    } else if (url.match(/\.(pdf)$/i)) {
      return 'application/pdf';
    } else if (url.match(/\.(doc|docx)$/i)) {
      return 'application/msword';
    }

    return 'application/octet-stream';
  };

  const fileDetails = hasFile ? getFileDetails() : null;

  const isSystemMessage = message.text && (
    message.text.includes("đã tạo nhóm") ||
    message.text.includes("đã thêm") ||
    message.text.includes("vào nhóm") ||
    message.text.includes("đã rời khỏi nhóm") ||
    message.text.includes("đã xóa")
  );

  // Clean up timers
  useEffect(() => {
    return () => {
      if (actionMenuTimer.current) {
        clearTimeout(actionMenuTimer.current);
      }
    };
  }, []);

  // Action handlers
  const handleQuickLike = (messageId) => {
    if (onReaction) {
      onReaction(messageId, '👍');

      // Immediately update UI with the reaction
      addLocalReaction('👍');
    }
  };

  // Function to add reaction to local state for immediate UI update
  const addLocalReaction = (emoji) => {
    const userReactionIndex = localReactions.findIndex(
      r => r.emoji === emoji && r.userId === 'currentUser'
    );

    if (userReactionIndex >= 0) {
      setLocalReactions(prev => prev.filter((_, index) => index !== userReactionIndex));
    } else {
      setLocalReactions(prev => [
        ...prev,
        { emoji, userId: 'currentUser' }
      ]);
    }
  };

  const handleLongPress = (event) => {
    if (messageRef.current && messageRef.current.measureInWindow) {
      messageRef.current.measureInWindow((x, y, width, height) => {
        const position = {
          x: x,
          y: y - 50,
        };
        setReactionPosition(position);
        setShowReactionSelector(true);
      });
    } else {
      setShowReactionSelector(true);
    }

    if (isCurrentUser && !message.isDeleted) {
      setIsLongPressed(true);
    }
  };

  const handleReactionSelect = (emoji) => {
    if (onReaction) {
      onReaction(message._id, emoji);

      addLocalReaction(emoji);
    }
    setShowReactionSelector(false);
  };

  const handleShowMessageOptions = () => {
    setShowReactionSelector(false);
    setShowMessageOptions(true);
  };

  const [confirmationModal, setConfirmationModal] = useState({
    visible: false,
    messageId: null
  });

  const handleDeleteMessageWithConfirmation = (messageId) => {
    console.log("Delete message requested for ID:", messageId);

    if (!messageId || !onDeleteMessage) {
      console.error("Cannot delete message: ", !messageId ? "No message ID" : "No delete handler");
      return;
    }

    setConfirmationModal({
      visible: true,
      messageId: messageId
    });
  };

  const handleConfirmDelete = () => {
    const messageId = confirmationModal.messageId;
    console.log("Confirmed deletion for message:", messageId);

    if (onDeleteMessage && messageId) {
      onDeleteMessage(messageId);
      console.log("Delete function called");
    }

    setConfirmationModal({ visible: false, messageId: null });
    setShowMessageOptions(false);
  };

  const handleCancelDelete = () => {
    setConfirmationModal({ visible: false, messageId: null });
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return faFileAlt;

    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'pdf':
        return faFilePdf;
      case 'doc':
      case 'docx':
        return faFileWord;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return faFileImage;
      case 'mp4':
      case 'mov':
      case 'webm':
      case 'avi':
      case 'mkv':
        return faFileVideo;
      default:
        return faFileAlt;
    }
  };

  const handleImageView = () => {
    if (onImagePress) {
      onImagePress(imageUrl);
    } else {
      setShowImageModal(true);
    }
  };

  const renderMessageContent = () => {
    return (
      <>
        {isGroupChat && !isCurrentUser && senderName ? (
          <Text className="text-xs font-semibold text-blue-600 mb-1">{senderName}</Text>
        ) : null}

        {/* Render multiple images */}
        {message.files && message.files.filter(file =>
          file.type?.startsWith('image/') ||
          file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ).map((file, index) => (
          <TouchableOpacity
            key={`img-${index}`}
            onPress={() => onImagePress && onImagePress(file.url)}
            className="mb-2"
          >
            <Image
              source={{
                uri: file.url,
                ...(forceImageUpdate && { cache: 'reload' })
              }}
              className="rounded-lg max-w-[240px]"
              style={{
                width: 240,
                height: 200,
                resizeMode: 'cover'
              }}
            />
          </TouchableOpacity>
        ))}

        {/* Fallback for legacy imageUrl */}
        {hasImage && !message.files && (
          <TouchableOpacity
            onPress={() => onImagePress && onImagePress(fileDetails?.url)}
            className="mb-2"
          >
            <Image
              source={{
                uri: fileDetails?.url,
                ...(forceImageUpdate && { cache: 'reload' })
              }}
              className="rounded-lg max-w-[240px]"
              style={{
                width: 240,
                height: 200,
                resizeMode: 'cover'
              }}
            />
          </TouchableOpacity>
        )}

        {/* Render multiple videos */}
        {message.files && message.files.filter(file =>
          file.type?.startsWith('video/') ||
          file.url?.match(/\.(mp4|mov|avi|webm|mkv)$/i)
        ).map((file, index) => (
          <TouchableOpacity
            key={`vid-${index}`}
            onPress={() => onVideoPress && onVideoPress(file.url)}
            className="mb-2 rounded-md overflow-hidden"
          >
            <View style={{ width: 240, height: 180 }} className="bg-black flex items-center justify-center rounded-md">
              <FontAwesomeIcon icon={faPlay} size={30} color="rgba(255,255,255,0.8)" />
              <Text className="mt-2 text-white text-xs" numberOfLines={1}>
                {file.name || "Video"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Fallback for legacy video */}
        {hasVideo && !message.files && (
          <TouchableOpacity
            onPress={() => onVideoPress && onVideoPress(fileDetails?.url)}
            className="mb-2 rounded-md overflow-hidden"
          >
            <View style={{ width: 240, height: 180 }} className="bg-black flex items-center justify-center rounded-md">
              <FontAwesomeIcon icon={faPlay} size={30} color="rgba(255,255,255,0.8)" />
              <Text className="mt-2 text-white text-xs" numberOfLines={1}>
                {fileDetails?.name || "Video"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Render multiple documents */}
        {message.files && message.files.filter(file =>
          (!file.type?.startsWith('image/') && !file.type?.startsWith('video/')) ||
          (!file.url?.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mkv)$/i))
        ).map((file, index) => (
          <TouchableOpacity
            key={`doc-${index}`}
            onPress={() => onDocumentPress && onDocumentPress(file.url, file.name || "Document")}
            className="mb-2 p-3 bg-gray-100 rounded-md flex-row items-center"
          >
            <FontAwesomeIcon icon={getFileIcon(file.name)} size={20} color="#555" />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {file.name || "Document"}
              </Text>
              <Text className="text-xs text-gray-500">
                Document
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Fallback for legacy document */}
        {hasFile && !hasVideo && !hasImage && !message.files && (
          <TouchableOpacity
            onPress={() => onDocumentPress && onDocumentPress(fileDetails?.url, fileDetails?.name)}
            className="mb-2 p-3 bg-gray-100 rounded-md flex-row items-center"
          >
            <FontAwesomeIcon icon={faFileAlt} size={20} color="#555" />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {fileDetails?.name || "Document"}
              </Text>
              <Text className="text-xs text-gray-500">
                Document
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {message.text ? (
          <Text className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
            {message.text}
          </Text>
        ) : null}

        {showTime ? (
          <Text className={`text-xs mt-1 ${isCurrentUser ? 'text-white/80' : 'text-gray-500'}`}>
            {format(new Date(message.createdAt), 'HH:mm', { locale: vi })}
            {message.isEdited ? " (Đã chỉnh sửa)" : ""}
          </Text>
        ) : null}
      </>
    );
  };

  if (isSystemMessage) {
    return (
      <View className="flex justify-center my-2 px-4">
        <View className="bg-white rounded-full px-3 py-1 self-center shadow-sm">
          <Text className="text-xs text-gray-500">{message.text}</Text>
        </View>
      </View>
    );
  }

  const groupedReactions = localReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {});

  return (
    <View className="flex-row items-start mb-2 mx-1">
      {!isCurrentUser && (
        <Image
          source={{ uri: userProfilePic }}
          className="h-8 w-8 rounded-full mr-2 self-end"
        />
      )}

      <View className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <Pressable
          ref={messageRef}
          onLongPress={handleLongPress}
          delayLongPress={500}
          onPressOut={() => setIsLongPressed(false)}
        >
          <View
            className={`rounded-lg ${isCurrentUser
              ? 'bg-blue-500 rounded-tr-sm'
              : 'bg-gray-100 rounded-tl-sm'
              } px-3 py-2 max-w-[100%]`}
            style={{
              backgroundColor: isLongPressed
                ? (isCurrentUser ? '#0074e0' : '#e2e2e2')
                : (isCurrentUser ? '#0084ff' : '#f0f0f0'),
            }}
          >
            {renderMessageContent()}
          </View>
        </Pressable>

        {localReactions && localReactions.length > 0 && (
          <View className={`flex-row mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, users], index) => (
              <TouchableOpacity
                key={`${emoji}-${index}`}
                className="bg-white rounded-full shadow-sm px-2 py-1 mr-1 flex-row items-center"
                onPress={() => handleReactionSelect(emoji)}
              >
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                <Text className="text-xs text-gray-600 ml-1">{users.length}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Reaction selector modal */}
      <Modal
        transparent={true}
        visible={showReactionSelector}
        animationType="fade"
        onRequestClose={() => setShowReactionSelector(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
          activeOpacity={1}
          onPress={() => setShowReactionSelector(false)}
        >
          <View
            className="absolute bg-white rounded-full py-2 px-1 shadow-lg flex-row"
            style={{
              left: reactionPosition.x,
              top: reactionPosition.y,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            }}
          >
            {EMOJI_REACTIONS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleReactionSelect(emoji)}
                className="mx-2 items-center justify-center"
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}

            {isCurrentUser && !message.isDeleted && (
              <TouchableOpacity
                className="ml-2 bg-gray-200 rounded-full w-10 h-10 items-center justify-center"
                onPress={handleShowMessageOptions}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} size={16} color="#555" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message options modal */}
      <Modal
        transparent={true}
        visible={showMessageOptions}
        animationType="fade"
        onRequestClose={() => setShowMessageOptions(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowMessageOptions(false)}
        >
          <View className="bg-white rounded-lg w-[250px] overflow-hidden">
            <Text className="text-center py-3 text-lg font-semibold border-b border-gray-200">
              Tùy chọn tin nhắn
            </Text>

            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
              onPress={() => {
                if (onEditMessage) {
                  onEditMessage(message);
                  setShowMessageOptions(false);
                }
              }}
            >
              <FontAwesomeIcon icon={faPencil} size={16} color="#0084ff" className="mr-3" />
              <Text className="text-[15px]">Chỉnh sửa tin nhắn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                console.log("Delete button pressed for message:", message._id);
                if (message._id) {
                  handleDeleteMessageWithConfirmation(message._id);
                } else {
                  console.error("Message has no ID");
                }
              }}
            >
              <FontAwesomeIcon icon={faTrash} size={16} color="#ff4444" className="mr-3" />
              <Text className="text-[15px] text-red-500">Xóa tin nhắn</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation modal */}
      <ConfirmationModal
        visible={confirmationModal.visible}
        title="Xóa tin nhắn"
        message="Bạn có chắc chắn muốn xóa tin nhắn này không?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        type="danger"
      />

      {/* Image modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <SafeAreaView className="flex-1 bg-black bg-opacity-95 justify-center items-center">
          <TouchableOpacity
            className="absolute top-10 right-5 z-10 p-2"
            onPress={() => setShowImageModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: imageUrl }}
            className="w-full h-3/4"
            resizeMode="contain"
          />

          <TouchableOpacity
            className="mt-5 flex-row items-center bg-blue-500 px-4 py-2 rounded-full"
            onPress={() => Linking.openURL(imageUrl)}
          >
            <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
            <Text className="text-white font-semibold">Tải xuống</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Document modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDocumentModal}
        onRequestClose={() => setShowDocumentModal(false)}
      >
        <SafeAreaView className="flex-1 bg-black bg-opacity-90 justify-center items-center">
          <View className="bg-white w-4/5 rounded-xl p-6">
            <TouchableOpacity
              className="absolute top-2 right-2"
              onPress={() => setShowDocumentModal(false)}
            >
              <FontAwesomeIcon icon={faTimes} size={18} color="#555" />
            </TouchableOpacity>

            <View className="items-center p-4">
              <FontAwesomeIcon
                icon={getFileIcon(fileDetails?.name || message.fileName)}
                size={60}
                color="#2563eb"
              />
              <Text className="text-lg font-bold mt-4 text-center">
                {fileDetails?.name || message.fileName || "Document"}
              </Text>
              <Text className="text-sm text-gray-500 mb-6">
                Không thể hiển thị trực tiếp tài liệu này
              </Text>

              <TouchableOpacity
                className="flex-row items-center bg-blue-500 px-6 py-3 rounded-full mb-2"
                onPress={() => {
                  const fileUrl = fileDetails?.url || message.fileUrl;
                  if (!fileUrl) {
                    Alert.alert("Lỗi", "Không tìm thấy đường dẫn tập tin");
                    return;
                  }

                  Linking.openURL(fileUrl)
                    .catch(err => {
                      console.error("Error opening URL:", err);
                      Alert.alert("Lỗi", "Không thể mở tài liệu này");
                    });
                }}
              >
                <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
                <Text className="text-white font-semibold">Tải xuống</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    text: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    isEdited: PropTypes.bool,
    imageUrl: PropTypes.string,
    fileUrl: PropTypes.string,
    fileName: PropTypes.string,
    msgByUserId: PropTypes.string.isRequired,
    reactions: PropTypes.arrayOf(
      PropTypes.shape({
        emoji: PropTypes.string.isRequired,
        userId: PropTypes.string.isRequired,
      })
    ),
    files: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string.isRequired,
        type: PropTypes.string,
      })
    ),
  }).isRequired,
  isCurrentUser: PropTypes.bool.isRequired,
  onReaction: PropTypes.func,
  userProfilePic: PropTypes.string.isRequired,
  onEditMessage: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onImagePress: PropTypes.func,
  onVideoPress: PropTypes.func,
  onDocumentPress: PropTypes.func,
  senderName: PropTypes.string,
  isGroupChat: PropTypes.bool,
  showTime: PropTypes.bool,
  forceImageUpdate: PropTypes.bool
};

export default MessageBubble;