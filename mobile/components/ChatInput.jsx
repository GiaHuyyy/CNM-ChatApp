import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faPaperclip,
  faSmile,
  faMicrophone,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      Keyboard.dismiss();
    }
  };

  return (
    <View className="bg-white border-t border-gray-200 p-3">
      <View className="flex-row items-center bg-background-dark rounded-button px-3 py-2">
        <TouchableOpacity className="mr-2">
          <FontAwesomeIcon icon={faPaperclip} size={20} color="#666" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 text-text-primary text-base"
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity className="mx-2">
          <FontAwesomeIcon icon={faSmile} size={20} color="#666" />
        </TouchableOpacity>
        {message.trim() ? (
          <TouchableOpacity
            onPress={handleSend}
            className="bg-primary rounded-full w-8 h-8 items-center justify-center"
          >
            <FontAwesomeIcon icon={faPaperPlane} size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity>
            <FontAwesomeIcon icon={faMicrophone} size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ChatInput; 