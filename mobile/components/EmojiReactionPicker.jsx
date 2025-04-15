import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';

const EMOJI_LIST = [
  { emoji: '👍', name: 'like' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😄', name: 'haha' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😮', name: 'wow' },
  { emoji: '😠', name: 'angry' },
];

const EmojiReactionPicker = ({ onSelectEmoji, style }) => {
  return (
    <View 
      className={`
        absolute bottom-full mb-2 flex-row items-center justify-center 
        rounded-full bg-white py-2 px-3 shadow-lg
      `}
      style={style}
    >
      {EMOJI_LIST.map((item) => (
        <TouchableOpacity
          key={item.name}
          onPress={() => onSelectEmoji(item)}
          className="mx-1 transform transition-transform active:scale-110"
        >
          <Text className="text-2xl">{item.emoji}</Text>
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