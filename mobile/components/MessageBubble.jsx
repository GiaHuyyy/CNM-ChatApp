import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image, Modal, SafeAreaView, Dimensions, Platform, Alert, Linking } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
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
  isGroupChat = false,
  showTime = true
}) => {
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

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

  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const videoRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

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
      Linking.openURL(message.fileUrl)
        .catch(err => {
          console.error("Error opening URL:", err);
          Alert.alert("Lỗi", "Không thể mở tài liệu này");
          setShowDocumentModal(true);
        });
    } catch (error) {
      console.error("Error in handleDocumentView:", error);
      setShowDocumentModal(true);
    }
  };

  const handleLongPress = () => {
    if (isCurrentUser && !message.isDeleted) {
      setIsLongPressed(true);
      setShowMessageOptions(true);
    }
  };

  const renderDocumentPreview = () => (
    <TouchableOpacity
      onPress={handleDocumentView}
      className="mb-2 flex-row items-center p-2 bg-white bg-opacity-40 rounded-lg shadow-sm"
    >
      <View className="w-10 h-10 rounded-lg bg-white bg-opacity-70 flex items-center justify-center mr-2">
        <FontAwesomeIcon
          icon={getFileIcon(message.fileName)}
          size={20}
          color={isCurrentUser ? "#2563eb" : "#333"}
        />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-medium ${isCurrentUser ? 'text-white' : 'text-gray-800'}`} numberOfLines={1}>
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
      <View className="flex justify-center my-2 px-4">
        <View className="bg-white rounded-full px-3 py-0.5 self-center shadow-sm">
          <Text className="text-xs text-gray-500">{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex ${isCurrentUser ? 'items-end' : 'items-start'} mb-1.5 mx-2`}>
      {!isCurrentUser && (
        <Image
          source={{ uri: userProfilePic }}
          className="h-7 w-7 rounded-full mr-1 mb-1 self-end"
        />
      )}

      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        onPressOut={() => setIsLongPressed(false)}
      >
        <View
          className={`max-w-[75%] p-2.5 ${isCurrentUser
            ? 'bg-blue-500 rounded-t-lg rounded-bl-lg rounded-br-sm'
            : 'bg-gray-100 rounded-t-lg rounded-br-lg rounded-bl-sm'
            }`}
          style={{
            backgroundColor: isLongPressed
              ? (isCurrentUser ? '#0074e0' : '#e2e2e2')
              : (isCurrentUser ? '#0084ff' : '#f0f0f0'),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 1,
          }}
        >
          {isGroupChat && !isCurrentUser && senderName && (
            <Text className="text-xs font-semibold text-blue-600 mb-1">{senderName}</Text>
          )}

          {hasImage && (
            <TouchableOpacity
              onPress={handleImageView}
              className="mb-2 overflow-hidden rounded-md"
            >
              <Image
                source={{ uri: message.imageUrl }}
                style={{ width: 200, height: 150, borderRadius: 6 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {hasVideo && (
            <TouchableOpacity
              onPress={handleVideoView}
              className="mb-2 relative overflow-hidden rounded-md"
            >
              <Video
                source={{ uri: message.fileUrl }}
                style={{ width: 200, height: 150, borderRadius: 6 }}
                useNativeControls={false}
                resizeMode="cover"
                shouldPlay={false}
              />
              <View className="absolute inset-0 justify-center items-center bg-black bg-opacity-30 rounded-md">
                <View className="w-12 h-12 rounded-full bg-black bg-opacity-60 flex items-center justify-center">
                  <FontAwesomeIcon icon={faPlay} size={24} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {hasDocument && renderDocumentPreview()}

          {message.text && (
            <Text className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
              {message.text}
            </Text>
          )}

          {showTime && (
            <Text className={`text-[10px] mt-1 ${isCurrentUser ? 'text-white/80' : 'text-gray-500'}`}>
              {format(new Date(message.createdAt), 'HH:mm', { locale: vi })}
              {message.isEdited && <Text className="italic text-[9px] ml-1">(Đã chỉnh sửa)</Text>}
            </Text>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <View className="absolute -bottom-4 right-2 bg-white rounded-full px-1.5 py-0.5 shadow-sm flex-row">
              {message.reactions.map((reaction, index) => (
                <Text key={`${reaction.userId}-${index}`} className="text-xs">{reaction.emoji}</Text>
              ))}
            </View>
          )}
        </View>
      </Pressable>

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
                if (onDeleteMessage) {
                  onDeleteMessage(message._id);
                  setShowMessageOptions(false);
                }
              }}
            >
              <FontAwesomeIcon icon={faTrash} size={16} color="#ff4444" className="mr-3" />
              <Text className="text-[15px]">Xóa tin nhắn</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  onReaction: PropTypes.func,
  userProfilePic: PropTypes.string.isRequired,
  onEditMessage: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onImagePress: PropTypes.func,
  onVideoPress: PropTypes.func,
  senderName: PropTypes.string,
  isGroupChat: PropTypes.bool,
  showTime: PropTypes.bool
};

export default MessageBubble;