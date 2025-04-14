import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode, faInfoCircle, faPaperPlane, faImage, faSmile } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";
import RightSidebar from "../../components/RightSidebar";

export default function Chat() {
  const dispatch = useDispatch();
  const { socketConnection, setSocketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);
  const onlineUsers = useSelector((state) => state.user.onlineUsers || []);
  
  // State for conversations and messages
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // State for sidebar
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState("Thông tin hội thoại");
  
  // State for media content
  const [photoVideoMessages, setPhotoVideoMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [linkMessages, setLinkMessages] = useState([]);
  
  const scrollViewRef = useRef();
  const SERVER_URL = "http://localhost:5000"; // Update with your server IP

  // Connect to socket
  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        console.log("Connecting to socket with token:", token);
        
        const socket = io(SERVER_URL, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
          console.log("🔌 Socket connected: ", socket.id);
          // Request conversations immediately after connection
          socket.emit("get conversations");
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
        });

        socket.on("onlineUser", (data) => {
          console.log("🟢 Online users: ", data);
          dispatch(setOnlineUser(data));
        });
        
        // Listen for conversations list
        socket.on("conversations", (data) => {
          console.log("📝 Conversations received: ", data);
          setConversations(data);
          setLoading(false);
        });
        
        // Listen for messages
        socket.on("messages", (data) => {
          console.log("💬 Messages received: ", data);
          setMessages(data);
        });
        
        // Listen for new messages
        socket.on("message received", (newMessage) => {
          console.log("New message received:", newMessage);
          if (selectedConversation?._id === newMessage.conversation._id) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          // Update conversation list with latest message
          setConversations((prev) => {
            return prev.map((conv) => {
              if (conv._id === newMessage.conversation._id) {
                return { ...conv, latestMessage: newMessage };
              }
              return conv;
            });
          });
        });
        
        // Listen for media content
        socket.on("media content", (data) => {
          console.log("🖼️ Media content received: ", data);
          setPhotoVideoMessages(data.photos || []);
          setFileMessages(data.files || []);
          setLinkMessages(data.links || []);
        });

        setSocketConnection(socket);

        return () => {
          console.log("❌ Disconnecting socket");
          socket.disconnect();
        };
      } catch (err) {
        console.log("Socket connection error:", err);
        setLoading(false);
      }
    };

    connectSocket();
  }, [dispatch, setSocketConnection]);
  
  // Join chat room when selecting a conversation
  useEffect(() => {
    if (selectedConversation && socketConnection) {
      console.log("Joining chat room:", selectedConversation._id);
      
      // Join the conversation room
      socketConnection.emit("join chat", selectedConversation._id);
      
      // Request messages for this conversation
      socketConnection.emit("get messages", selectedConversation._id);
      
      // Request media content for this conversation
      socketConnection.emit("get media content", selectedConversation._id);
    }
  }, [selectedConversation, socketConnection]);
  
  const sendMessage = () => {
    if (!newMessage.trim() || !socketConnection || !selectedConversation) return;
    
    console.log("Sending message:", newMessage);
    
    // Create message object
    const messageData = {
      text: newMessage,
      conversationId: selectedConversation._id,
      sender: user,
      createdAt: new Date().toISOString(),
    };
    
    // Add message to local state immediately for better UX
    const tempMessage = {
      ...messageData,
      _id: Date.now().toString(), // Temporary ID
      sender: user,
      conversation: selectedConversation,
    };
    
    setMessages((prev) => [...prev, tempMessage]);
    
    // Send message through socket
    socketConnection.emit("new message", messageData);
    
    // Clear input
    setNewMessage("");
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  const handleAddMember = () => {
    if (!socketConnection || !selectedConversation) return;
    
    // This would typically open a modal to select users
    console.log("Add member to group:", selectedConversation?._id);
    
    // Example: socketConnection.emit("add member", { conversationId: selectedConversation._id, memberId: newMemberId });
  };

  const handleLeaveGroup = () => {
    if (!socketConnection || !selectedConversation) return;
    
    socketConnection.emit("leave group", {
      conversationId: selectedConversation._id,
      userId: user._id
    });
    
    setSelectedConversation(null);
    setShowSidebar(false);
  };

  const handleDeleteConversation = () => {
    if (!socketConnection || !selectedConversation) return;
    
    socketConnection.emit("delete conversation", selectedConversation._id);
    
    setSelectedConversation(null);
    setShowSidebar(false);
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (!socketConnection || !selectedConversation) return;
    
    socketConnection.emit("remove member", {
      conversationId: selectedConversation._id,
      memberId: memberId
    });
    
    // Update the selected conversation to reflect member removal
    setSelectedConversation(prev => ({
      ...prev,
      members: prev.members.filter(member => member._id !== memberId)
    }));
  };
  
  const renderConversationItem = ({ item }) => {
    const isOnline = onlineUsers.some((onlineUser) => onlineUser._id === item._id);
    
    return (
      <TouchableOpacity 
        className="flex-row items-center p-4 border-b border-gray-200"
        onPress={() => setSelectedConversation(item)}
      >
        <View className="relative h-12 w-12 rounded-full bg-gray-300 mr-3 overflow-hidden">
          {item.profilePic && (
            <Image source={{ uri: item.profilePic }} className="h-full w-full" />
          )}
          {isOnline && (
            <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-base">{item.name}</Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {item.latestMessage?.text || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderMessageItem = ({ item }) => {
    const isSender = item.sender._id === user._id;
    
    return (
      <View className={`my-1 max-w-[80%] ${isSender ? 'self-end' : 'self-start'}`}>
        <View className={`rounded-2xl p-3 ${isSender ? 'bg-blue-500' : 'bg-gray-200'}`}>
          {!isSender && (
            <Text className="text-xs text-gray-600 mb-1">{item.sender.name}</Text>
          )}
          
          {item.text && (
            <Text className={`${isSender ? 'text-white' : 'text-black'}`}>{item.text}</Text>
          )}
          
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              className="w-full h-48 rounded-lg mt-1" 
              resizeMode="cover" 
            />
          )}
          
          <Text className={`text-xs mt-1 ${isSender ? 'text-white opacity-70' : 'text-gray-500'}`}>
            {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
        <View className="flex-row items-center bg-white rounded-full px-3 py-1 flex-1 mr-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
          <TextInput
            placeholder="Tìm kiếm"
            className="ml-2 flex-1 text-sm"
            placeholderTextColor="#888"
          />
        </View>
        <TouchableOpacity className="mx-1">
          <FontAwesomeIcon icon={faQrcode} size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="ml-1">
          <FontAwesomeIcon icon={faPlus} size={18} color="white" />
        </TouchableOpacity>
      </View>
      
      {selectedConversation ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 flex-row">
            {/* Chat area */}
            <View className={`flex-1 ${showSidebar ? 'w-2/3' : 'w-full'}`}>
              <View className="h-16 flex-row items-center justify-between px-4 border-b border-gray-200">
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => setSelectedConversation(null)}>
                    <Text className="text-blue-500 mr-3">Back</Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 rounded-full bg-gray-300 mr-2 overflow-hidden">
                      {selectedConversation.profilePic && (
                        <Image source={{ uri: selectedConversation.profilePic }} className="h-full w-full" />
                      )}
                    </View>
                    <Text className="font-semibold text-lg">{selectedConversation.name}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)}>
                  <FontAwesomeIcon icon={faInfoCircle} size={24} color="#3b82f6" />
                </TouchableOpacity>
              </View>
              
              <View className="flex-1">
                <FlatList
                  ref={scrollViewRef}
                  data={messages}
                  renderItem={renderMessageItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  contentContainerStyle={{ padding: 10, flexGrow: 1 }}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  ListEmptyComponent={
                    <View className="flex-1 justify-center items-center p-4">
                      <Text className="text-gray-500">No messages yet</Text>
                    </View>
                  }
                />
              </View>
              
              {/* Message input */}
              <View className="flex-row items-center border-t border-gray-200 p-2">
                <TouchableOpacity className="p-2">
                  <FontAwesomeIcon icon={faImage} size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2">
                  <FontAwesomeIcon icon={faSmile} size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TextInput
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 mx-2"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
                <TouchableOpacity 
                  className={`p-2 rounded-full ${newMessage.trim() ? 'bg-blue-500' : 'bg-gray-300'}`}
                  onPress={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <FontAwesomeIcon icon={faPaperPlane} size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Right sidebar */}
            {showSidebar && (
              <View className="w-1/3">
                <RightSidebar
                  isVisible={showSidebar}
                  dataUser={selectedConversation}
                  user={user}
                  photoVideoMessages={photoVideoMessages}
                  fileMessages={fileMessages}
                  linkMessages={linkMessages}
                  onAddMember={handleAddMember}
                  onLeaveGroup={handleLeaveGroup}
                  onDeleteConversation={handleDeleteConversation}
                  onRemoveMember={handleRemoveMember}
                  showContextMenu={showContextMenu}
                  setShowContextMenu={setShowContextMenu}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View className="flex-1">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-2 text-gray-500">Loading conversations...</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center p-4">
                  <Text className="text-gray-500">No conversations found</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}
