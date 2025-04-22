import React, { useEffect, useState, useRef } from "react";
import { View, TextInput, TouchableOpacity, FlatList, Text, Image, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Linking } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode, faTimes, faHistory, faTrash, faImage, faFilePen, faUsers, faAngleDown, faEllipsis, faArrowLeft, faPaperPlane, faFile, faFileImage, faFileVideo, faFileAlt, faCamera, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { setUser, setToken } from "../redux/userSlice";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import uploadFileToCloud from "../../helpers/uploadFileToCloud";
import { Video } from 'expo-av';
import MessageBubble from "../../components/MessageBubble";

export default function Chat() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const user = useSelector((state) => state.user);
  const { setSocketConnection, setSeenMessage } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [socketConnection, setSocketConnectionState] = useState(null);
  const [loading, setLoading] = useState(true);

  // New states for chat functionality
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // States for file handling
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Add state for media options menu visibility
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  // Group chat states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allAvailableUsers, setAllAvailableUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [currentGroupInfo, setCurrentGroupInfo] = useState(null);

  // Add state for tracking which message is being edited
  const [editingMessage, setEditingMessage] = useState(null);

  // Add a ref for the input field
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/user-details", {
          withCredentials: true,
        });
        dispatch(setUser(response?.data?.data));
        console.log("User details fetched:", response.data.data);
      } catch (error) {
        console.error("Error fetching user info:", error.message);
      } finally {
        setLoading(false);
      }
    };

    setTimeout(() => {
      fetchUserDetails();
    }, 100);
  }, []);
  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const socketConnection = io('http://localhost:5000', {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketConnection.on("connect", () => {
          console.log("🔌 Socket connected: ", socketConnection.id);
        });

        socketConnection.on("onlineUser", (data) => {
          console.log("🟢 Online users: ", data);
          dispatch(setOnlineUser(data));
        });

        setSocketConnection(socketConnection);
        setSocketConnectionState(socketConnection);

        return () => {
          console.log("❌ Disconnecting socket");
          socketConnection.disconnect();
        };
      } catch (err) {
        console.log("Socket connection error:", err);
      }
    };

    connectSocket();
  }, [dispatch, setSocketConnection]);

  useEffect(() => {
    setTimeout(() => {
      if (socketConnection) {
        socketConnection.emit("sidebar", user?._id);
        console.log("Socket emit sidebar: ", user);
        socketConnection.on("conversation", (data) => {
          console.log("Conversation: ", data);

          if (data) {
            setAllUsers(data);
          }
        });
      }
    }, 100);
  }, [socketConnection, user?._id]);

  useEffect(() => {
    const fetchFriendRequestsCount = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/pending-friend-requests`,
          { withCredentials: true }
        );
        setFriendRequestsCount(response.data.data.length);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchFriendRequestsCount();

    const interval = setInterval(fetchFriendRequestsCount, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const savedSearches = await AsyncStorage.getItem('recentSearches');
        if (savedSearches) {
          setRecentSearches(JSON.parse(savedSearches));
        }
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    };


    loadRecentSearches();
  }, []);

  const saveToRecentSearches = async (query, result = null) => {
    try {
      if (!query.trim()) return;


      const searchItem = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        firstResult: result ? {
          id: result._id || result.id,
          name: result.name,
          profilePic: result.profilePic || result.avatar,
          isGroup: !!result.isGroup
        } : null
      };

      const updatedSearches = [searchItem, ...recentSearches.filter(item =>
        item.query.toLowerCase() !== query.toLowerCase()
      )].slice(0, 10);

      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const clearAllRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem('recentSearches');
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  const removeSearchItem = async (id) => {
    try {
      const updatedSearches = recentSearches.filter(item => item.id !== id);
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error("Error removing search item:", error);
    }
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        if (!searchQuery.trim()) {
          setSearchResults([]);
          return;
        }

        setSearchLoading(true);
        setIsSearching(true);

        setTimeout(async () => {
          try {
            const response = await axios.post(
              "http://localhost:5000/api/search-friend-user",
              { search: searchQuery },
              { withCredentials: true }
            );

            console.log("Search results:", {
              total: response?.data?.data?.length || 0,
              users: response?.data?.data?.filter((r) => !r.isGroup)?.length || 0,
              groups: response?.data?.data?.filter((r) => r.isGroup)?.length || 0,
              results: response?.data?.data,
            });

            const results = response?.data?.data || [];
            setSearchResults(results);
            if (results.length > 0) {
              saveToRecentSearches(searchQuery, results[0]);
            }
          } catch (error) {
            console.error("Search error:", error.response?.data || error);
            setSearchResults([]);
          } finally {
            setSearchLoading(false);
            setIsSearching(false);
          }
        }, 600);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setSearchLoading(false);
        setIsSearching(false);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  const searchFromHistory = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleStartChatFromSearch = (userItem) => {
    // Create a chat item structure based on the search result
    const chatItem = {
      _id: Date.now().toString(), // Temporary ID until server creates a real conversation
      userDetails: {
        _id: userItem._id,
        name: userItem.name,
        profilePic: userItem.profilePic || userItem.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.name)}`,
        isGroup: !!userItem.isGroup
      },
      unseenMessages: 0
    };

    // Clear search and focus state
    clearSearch();
    setIsSearchFocused(false);

    // Select the chat which will trigger the socket connection
    handleSelectChat(chatItem);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      className="flex-row items-center p-3 border-b border-gray-100"
      onPress={() => {
        console.log("Selected:", item);
        handleStartChatFromSearch(item);
      }}
    >
      {item.profilePic || item.avatar ? (
        <Image source={{ uri: item.profilePic || item.avatar }} className="w-10 h-10 rounded-full" />
      ) : (
        <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
          <Text className="text-white font-bold">{(item.name || "")?.charAt(0)?.toUpperCase()}</Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="font-medium">{item.name}</Text>
        <Text className="text-gray-500 text-sm">
          {item.isGroup ? "Nhóm" : (item.email || item.status || "Offline")}
        </Text>
      </View>
      <View className="flex-row items-center">
        <View className="bg-blue-500 rounded-full px-3 py-1">
          <Text className="text-white text-xs">Chat</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const navigateToChat = (chatId) => {
    navigation.navigate('Messages', { chatId });
  };

  const handleSelectChat = (chatItem) => {
    setIsChatLoading(true);
    setSelectedChat(chatItem);
    setAllUsers(prev =>
      prev.map(item => item._id === chatItem._id ? { ...item, unseenMessages: 0 } : item)
    );
    setSeenMessage(true);

    // Clear any existing messages to prevent showing old messages while loading
    setMessages([]);

    if (socketConnection) {
      // Make sure we disconnect from any previous room first
      if (selectedChat?.userDetails?._id) {
        socketConnection.emit("leaveRoom", selectedChat.userDetails._id);
      }

      const isGroup = chatItem.isGroup || chatItem.userDetails?.isGroup;
      console.log("Joining chat:", chatItem.userDetails._id, "isGroup:", isGroup);
      socketConnection.emit("joinRoom", chatItem.userDetails._id);

      // Mark messages as seen immediately
      if (isGroup) {
        socketConnection.emit("seenGroup", chatItem.userDetails._id);
      } else {
        socketConnection.emit("seen", chatItem.userDetails._id);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setMessages([]);
    setChatUser(null);
  };

  useEffect(() => {
    if (!socketConnection || !selectedChat) return;

    // Clear any existing listeners to prevent duplicates
    socketConnection.off("messageUser");
    socketConnection.off("message");
    socketConnection.off("groupMessage");
    socketConnection.off("error");

    // Define handlers with proper debugging
    const handleMessageUser = (payload) => {
      console.log("Received user data:", payload);
      setChatUser(payload);
      setIsChatLoading(false);
    };

    const handleMessage = (conversation) => {
      console.log("Received direct messages:", conversation?.messages?.length || 0);
      if (conversation && Array.isArray(conversation.messages)) {
        setMessages(conversation.messages);

        // Mark messages as seen
        if (conversation.messages.length > 0 && socketConnection) {
          socketConnection.emit("seen", selectedChat.userDetails?._id);
        }
      } else {
        setMessages([]);
      }
      setIsChatLoading(false);
    };

    const handleGroupMessage = (groupData) => {
      console.log("Received group messages:", groupData?.messages?.length || 0);

      if (groupData && Array.isArray(groupData.messages)) {
        setMessages(groupData.messages);

        // Update chat user with group information
        setChatUser({
          _id: groupData._id,
          name: groupData.name || "Group Chat",
          profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name || "Group")}&background=random`,
          isGroup: true,
          members: groupData.members || [],
          groupAdmin: groupData.groupAdmin,
        });

        // Mark messages as seen for group
        if (groupData.messages.length > 0 && socketConnection) {
          socketConnection.emit("seenGroup", groupData._id);
        }
      } else {
        setMessages([]);
      }
      setIsChatLoading(false);
    };

    const handleError = (error) => {
      console.error("Socket error:", error);
      setIsChatLoading(false);
      Alert.alert("Error", error.message || "Failed to load conversation");
    };

    // Register event handlers
    socketConnection.on("messageUser", handleMessageUser);
    socketConnection.on("message", handleMessage);
    socketConnection.on("groupMessage", handleGroupMessage);
    socketConnection.on("error", handleError);

    // Join the room - emit appropriate event based on whether it's a group
    const isGroup = selectedChat.isGroup || selectedChat.userDetails?.isGroup;
    console.log("Joining room:", selectedChat?.userDetails?._id, "isGroup:", isGroup);
    socketConnection.emit("joinRoom", selectedChat?.userDetails?._id);

    // Cleanup function
    return () => {
      socketConnection.off("messageUser", handleMessageUser);
      socketConnection.off("message", handleMessage);
      socketConnection.off("groupMessage", handleGroupMessage);
      socketConnection.off("error", handleError);
    };
  }, [socketConnection, selectedChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    if (!socketConnection) return;

    // Listen for new message notifications when not in that chat
    socketConnection.on("newMessageNotification", (data) => {
      console.log("New message notification:", data);
      // Update the conversation list to show new messages
      socketConnection.emit("sidebar", user?._id);
    });

    return () => {
      socketConnection.off("newMessageNotification");
    };
  }, [socketConnection, user]);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const mimeType = asset.mimeType || (uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        const fileName = `camera_${Date.now()}.${mimeType.includes('video') ? 'mp4' : 'jpg'}`;

        console.log("Camera capture:", {
          uri: uri ? "URI present" : "No URI",
          fileName,
          mimeType
        });

        setSelectedFile({
          uri,
          fileName,
          mimeType,
          isVideo: mimeType.includes('video'),
          name: fileName,
          type: mimeType
        });
      }
    } catch (error) {
      console.error("Error using camera:", error);
      alert('Error accessing camera. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.6,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const mimeType = asset.mimeType || (uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        const fileName = uri.split('/').pop() || `file_${Date.now()}.${mimeType.includes('video') ? 'mp4' : 'jpg'}`;

        console.log("Selected media:", {
          uri: uri ? "URI present" : "No URI",
          fileName,
          mimeType
        });

        setSelectedFile({
          uri,
          fileName,
          mimeType,
          isVideo: mimeType.includes('video'),
          name: fileName,
          type: mimeType,
          ...(Platform.OS === "web" && { file: result.file })
        });
      }
    } catch (error) {
      console.error("Error picking media:", error);
      alert('Error selecting media. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });

      if (result.canceled === false) {
        const { uri, mimeType, name } = result.assets[0];

        if (!uri) {
          throw new Error("Document has no URI");
        }

        const fileName = name || uri.split('/').pop() || `document_${Date.now()}.${mimeType?.includes('pdf') ? 'pdf' : 'docx'}`;

        console.log("Selected document:", {
          uri: uri ? "URI present" : "No URI",
          fileName,
          mimeType
        });

        setSelectedFile({
          uri,
          fileName,
          mimeType,
          isDocument: true,
          name: fileName,
          type: mimeType,
          ...(Platform.OS === "web" && { file: result.file })
        });
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alert('Error selecting document. Please try again.');
    }
  };

  const handleClearUploadFile = () => {
    setSelectedFile(null);
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    if (selectedFile.isVideo) {
      return (
        <View className="p-2 bg-gray-200 rounded">
          <Video
            source={{ uri: selectedFile.uri }}
            style={{ width: 200, height: 200 }}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-sm flex-1" numberOfLines={1}>{selectedFile.fileName || selectedFile.name}</Text>
            <Text className="text-xs text-gray-500 ml-2">Video</Text>
          </View>
        </View>
      );
    } else if (selectedFile.mimeType?.startsWith('image/') || selectedFile.type?.startsWith('image/')) {
      return (
        <View className="p-2 bg-gray-200 rounded">
          <Image
            source={{ uri: selectedFile.uri }}
            className="w-40 h-40 rounded"
            resizeMode="cover"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-sm flex-1" numberOfLines={1}>{selectedFile.fileName || selectedFile.name}</Text>
            <Text className="text-xs text-gray-500 ml-2">Image</Text>
          </View>
        </View>
      );
    } else {
      const fileIcon = (selectedFile.fileName || selectedFile.name)?.endsWith('.pdf') ? faFileAlt : faFilePen;

      return (
        <View className="p-4 bg-gray-200 rounded flex-row items-center">
          <FontAwesomeIcon
            icon={fileIcon}
            size={24}
            color="#555"
          />
          <View className="flex-1 ml-3">
            <Text className="text-sm" numberOfLines={1}>{selectedFile.fileName || selectedFile.name}</Text>
            <Text className="text-xs text-gray-500 mt-1">Document</Text>
          </View>
        </View>
      );
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !socketConnection || !selectedChat) return;

    setIsUploading(selectedFile ? true : false);

    try {
      // Check if we're editing a message
      if (editingMessage) {
        // If editing, emit the editMessage event
        socketConnection.emit("editMessage", {
          messageId: editingMessage._id,
          conversationId: selectedChat.userDetails?._id,
          text: messageText,
          userId: user._id,
          isGroup: selectedChat.isGroup || selectedChat.userDetails?.isGroup
        });

        // Clear editing state
        setEditingMessage(null);
        setMessageText("");
        return;
      }

      let fileUrl = "";
      let fileName = "";
      let fileType = "";

      if (selectedFile) {
        console.log("Preparing to upload file:", selectedFile.name);
        try {
          if (!selectedFile.uri) {
            throw new Error("File has no URI");
          }

          let fileToUpload;

          if (Platform.OS === "web") {
            if (selectedFile.file) {
              fileToUpload = selectedFile.file;
            } else {
              const response = await fetch(selectedFile.uri);
              const blob = await response.blob();
              fileToUpload = new File([blob], selectedFile.name, { type: selectedFile.type });
            }
          } else {
            fileToUpload = {
              uri: selectedFile.uri,
              name: selectedFile.fileName || selectedFile.name || `file_${Date.now()}${selectedFile.type?.includes('image') ? '.jpg' : '.file'}`,
              type: selectedFile.mimeType || selectedFile.type || 'application/octet-stream'
            };
          }

          console.log("File prepared for upload:", {
            platform: Platform.OS,
            fileType: typeof fileToUpload,
            hasUri: !!fileToUpload.uri,
            name: fileToUpload.name || fileToUpload.fileName || "(no name)",
            type: fileToUpload.type || fileToUpload.mimeType || "(no type)"
          });

          const uploadResult = await uploadFileToCloud(fileToUpload);

          if (!uploadResult || !uploadResult.secure_url) {
            console.error("Upload result:", uploadResult);
            throw new Error("Upload failed - no URL returned");
          }

          fileUrl = uploadResult.secure_url;
          fileName = selectedFile.name || selectedFile.fileName || "unnamed_file";
          fileType = selectedFile.type || selectedFile.mimeType || "";

          console.log("File uploaded successfully:", fileUrl);
        } catch (uploadError) {
          console.error("File upload error:", uploadError.message);
          Alert.alert(
            "Upload Failed",
            "Could not upload file. Please try again.",
            [{ text: "OK" }]
          );
          setIsUploading(false);
          return;
        }
      }

      const isImage = selectedFile?.type?.startsWith('image/') || selectedFile?.mimeType?.startsWith('image/');

      // Check if this is a group chat
      const isGroup = selectedChat.isGroup || selectedChat.userDetails?.isGroup;

      if (isGroup) {
        // Send message to a group
        const groupMessage = {
          conversationId: selectedChat.userDetails?._id,
          text: messageText,
          imageUrl: isImage ? fileUrl : "",
          fileUrl: !isImage && fileUrl ? fileUrl : "",
          fileName: fileName,
          msgByUserId: user?._id,
        };

        console.log("Sending group message:", {
          conversationId: selectedChat.userDetails?._id,
          hasText: !!messageText.trim(),
          hasFile: !!fileUrl,
        });

        socketConnection.emit("newGroupMessage", groupMessage);
      } else {
        // Send direct message
        const newMessage = {
          sender: user._id,
          receiver: selectedChat?.userDetails?._id,
          text: messageText,
          imageUrl: isImage ? fileUrl : "",
          fileUrl: !isImage && fileUrl ? fileUrl : "",
          fileName: fileName,
          msgByUserId: user?._id,
        };

        console.log("Sending direct message:", {
          receiver: selectedChat?.userDetails?._id,
          hasText: !!messageText.trim(),
          hasFile: !!fileUrl,
        });

        socketConnection.emit("newMessage", newMessage);
      }

      setMessageText("");
      setSelectedFile(null);
      setIsUploading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setIsUploading(false);
    }
  };

  const toggleMediaOptions = () => {
    setShowMediaOptions(!showMediaOptions);
  };

  const hideMediaOptionsAndPick = (pickFunction) => {
    setShowMediaOptions(false);
    pickFunction();
  };

  const handleEditMessage = (message) => {
    console.log("Editing message:", message);
    setEditingMessage(message);
    setMessageText(message.text || "");
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Fix the handleDeleteMessage function to ensure it works properly
  const handleDeleteMessage = (messageId) => {
    console.log("Handling message deletion for ID:", messageId);

    if (!socketConnection) {
      console.error("Socket connection is not available");
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    if (!messageId) {
      console.error("Invalid message ID:", messageId);
      Alert.alert("Lỗi", "Mã tin nhắn không hợp lệ.");
      return;
    }

    try {
      const deletePayload = {
        messageId: messageId,
        conversationId: selectedChat.userDetails?._id,
        userId: user._id,
        isGroup: selectedChat.isGroup || selectedChat.userDetails?.isGroup
      };

      console.log("Sending delete payload:", deletePayload);

      // Emit event and set up listener for response in one operation
      socketConnection.emit("deleteMessage", deletePayload);

      // Set up a specific one-time listener for deletion response
      socketConnection.once("messageDeleted", (response) => {
        console.log("Server response to deletion:", response);
        if (response.success) {
          console.log("Message deleted successfully");
          // Optional: Update the local messages list to reflect the deletion
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        } else {
          console.error("Failed to delete message:", response.message);
          Alert.alert("Lỗi", response.message || "Không thể xóa tin nhắn.");
        }
      });
    } catch (error) {
      console.error("Error in handleDeleteMessage:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa tin nhắn. Vui lòng thử lại.");
    }
  };

  // Add the handleAddReaction function to handle emoji reactions
  const handleAddReaction = (messageId, emoji) => {
    console.log("Adding reaction:", emoji, "to message:", messageId);

    if (!socketConnection) {
      console.error("Socket connection is not available");
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    if (!messageId) {
      console.error("Invalid message ID:", messageId);
      return;
    }

    try {
      socketConnection.emit("addReaction", {
        messageId,
        conversationId: selectedChat.userDetails?._id,
        emoji,
        userId: user._id,
        isGroup: selectedChat.isGroup || selectedChat.userDetails?.isGroup
      });

      console.log("Reaction event emitted:", {
        messageId,
        emoji,
        userId: user._id,
        isGroup: selectedChat.isGroup || selectedChat.userDetails?.isGroup
      });
    } catch (error) {
      console.error("Error sending reaction:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm cảm xúc. Vui lòng thử lại.");
    }
  };

  const renderMessage = ({ item }) => {
    if (item.text && (
      item.text.includes("đã tạo nhóm") ||
      item.text.includes("đã thêm") ||
      item.text.includes("vào nhóm") ||
      item.text.includes("đã rời khỏi nhóm")
    )) {
      return (
        <View className="flex justify-center my-1">
          <View className="bg-white rounded-full px-3 py-1 self-center">
            <Text className="text-xs text-gray-500">{item.text}</Text>
          </View>
        </View>
      );
    }

    const isCurrentUser = item.msgByUserId === user._id;
    const senderName = selectedChat?.isGroup && !isCurrentUser
      ? selectedChat.members?.find(m => m._id === item.msgByUserId)?.name || "Unknown"
      : "";

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        userProfilePic={chatUser?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser?.name || "User")}`}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReaction={handleAddReaction} // Now properly defined
        senderName={senderName}
        isGroupChat={selectedChat?.isGroup}
        onImagePress={(imageUrl) => handleImageClick(imageUrl)}
      />
    );
  };

  const renderConversationItem = ({ item: chatItem }) => (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b border-gray-100"
      onPress={() => handleSelectChat(chatItem)}
      onLongPress={() => chatItem.isGroup && handleShowGroupInfo(chatItem)}
    >
      <View className="relative">
        <Image
          source={{ uri: chatItem?.userDetails?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatItem?.userDetails?.name || "User")}` }}
          className="w-12 h-12 rounded-full"
        />
        {chatItem?.isGroup && (
          <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full h-4 w-4 items-center justify-center">
            <FontAwesomeIcon icon={faUsers} size={10} color="#fff" />
          </View>
        )}
      </View>
      <View className="ml-3 flex-1 overflow-hidden">
        <Text className="text-[15px] font-semibold">{chatItem?.userDetails?.name}</Text>
        <Text numberOfLines={1} className="text-gray-500 text-sm">
          {chatItem?.isGroup ? (
            <>
              {chatItem?.latestMessage?.msgByUserId === user?._id ? (
                <Text>Bạn: </Text>
              ) : (
                <Text>
                  {chatItem?.members?.find((m) => m._id === chatItem?.latestMessage?.msgByUserId)
                    ?.name + ":" || ""}
                </Text>
              )}
            </>
          ) : (
            <>{chatItem?.latestMessage?.msgByUserId !== chatItem?.userDetails?._id ? <Text>Bạn: </Text> : null}</>
          )}
          {chatItem?.latestMessage?.text && chatItem?.latestMessage?.text}
          {chatItem?.latestMessage?.imageUrl && (
            <>
              <FontAwesomeIcon icon={faImage} size={15} color="#ccc" />
              <Text>
                {chatItem?.latestMessage?.fileName
                  ? ` ${chatItem?.latestMessage?.fileName}`
                  : " Hình ảnh"}
              </Text>
            </>
          )}
          {chatItem?.latestMessage?.fileUrl && (
            <>
              <FontAwesomeIcon icon={faFilePen} size={15} color="#ccc" />
              <Text>{chatItem?.latestMessage?.fileName}</Text>
            </>
          )}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-xs text-gray-500">
          {chatItem?.latestMessage?.createdAt &&
            new Date(chatItem?.latestMessage?.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
        </Text>
        {chatItem?.unseenMessages > 0 && (
          <View className="bg-red-700 rounded-full h-5 w-5 items-center justify-center mt-1">
            <Text className="text-white text-xs">{chatItem?.unseenMessages}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const loadUsersForGroup = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.get("http://localhost:5000/api/all-friends", {
        withCredentials: true,
      });
      setAllAvailableUsers(response.data.data || []);
    } catch (error) {
      console.error("Error loading friends:", error);
      Alert.alert("Error", "Could not load friends list");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    if (selectedUsers.length < 2) {
      Alert.alert("Error", "Please select at least 2 users");
      return;
    }

    if (socketConnection) {
      socketConnection.emit("createGroupChat", {
        name: groupName,
        members: [...selectedUsers, user._id],
        creator: user._id
      });

      socketConnection.once("groupCreated", (response) => {
        if (response.success) {
          Alert.alert("Success", response.message);
          setShowCreateGroupModal(false);
          setGroupName("");
          setSelectedUsers([]);
        } else {
          Alert.alert("Error", response.message || "Could not create group");
        }
      });
    }
  };

  const handleAddMembersToGroup = (groupId) => {
    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please select users to add");
      return;
    }

    if (socketConnection) {
      socketConnection.emit("addMembersToGroup", {
        groupId: groupId,
        newMembers: selectedUsers,
        addedBy: user._id
      });

      socketConnection.once("membersAddedToGroup", (response) => {
        if (response.success) {
          Alert.alert("Success", response.message);
          setSelectedUsers([]);
          setShowGroupInfoModal(false);
        } else {
          Alert.alert("Error", response.message || "Could not add members");
        }
      });
    }
  };

  const handleRemoveMember = (groupId, memberId) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (socketConnection) {
              socketConnection.emit("removeMemberFromGroup", {
                groupId: groupId,
                memberId: memberId,
                adminId: user._id
              });

              socketConnection.once("memberRemovedFromGroup", (response) => {
                if (response.success) {
                  Alert.alert("Success", response.message);
                  if (selectedChat && selectedChat._id === groupId) {
                    socketConnection.emit("joinRoom", groupId);
                  }
                } else {
                  Alert.alert("Error", response.message || "Could not remove member");
                }
              });
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = (groupId) => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            if (socketConnection) {
              socketConnection.emit("leaveGroup", {
                groupId: groupId,
                userId: user._id
              });

              socketConnection.once("leftGroup", (response) => {
                if (response.success) {
                  Alert.alert("Success", response.message);
                  handleBackToList();
                } else {
                  Alert.alert("Error", response.message || "Could not leave group");
                }
              });
            }
          }
        }
      ]
    );
  };

  const handleShowGroupInfo = (group) => {
    setCurrentGroupInfo(group);
    setShowGroupInfoModal(true);
    loadUsersForGroup();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      {!selectedChat ? (
        <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
          <View className="flex-row items-center bg-white rounded-full px-3 py-1 flex-1 mr-2">
            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
            <TextInput
              placeholder="Tìm kiếm"
              className="ml-2 flex-1 text-sm"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity className="mx-1">
            <FontAwesomeIcon icon={faQrcode} size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="ml-1"
            onPress={() => setShowCreateGroupModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} size={18} color="white" />
            {friendRequestsCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">{friendRequestsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
          <TouchableOpacity onPress={handleBackToList} className="mr-2">
            <FontAwesomeIcon icon={faArrowLeft} size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-row items-center flex-1">
            {chatUser && (
              <>
                <Image
                  source={{ uri: chatUser?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser?.name || "Group")}` }}
                  className="w-9 h-9 rounded-full mr-2"
                />
                <View>
                  <Text className="text-white font-semibold">{chatUser?.name}</Text>
                  <Text className="text-white text-xs opacity-80">
                    {selectedChat.isGroup
                      ? `${selectedChat.members?.length || 0} members`
                      : (chatUser?.online ? 'Đang hoạt động' : 'Không hoạt động')}
                  </Text>
                </View>
              </>
            )}
          </View>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-4"
              onPress={() => selectedChat.isGroup && handleShowGroupInfo(selectedChat)}
            >
              <FontAwesomeIcon icon={faEllipsis} size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Searches */}
      {isSearchFocused && searchQuery.length === 0 && (
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center py-2 px-4 bg-gray-100">
            <Text className="text-gray-600 font-medium">Liên hệ đã tìm</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                className="bg-blue-500 px-3 py-1 rounded-full mr-3"
                onPress={() => setIsSearchFocused(false)}
              >
                <Text className="text-white font-medium">Quay lại</Text>
              </TouchableOpacity>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={clearAllRecentSearches}>
                  <FontAwesomeIcon icon={faTrash} size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {recentSearches.length > 0 ? (
            <FlatList
              data={recentSearches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center p-3 border-b border-gray-100 justify-between"
                  onPress={() => searchFromHistory(item.query)}
                >
                  <View className="flex-row items-center flex-1">
                    <FontAwesomeIcon icon={faHistory} size={16} color="#888" className="mr-3" />
                    {item.firstResult ? (
                      <View className="flex-row items-center flex-1">
                        {item.firstResult.profilePic ? (
                          <Image
                            source={{ uri: item.firstResult.profilePic }}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-3">
                            <Text className="text-white font-bold">
                              {(item.firstResult.name || "")?.charAt(0)?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-gray-700">{item.query}</Text>
                          <Text className="text-sm text-gray-500">{item.firstResult.name}</Text>
                        </View>
                      </View>
                    ) : (
                      <Text className="text-gray-700">{item.query}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeSearchItem(item.id);
                    }}
                    className="px-2"
                  >
                    <FontAwesomeIcon icon={faTimes} size={14} color="#888" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-gray-500">Không có lịch sử tìm kiếm</Text>
            </View>
          )}
        </View>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View className="flex-1 bg-white">
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
            ListHeaderComponent={() => (
              <View className="p-2 bg-gray-100">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Kết quả tìm kiếm ({searchResults.length})</Text>
                  <TouchableOpacity
                    className="bg-blue-500 px-3 py-1 rounded-full"
                    onPress={() => {
                      clearSearch();
                      setIsSearchFocused(false);
                    }}
                  >
                    <Text className="text-white font-medium">Tất cả</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View className="p-4 items-center justify-center">
                <Text className="text-gray-500">
                  {searchLoading ? "Đang tìm kiếm..." : "Không tìm thấy kết quả"}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Loading State */}
      {searchLoading && !searchResults.length && (
        <View className="p-4 items-center justify-center">
          <Text className="text-gray-500">Đang tìm kiếm...</Text>
        </View>
      )}

      {/* Chat Messages or Conversation List */}
      {selectedChat ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 30}
        >
          {isChatLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Đang tải tin nhắn...</Text>
            </View>
          ) : (
            <FlatList
              ref={messagesEndRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingVertical: 15 }}
              onContentSizeChange={() => messagesEndRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => messagesEndRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* File Preview Area */}
          {selectedFile && (
            <View className="bg-gray-100 p-3 border-t border-gray-300">
              <View className="flex-row justify-between items-center">
                <Text className="font-medium">File đã chọn</Text>
                <TouchableOpacity onPress={handleClearUploadFile}>
                  <FontAwesomeIcon icon={faTimes} size={20} color="#888" />
                </TouchableOpacity>
              </View>
              <View className="mt-2">{renderFilePreview()}</View>
            </View>
          )}

          {/* Add editing indicator above message input */}
          {editingMessage && (
            <View className="bg-blue-50 px-4 py-2 flex-row justify-between items-center border-t border-blue-100">
              <Text className="text-blue-600 font-medium">Đang chỉnh sửa tin nhắn</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingMessage(null);
                  setMessageText("");
                }}
              >
                <FontAwesomeIcon icon={faXmark} size={18} color="#555" />
              </TouchableOpacity>
            </View>
          )}

          {/* Message Input */}
          <View className="flex-row items-center bg-gray-100 p-2">
            <View className="relative">
              <TouchableOpacity className="mx-2" onPress={toggleMediaOptions}>
                <FontAwesomeIcon icon={faPlus} size={20} color="#555" />
              </TouchableOpacity>
              {/* Media Options Menu */}
              {showMediaOptions && (
                <View className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 w-48 border border-gray-200">
                  <TouchableOpacity
                    className="flex-row items-center p-3"
                    onPress={() => hideMediaOptionsAndPick(takePhoto)}
                  >
                    <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faCamera} size={16} color="#fff" />
                    </View>
                    <Text>Chụp ảnh/video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center p-3"
                    onPress={() => hideMediaOptionsAndPick(pickImage)}
                  >
                    <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faImage} size={16} color="#fff" />
                    </View>
                    <Text>Chọn từ thư viện</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center p-3"
                    onPress={() => hideMediaOptionsAndPick(pickDocument)}
                  >
                    <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faFilePen} size={16} color="#fff" />
                    </View>
                    <Text>Chọn tài liệu</Text>
                  </TouchableOpacity>
                  {/* Close button */}
                  <TouchableOpacity
                    className="absolute top-1 right-1 p-1"
                    onPress={() => setShowMediaOptions(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} size={14} color="#888" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TextInput
              ref={inputRef}
              className="flex-1 bg-white rounded-full px-4 py-2 mr-2"
              placeholder={editingMessage ? "Chỉnh sửa tin nhắn..." : "Aa"}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              onFocus={() => setShowMediaOptions(false)}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!messageText.trim() && !selectedFile) || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#0084ff" />
              ) : (
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  size={20}
                  color={(messageText.trim() || selectedFile) ? "#0084ff" : "#aaa"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          {!searchResults.length && !searchLoading && !isSearchFocused && (
            <View className="flex-1">
              <View className="flex-row items-center border-b border-gray-300 px-4">
                <View className="h-8">
                  <TouchableOpacity className="mr-3 h-full border-b-2 border-blue-500">
                    <Text className="text-[13px] font-semibold text-blue-500">Tất cả</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <TouchableOpacity>
                    <Text className="text-[13px] font-semibold text-gray-500">Chưa đọc</Text>
                  </TouchableOpacity>
                </View>
                <View className="ml-auto flex-row items-center">
                  <TouchableOpacity className="flex-row items-center gap-x-2 pl-2 pr-1">
                    <Text className="text-[13px]">Phân loại</Text>
                    <FontAwesomeIcon icon={faAngleDown} size={12} />
                  </TouchableOpacity>
                  <TouchableOpacity className="ml-4">
                    <FontAwesomeIcon icon={faEllipsis} size={12} />
                  </TouchableOpacity>
                </View>
              </View>
              {allUsers.length > 0 ? (
                <FlatList
                  data={allUsers}
                  renderItem={renderConversationItem}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={{ flexGrow: 1 }}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-500">Không có cuộc hội thoại nào</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
          <View className="bg-white w-[90%] rounded-xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Create New Group</Text>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="border border-gray-300 rounded-lg p-2 mb-4"
              placeholder="Group Name"
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text className="font-semibold mb-2">Select Members ({selectedUsers.length}/20):</Text>

            {isLoadingUsers ? (
              <ActivityIndicator size="small" color="#0084ff" />
            ) : (
              <FlatList
                data={allAvailableUsers}
                keyExtractor={(item) => item._id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`flex-row items-center p-2 border-b border-gray-100 ${selectedUsers.includes(item._id) ? 'bg-blue-50' : ''}`}
                    onPress={() => toggleUserSelection(item._id)}
                  >
                    <Image
                      source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}` }}
                      className="w-10 h-10 rounded-full"
                    />
                    <Text className="ml-3 flex-1">{item.name}</Text>
                    {selectedUsers.includes(item._id) && (
                      <View className="h-6 w-6 bg-blue-500 rounded-full items-center justify-center">
                        <FontAwesomeIcon icon={faCheck} size={12} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <Text className="text-center text-gray-500 py-4">No friends available</Text>
                )}
              />
            )}

            <TouchableOpacity
              className={`mt-4 py-3 rounded-lg items-center ${groupName.trim() && selectedUsers.length >= 2 ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              onPress={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length < 2}
            >
              <Text className="text-white font-semibold">Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupInfoModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
          <View className="bg-white w-[90%] rounded-xl p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Group Info</Text>
              <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}>
                <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {currentGroupInfo && (
              <>
                <View className="items-center mb-4">
                  <Image
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentGroupInfo.name || "Group")}&background=random` }}
                    className="w-20 h-20 rounded-full mb-2"
                  />
                  <Text className="text-lg font-bold">{currentGroupInfo.name}</Text>
                  <Text className="text-sm text-gray-500">{currentGroupInfo.members?.length || 0} members</Text>
                </View>

                <View className="border-t border-b border-gray-200 py-4 mb-4">
                  <Text className="font-semibold mb-2">Members:</Text>
                  <FlatList
                    data={currentGroupInfo.members}
                    keyExtractor={(item) => item._id || item}
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }) => {
                      const memberId = item._id || item;
                      const isCurrentUser = memberId === user._id;
                      const isAdmin = currentGroupInfo.groupAdmin === memberId || currentGroupInfo.groupAdmin?._id === memberId;

                      return (
                        <View className="flex-row items-center justify-between py-2">
                          <View className="flex-row items-center">
                            <Image
                              source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "User")}` }}
                              className="w-8 h-8 rounded-full mr-2"
                            />
                            <Text>{item.name || (isCurrentUser ? 'You' : 'User')}</Text>
                            {isAdmin && (
                              <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                                <Text className="text-xs text-blue-600">Admin</Text>
                              </View>
                            )}
                            {isCurrentUser && !isAdmin && (
                              <View className="ml-2 px-2 py-0.5 bg-gray-100 rounded">
                                <Text className="text-xs text-gray-600">You</Text>
                              </View>
                            )}
                          </View>

                          {isAdmin && !isCurrentUser && (
                            <TouchableOpacity
                              className="px-2 py-1 bg-red-500 rounded"
                              onPress={() => handleRemoveMember(currentGroupInfo._id, memberId)}
                            >
                              <Text className="text-white text-xs">Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    }}
                  />
                </View>

                <View className="flex-row justify-between">
                  {currentGroupInfo.groupAdmin === user._id || currentGroupInfo.groupAdmin?._id === user._id ? (
                    <>
                      <TouchableOpacity
                        className="bg-blue-500 px-4 py-2 rounded-lg"
                        onPress={() => {
                          setShowGroupInfoModal(false);
                          loadUsersForGroup();
                        }}
                      >
                        <Text className="text-white">Add Members</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="bg-red-500 px-4 py-2 rounded-lg"
                        onPress={() => {
                          setShowGroupInfoModal(false);
                          handleDeleteConversation();
                        }}
                      >
                        <Text className="text-white">Delete Group</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      className="bg-red-500 px-4 py-2 rounded-lg"
                      onPress={() => {
                        setShowGroupInfoModal(false);
                        handleLeaveGroup(currentGroupInfo._id);
                      }}
                    >
                      <Text className="text-white">Leave Group</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Image viewer modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-90 justify-center items-center">
          <TouchableOpacity
            className="absolute top-10 right-5 z-10"
            onPress={() => setShowImageModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            className="w-full h-3/4"
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}