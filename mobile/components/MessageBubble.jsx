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
  faDownload,
  faReply
} from '@fortawesome/free-solid-svg-icons';
import { Video } from 'expo-av';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  onReply,
  onReplyClick, // Add new prop for handling clicks on reply references
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
    // Instead of positioning relative to message, center on screen
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Center in the screen
    const posX = screenWidth / 2;
    const posY = screenHeight / 2;

    setReactionPosition({ x: posX, y: posY });
    setShowReactionSelector(true);

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

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    setShowReactionSelector(false);
  };

  const handleShowMessageOptions = () => {
    setShowReactionSelector(false);
    setShowMessageOptions(true);
  };

  const handleDeleteMessageWithConfirmation = (messageId) => {
    console.log("Delete message requested for ID:", messageId);

    // Added more debugging to verify the message ID and delete handler
    if (!messageId) {
      console.error("Cannot delete message: No message ID provided");
      Alert.alert("Lỗi", "Không thể xoá tin nhắn (ID không xác định)");
      return;
    }

    if (!onDeleteMessage) {
      console.error("Cannot delete message: No delete handler provided");
      Alert.alert("Lỗi", "Chức năng xoá tin nhắn không khả dụng");
      return;
    }

    // Use a timeout to ensure Alert is displayed properly
    setTimeout(() => {
      Alert.alert(
        "Xóa tin nhắn",
        "Bạn có chắc chắn muốn xóa tin nhắn này không?",
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () => {
              console.log("Delete confirmed for message ID:", messageId);

              try {
                // Call the delete handler and pass the message ID
                onDeleteMessage(messageId);
                console.log("Delete function called successfully");

                // Close the options modal
                setShowMessageOptions(false);

                // Show confirmation to user
                setTimeout(() => {
                  Alert.alert("Thành công", "Tin nhắn đã được xoá");
                }, 300);
              } catch (error) {
                console.error("Error deleting message:", error);
                Alert.alert("Lỗi", "Không thể xoá tin nhắn. Vui lòng thử lại.");
              }
            }
          }
        ]
      );
    }, 100);
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
    // Helper function to chunk array into groups of specified size
    const chunkArray = (arr, size) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );
    };

    // Helper function to get clean display filename
    const getDisplayName = (file) => {
      if (!file) return "File";

      // Use name property directly if available - this should be the original name
      if (file.name) return file.name;

      // Otherwise try to get a filename from the URL
      if (file.url) {
        const urlParts = file.url.split('/');
        const lastPart = urlParts[urlParts.length - 1];

        // Remove any query parameters
        const cleanName = lastPart.split('?')[0];

        // Try to decode URI component for better display
        try {
          return decodeURIComponent(cleanName);
        } catch (e) {
          return cleanName;
        }
      }

      return "File";
    };

    // Get all image files
    const imageFiles = message.files ? message.files.filter(file =>
      file.type?.startsWith('image/') ||
      file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) : [];

    // Group images into pairs
    const imageGroups = chunkArray(imageFiles, 2);

    return (
      <>
        {isGroupChat && !isCurrentUser && senderName ? (
          <Text className="text-xs font-semibold text-blue-600 mb-1">{senderName}</Text>
        ) : null}

        {/* Show replied message if present - make it clickable, passing the original message ID */}
        {message.replyTo && (
          <TouchableOpacity
            className="mb-2 bg-black/5 rounded px-2 py-1 border-l-2 border-gray-400"
            onPress={() => onReplyClick && message.replyTo.messageId && onReplyClick(message.replyTo.messageId)}
            activeOpacity={0.7}
          >
            <Text className="text-xs font-medium text-gray-600" numberOfLines={1}>
              {isCurrentUser && message.replyTo.sender === message.msgByUserId ?
                "Replied to yourself:" :
                `Replied to ${isGroupChat ? "someone" : isCurrentUser ? "them" : "you"}:`}
            </Text>
            <Text className="text-xs text-gray-500" numberOfLines={2}>
              {message.replyTo.text || "Media message"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Render grouped images in a grid */}
        {imageFiles.length > 0 && (
          <View className="mb-2">
            {imageGroups.map((group, groupIndex) => (
              <View key={`group-${groupIndex}`} className="flex-row justify-between mb-1">
                {group.map((file, index) => (
                  <TouchableOpacity
                    key={`img-${groupIndex}-${index}`}
                    onPress={() => onImagePress && onImagePress(file.url)}
                    style={{
                      width: group.length === 1 ? 240 : 118,
                      marginRight: index === 0 && group.length > 1 ? 4 : 0
                    }}
                  >
                    <Image
                      source={{
                        uri: file.url,
                        ...(forceImageUpdate && { cache: 'reload' })
                      }}
                      className="rounded-lg"
                      style={{
                        width: '100%',
                        height: 120,
                        resizeMode: 'cover'
                      }}
                    />
                    <Text className="text-xs text-gray-500 mt-1 text-center" numberOfLines={1}>
                      {getDisplayName(file)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

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
            <Text className="text-xs text-gray-500 mt-1 text-center" numberOfLines={1}>
              {getDisplayName(fileDetails) || message.fileName || "Image"}
            </Text>
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
                {getDisplayName(file) || "Video"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Render multiple documents */}
        {message.files && message.files.filter(file =>
          (!file.type?.startsWith('image/') && !file.type?.startsWith('video/')) ||
          (!file.url?.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mkv)$/i))
        ).map((file, index) => (
          <TouchableOpacity
            key={`doc-${index}`}
            onPress={() => onDocumentPress && onDocumentPress(file.url, file.name || getDisplayName(file) || "Document")}
            className="mb-2 p-3 bg-gray-100 rounded-md flex-row items-center"
          >
            <FontAwesomeIcon icon={getFileIcon(file.name)} size={20} color="#555" />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {file.name || getDisplayName(file) || "Document"}
              </Text>
              <Text className="text-xs text-gray-500">
                {file.type?.split('/')[1]?.toUpperCase() || 'Document'}
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

        {/* Message text with better wrapping */}
        {message.text ? (
          <Text
            className={`text-sm flex-wrap ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}
            style={{ flexShrink: 1 }}
            numberOfLines={undefined} // Allow unlimited lines
          >
            {message.text}
          </Text>
        ) : null}

        {showTime ? (
          <Text className={`text-xs mt-1 ${isCurrentUser ? 'text-white/80' : 'text-purple-700'}`}>
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
    <View className="flex-row items-start mb-3 mx-1">
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
              : 'bg-purple-100 rounded-tl-sm'
              } px-3 py-2`}
            style={{
              backgroundColor: isLongPressed
                ? (isCurrentUser ? '#0074e0' : '#e2c6ff')
                : (isCurrentUser ? '#0084ff' : '#f0e6ff'),
              maxWidth: screenWidth * 0.75, // Limit message width to 75% of screen
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
            className="bg-white rounded-2xl py-1 px-2 shadow-lg"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: [{ translateX: -125 }, { translateY: -20 }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              width: 250, // Wider to accommodate reply button
              height: 40, // Fixed height to ensure proper alignment
            }}
          >
            {EMOJI_REACTIONS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleReactionSelect(emoji)}
                className="items-center justify-center"
                style={{ width: 28, height: 28 }} // Even smaller, fixed-size touch targets
              >
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}

            {/* Reply button - available for both own and others' messages */}
            <TouchableOpacity
              className="bg-blue-100 rounded-full items-center justify-center"
              onPress={handleReply}
              style={{ width: 28, height: 28 }}
            >
              <FontAwesomeIcon icon={faReply} size={12} color="#0084ff" />
            </TouchableOpacity>

            {isCurrentUser && !message.isDeleted && (
              <TouchableOpacity
                className="bg-gray-200 rounded-full items-center justify-center"
                onPress={handleShowMessageOptions}
                style={{ width: 28, height: 28 }} // Match size with emojis
              >
                <FontAwesomeIcon icon={faEllipsisVertical} size={12} color="#555" />
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
                // Enhanced logging and error handling
                if (!message || !message._id) {
                  console.error("Invalid message or missing ID", message);
                  Alert.alert("Lỗi", "Không thể xoá tin nhắn không có ID");
                  return;
                }
                handleDeleteMessageWithConfirmation(message._id);
              }}
            >
              <FontAwesomeIcon icon={faTrash} size={16} color="#ff4444" className="mr-3" />
              <Text className="text-[15px] text-red-500">Xóa tin nhắn</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    // Add replyTo to PropTypes
    replyTo: PropTypes.shape({
      messageId: PropTypes.string,
      text: PropTypes.string,
      sender: PropTypes.string
    })
  }).isRequired,
  isCurrentUser: PropTypes.bool.isRequired,
  onReaction: PropTypes.func,
  userProfilePic: PropTypes.string.isRequired,
  onEditMessage: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onReply: PropTypes.func, // New prop type for reply functionality
  onReplyClick: PropTypes.func, // Add prop type for reply click handler
  onImagePress: PropTypes.func,
  onVideoPress: PropTypes.func,
  onDocumentPress: PropTypes.func,
  senderName: PropTypes.string,
  isGroupChat: PropTypes.bool,
  showTime: PropTypes.bool,
  forceImageUpdate: PropTypes.bool
};

export default MessageBubble;