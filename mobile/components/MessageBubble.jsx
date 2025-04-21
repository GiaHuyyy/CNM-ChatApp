import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image, Animated, Linking, Modal, SafeAreaView, Dimensions, Platform, Alert, Clipboard } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faFaceSmile,
  faThumbsUp
} from '@fortawesome/free-regular-svg-icons';
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
  faDownload,
  faExpand
} from '@fortawesome/free-solid-svg-icons';
import EmojiReactionPicker from './EmojiReactionPicker';
import { Video } from 'expo-av';

const MessageBubble = ({
  message,
  isCurrentUser,
  onReaction,
  userProfilePic,
  onEditMessage,
  onDeleteMessage,
  onImagePress,
  onVideoPress,
  senderName = "",
  isGroupChat = false
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const emojiPickerAnim = useRef(new Animated.Value(0)).current;

  const toggleEmojiPicker = (show) => {
    if (emojiPickerTimer.current) {
      clearTimeout(emojiPickerTimer.current);
    }

    if (show) {
      setShowEmojiPicker(true);
      Animated.spring(emojiPickerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      Animated.timing(emojiPickerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        setShowEmojiPicker(false);
      });
    }
  };

  const emojiPickerTimer = useRef(null);
  const actionMenuTimer = useRef(null);

  const handleEmojiSelect = (emojiData) => {
    if (onReaction && message._id) {
      onReaction(message._id, emojiData.emoji);
    }
    toggleEmojiPicker(false);
  };

  const handleQuickLike = (messageId) => {
    if (onReaction) {
      onReaction(messageId, '👍');
    }
  };

  const handleShowActionMenu = () => {
    if (actionMenuTimer.current) {
      clearTimeout(actionMenuTimer.current);
    }
    setShowActionMenu(true);
  };

  const handleHideActionMenu = () => {
    actionMenuTimer.current = setTimeout(() => {
      setShowActionMenu(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (emojiPickerTimer.current) {
        clearTimeout(emojiPickerTimer.current);
      }
      if (actionMenuTimer.current) {
        clearTimeout(actionMenuTimer.current);
      }
    };
  }, []);

  const getFileIcon = (fileName) => {
    if (!fileName) return faFileAlt;

    const extension = fileName.split('.').pop().toLowerCase();

    switch (extension) {
      case 'pdf':
        return faFilePdf;
      case 'doc':
      case 'docx':
        return faFileWord;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return faFileImage;
      case 'mp4':
      case 'mov':
      case 'webm':
        return faFileVideo;
      default:
        return faFileAlt;
    }
  };

  const hasImage = message.imageUrl && message.imageUrl.length > 0;
  const hasVideo = message.fileUrl &&
    (message.fileUrl.endsWith('.mp4') ||
      message.fileUrl.endsWith('.mov') ||
      message.fileUrl.endsWith('.webm'));
  const hasDocument = message.fileUrl && !hasVideo &&
    (message.fileUrl.endsWith('.pdf') ||
      message.fileUrl.endsWith('.doc') ||
      message.fileUrl.endsWith('.docx'));
  const hasFile = hasImage || hasVideo || hasDocument;

  const isSystemMessage = message.text && (
    message.text.includes("đã tạo nhóm") ||
    message.text.includes("đã thêm") ||
    message.text.includes("vào nhóm") ||
    message.text.includes("đã rời khỏi nhóm") ||
    message.text.includes("đã xóa")
  );

  const containerClass = isCurrentUser
    ? 'flex-row-reverse'
    : 'flex-row';

  const bubbleClass = isCurrentUser
    ? 'bg-[#ebecf0] rounded-t-2xl rounded-bl-2xl rounded-br-md ml-2'
    : 'bg-gray-200 rounded-t-2xl rounded-br-2xl rounded-bl-md mr-2';

  const textClass = isCurrentUser
    ? 'text-black'
    : 'text-gray-800';

  const mediaWidthClass = hasFile ? 'min-w-[150px]' : '';

  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const videoRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const handleImageView = () => {
    if (onImagePress) {
      onImagePress(message.imageUrl);
    } else {
      setShowImageModal(true);
    }
  };

  const handleVideoView = () => {
    if (onVideoPress) {
      onVideoPress(message.fileUrl);
    } else {
      setShowVideoModal(true);
    }
  };

  const handleDocumentView = () => {
    try {
      Linking.canOpenURL(message.fileUrl)
        .then(supported => {
          if (supported) {
            return Linking.openURL(message.fileUrl);
          } else {
            console.log("Cannot open URL:", message.fileUrl);
            Alert.alert(
              "Không thể mở tài liệu",
              "Ứng dụng không thể mở URL này. Bạn có muốn sao chép liên kết không?",
              [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Sao chép",
                  onPress: () => {
                    if (Clipboard && Clipboard.setString) {
                      Clipboard.setString(message.fileUrl);
                      Alert.alert("Thành công", "Đã sao chép liên kết vào clipboard");
                    }
                  }
                }
              ]
            );
          }
        })
        .catch(err => {
          console.error("Error opening document URL:", err);
          setShowDocumentModal(true);
        });
    } catch (error) {
      console.error("Error in handleDocumentView:", error);
      setShowDocumentModal(true);
    }
  };

  const renderDocumentPreview = () => (
    <TouchableOpacity
      onPress={handleDocumentView}
      className="mb-2 flex-row items-center p-2 bg-white bg-opacity-30 rounded-md"
    >
      <View className="w-10 h-10 rounded-md bg-white bg-opacity-50 flex items-center justify-center mr-2">
        <FontAwesomeIcon
          icon={getFileIcon(message.fileName)}
          size={20}
          color={isCurrentUser ? "#fff" : "#333"}
        />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-medium ${textClass}`} numberOfLines={1}>
          {message.fileName || "Document"}
        </Text>
        <Text className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
          Nhấn để tải xuống
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isSystemMessage) {
    return (
      <View className="flex justify-center my-3 px-4">
        <View className="bg-white rounded-full px-3 py-1 self-center shadow-sm">
          <Text className="text-xs text-gray-500">{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 px-4">
      <View className={`${containerClass} items-end`}>
        {!isCurrentUser && (
          <Image
            source={{ uri: userProfilePic }}
            className="h-8 w-8 rounded-full"
          />
        )}

        <View className={`max-w-[75%] relative ${hasFile ? mediaWidthClass : ''}`}>
          <Pressable
            onPressIn={() => setHoveredMessage(message._id)}
            onPressOut={() => setHoveredMessage(null)}
            onHoverIn={handleShowActionMenu}
            onHoverOut={handleHideActionMenu}
            className={`
              relative px-4 py-2
              ${bubbleClass}
            `}
          >
            {isGroupChat && !isCurrentUser && senderName && (
              <Text className="text-xs font-semibold text-blue-600 mb-1">{senderName}</Text>
            )}

            {hasImage && (
              <TouchableOpacity
                onPress={handleImageView}
                className="mb-2"
              >
                <Image
                  source={{ uri: message.imageUrl }}
                  className="w-full h-[200px] rounded-md"
                  resizeMode="cover"
                />
                <View className="absolute bottom-2 right-2 p-1 bg-black bg-opacity-50 rounded-full">
                  <FontAwesomeIcon icon={faExpand} size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {hasVideo && (
              <TouchableOpacity
                onPress={handleVideoView}
                className="mb-2 relative"
              >
                <Video
                  source={{ uri: message.fileUrl }}
                  className="w-full h-[200px] rounded-md"
                  useNativeControls={false}
                  resizeMode="cover"
                  shouldPlay={false}
                />
                <View className="absolute inset-0 flex items-center justify-center">
                  <View className="w-12 h-12 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faPlay} size={20} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {hasDocument && renderDocumentPreview()}

            {message.text && (
              <Text className={`text-base ${textClass}`}>
                {message.text}
              </Text>
            )}

            <Text className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-500' : 'text-gray-500'}`}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {message.isEdited && (
                <Text className="ml-1 text-[10px] italic">(Đã chỉnh sửa)</Text>
              )}
            </Text>

            {message.reactions && message.reactions.length > 0 && (
              <View className="absolute -bottom-5 right-2 bg-white rounded-full px-2 py-1 shadow-sm flex-row">
                {message.reactions.map((reaction, index) => (
                  <Text key={`${reaction.userId}-${index}`} className="text-sm">{reaction.emoji}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleQuickLike(message._id)}
              onLongPress={() => toggleEmojiPicker(true)}
              className={`
                absolute -bottom-2 -right-2 
                flex-row items-center gap-x-1 
                rounded-full bg-white px-1 py-[3px]
              `}
            >
              <FontAwesomeIcon
                icon={faThumbsUp}
                size={14}
                color="#8b8b8b"
              />
            </TouchableOpacity>

            {showActionMenu && isCurrentUser && (
              <View
                className={`
                  absolute ${isCurrentUser ? '-left-20' : '-right-20'} 
                  top-1/2 -translate-y-1/2
                  flex-row items-center gap-x-1
                `}
              >
                <TouchableOpacity
                  className="p-2 bg-white rounded-full shadow-sm"
                  onPress={() => {
                    onEditMessage && onEditMessage(message);
                    setShowActionMenu(false);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPencil}
                    size={14}
                    color="#666"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-2 bg-white rounded-full shadow-sm"
                  onPress={() => {
                    onDeleteMessage && onDeleteMessage(message._id);
                    setShowActionMenu(false);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faTrash}
                    size={14}
                    color="#ff4444"
                  />
                </TouchableOpacity>
              </View>
            )}
          </Pressable>

          {showEmojiPicker && (
            <Animated.View
              className={`
                absolute z-50 
                ${isCurrentUser ? 'right-0' : 'left-0'} 
                bottom-full mb-2
              `}
              style={{
                transform: [{
                  scale: emojiPickerAnim
                }],
                opacity: emojiPickerAnim
              }}
            >
              <EmojiReactionPicker
                onSelectEmoji={handleEmojiSelect}
              />
            </Animated.View>
          )}
        </View>
      </View>

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
            source={{ uri: message.imageUrl }}
            className="w-full h-3/4"
            resizeMode="contain"
          />

          <TouchableOpacity
            className="mt-5 flex-row items-center bg-blue-500 px-4 py-2 rounded-full"
            onPress={() => Linking.openURL(message.imageUrl)}
          >
            <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
            <Text className="text-white font-semibold">Tải xuống</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showVideoModal}
        onRequestClose={() => setShowVideoModal(false)}
      >
        <SafeAreaView className="flex-1 bg-black bg-opacity-95 justify-center items-center">
          <TouchableOpacity
            className="absolute top-10 right-5 z-10 p-2"
            onPress={() => setShowVideoModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
          </TouchableOpacity>

          <View className="w-full h-3/4 justify-center items-center">
            <Video
              ref={videoRef}
              source={{ uri: message.fileUrl }}
              style={{ width: screenWidth * 0.9, height: screenHeight * 0.5 }}
              useNativeControls
              resizeMode="contain"
              shouldPlay={true}
              isLooping={false}
            />
          </View>

          <TouchableOpacity
            className="mt-5 flex-row items-center bg-blue-500 px-4 py-2 rounded-full"
            onPress={() => Linking.openURL(message.fileUrl)}
          >
            <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
            <Text className="text-white font-semibold">Tải xuống</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

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
                icon={getFileIcon(message.fileName)}
                size={60}
                color="#2563eb"
              />
              <Text className="text-lg font-bold mt-4 text-center">{message.fileName || "Document"}</Text>
              <Text className="text-sm text-gray-500 mb-6">Không thể hiển thị trực tiếp tài liệu này</Text>

              <TouchableOpacity
                className="flex-row items-center bg-blue-500 px-6 py-3 rounded-full mb-2"
                onPress={() => {
                  Linking.openURL(message.fileUrl)
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
  }).isRequired,
  isCurrentUser: PropTypes.bool.isRequired,
  onReaction: PropTypes.func.isRequired,
  userProfilePic: PropTypes.string.isRequired,
  onEditMessage: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onImagePress: PropTypes.func,
  onVideoPress: PropTypes.func,
  senderName: PropTypes.string,
  isGroupChat: PropTypes.bool
};

export default MessageBubble;