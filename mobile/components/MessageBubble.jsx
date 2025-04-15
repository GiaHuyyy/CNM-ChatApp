import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons';
import EmojiReactionPicker from './EmojiReactionPicker';

const MessageBubble = ({ 
  message, 
  isCurrentUser, 
  onReaction,
  userProfilePic 
}) => {
  // State để quản lý hiển thị emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Ref để đo kích thước và vị trí của tin nhắn
  const messageRef = useRef(null);
  
  // Xử lý khi người dùng chọn emoji
  const handleEmojiSelect = (emojiData) => {
    if (onReaction && message._id) {
      onReaction(message._id, emojiData.emoji);
    }
    setShowEmojiPicker(false);
  };

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

  // Tính toán margin cho reactions
  const reactionsClass = isCurrentUser
    ? 'mr-2'  // Margin right cho reactions của tin nhắn gửi
    : 'ml-2'; // Margin left cho reactions của tin nhắn nhận

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
        <View className="max-w-[75%]" ref={messageRef}>
          {/* Bubble tin nhắn */}
          <Pressable
            onLongPress={() => setShowEmojiPicker(true)}
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
            </Text>

            {/* Nút mở emoji picker */}
            <TouchableOpacity
              onPress={() => setShowEmojiPicker(true)}
              className={`absolute top-1/2 -translate-y-1/2 ${isCurrentUser ? '-left-8' : '-right-8'}`}
            >
              <FontAwesomeIcon 
                icon={faFaceSmile} 
                size={16} 
                color="#666"
              />
            </TouchableOpacity>
          </Pressable>

          {/* Hiển thị reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View className={`flex-row mt-1 ${reactionsClass}`}>
              {message.reactions.map((reaction, index) => (
                <View 
                  key={index}
                  className="bg-white rounded-full px-1.5 py-0.5 mr-1 shadow-sm"
                >
                  <Text className="text-sm">{reaction.emoji}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <View 
              className={`
                absolute z-50 
                ${isCurrentUser ? 'right-0' : 'left-0'} 
                bottom-full mb-2
              `}
            >
              <EmojiReactionPicker
                onSelectEmoji={handleEmojiSelect}
                style={{
                  transform: [{ translateX: isCurrentUser ? 50 : -50 }]
                }}
              />
            </View>
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
};

export default MessageBubble; 