import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image, Animated } from 'react-native';
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
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import EmojiReactionPicker from './EmojiReactionPicker';

const MessageBubble = ({ 
  message, 
  isCurrentUser, 
  onReaction,
  userProfilePic,
  onEditMessage,
  onDeleteMessage 
}) => {
  // States để quản lý hiển thị các menu
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Animation value cho emoji picker
  const emojiPickerAnim = useRef(new Animated.Value(0)).current;

  // Xử lý hiển thị emoji picker với animation
  const toggleEmojiPicker = (show) => {
    // Hủy timer ẩn nếu đang có
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

  // Timer refs
  const emojiPickerTimer = useRef(null);
  const actionMenuTimer = useRef(null);

  // Xử lý khi người dùng chọn emoji
  const handleEmojiSelect = (emojiData) => {
    if (onReaction && message._id) {
      onReaction(message._id, emojiData.emoji);
    }
    toggleEmojiPicker(false);
  };

  // Xử lý thả cảm xúc nhanh
  const handleQuickLike = (messageId) => {
    if (onReaction) {
      onReaction(messageId, '👍');
    }
  };

  // Xử lý hiển thị menu hành động
  const handleShowActionMenu = () => {
    if (actionMenuTimer.current) {
      clearTimeout(actionMenuTimer.current);
    }
    setShowActionMenu(true);
  };

  // Xử lý ẩn menu hành động
  const handleHideActionMenu = () => {
    actionMenuTimer.current = setTimeout(() => {
      setShowActionMenu(false);
    }, 300); // Delay 300ms để tránh menu biến mất quá nhanh
  };

  // Cleanup timers khi component unmount
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

  // Tính toán các class cho container chính của tin nhắn
  const containerClass = isCurrentUser
    ? 'flex-row-reverse' // Tin nhắn của người dùng hiện tại sẽ hiển thị bên phải
    : 'flex-row';       // Tin nhắn của người khác sẽ hiển thị bên trái

  // Tính toán các class cho bubble tin nhắn
  const bubbleClass = isCurrentUser
    ? 'bg-blue-500 rounded-t-2xl rounded-bl-2xl rounded-br-md ml-2' // Bo góc cho tin nhắn gửi
    : 'bg-gray-200 rounded-t-2xl rounded-br-2xl rounded-bl-md mr-2'; // Bo góc cho tin nhắn nhận

  // Tính toán class cho text
  const textClass = isCurrentUser
    ? 'text-white'     // Chữ màu trắng cho tin nhắn gửi
    : 'text-gray-800'; // Chữ màu đen cho tin nhắn nhận

  return (
    <View className="mb-3 px-4">
      {/* Container chính với flex direction dựa theo người gửi */}
      <View className={`${containerClass} items-end`}>
        {/* Avatar chỉ hiển thị cho tin nhắn của người khác */}
        {!isCurrentUser && (
          <Image
            source={{ uri: userProfilePic }}
            className="h-8 w-8 rounded-full"
          />
        )}

        {/* Container cho tin nhắn và reactions */}
        <View className="max-w-[75%] relative">
          {/* Bubble tin nhắn */}
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
            {/* Nội dung tin nhắn */}
            <Text className={`text-base ${textClass}`}>
              {message.text}
            </Text>

            {/* Thời gian gửi */}
            <Text className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {message.isEdited && (
                <Text className="ml-1 text-[10px] italic">(Đã chỉnh sửa)</Text>
              )}
            </Text>

            {/* Nút thả cảm xúc nhanh */}
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

            {/* Menu hành động khi hover */}
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
                    onEditMessage(message);
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
                    onDeleteMessage(message._id);
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

          {/* Emoji Picker với animation */}
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
    </View>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    isEdited: PropTypes.bool,
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
};

export default MessageBubble; 