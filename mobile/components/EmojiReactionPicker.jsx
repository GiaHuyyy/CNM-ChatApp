import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';

// Danh sách emoji cố định để chọn nhanh
const EMOJI_LIST = [
  '👍', '❤️', '😆', '😮', '😢', '😠'
];

const EmojiReactionPicker = ({ onSelectEmoji, style }) => {
  return (
    <View 
      className={`
        flex-row items-center justify-center 
        bg-white rounded-full py-2 px-3 shadow-lg
      `}
      style={[
        {
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        style
      ]}
    >
      {EMOJI_LIST.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          onPress={() => onSelectEmoji({ emoji })}
          className="mx-1"
          activeOpacity={0.7}
        >
          <Text className="text-2xl">{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

EmojiReactionPicker.propTypes = {
  onSelectEmoji: PropTypes.func.isRequired,
  style: PropTypes.object,
};

export default EmojiReactionPicker; 