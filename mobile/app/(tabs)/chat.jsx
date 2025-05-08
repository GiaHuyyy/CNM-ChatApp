import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, TextInput, TouchableOpacity, FlatList, Text, Image, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Linking } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode, faTimes, faHistory, faTrash, faImage, faFilePen, faUsers, faAngleDown, faEllipsis, faArrowLeft, faPaperPlane, faFile, faFileImage, faFileVideo, faFileAlt, faCamera, faCheck, faXmark, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";
import axios from "axios";
// import { useNavigation } from "@react-navigation/native";
import { setUser, setToken } from "../redux/userSlice";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import uploadFileToCloud from "../../helpers/uploadFileToCloud";
import { Video } from 'expo-av';
import MessageBubble from "../../components/MessageBubble";
import ConfirmationModal from "../../components/ConfirmationModal";
import CreateGroupChat from "../../components/CreateGroupChat";
import GroupChatItem from "../../components/GroupChatItem";
import GroupInfoModal from "../../components/GroupInfoModal";
import { router } from "expo-router";
import { REACT_APP_BACKEND_URL } from "@env";

export default function Chat() {
  const dispatch = useDispatch();
  // const navigation = useNavigation();
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
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [currentGroupInfo, setCurrentGroupInfo] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchGroupUsers, setSearchGroupUsers] = useState("");

  // Add state for tracking which message is being edited
  const [editingMessage, setEditingMessage] = useState(null);

  // Add a ref for the input field
  const inputRef = useRef(null);

  // Add a state to track if app is initialized
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const initializationAttempted = useRef(false);

  // Add state to track if all conversations should be shown
  const [showAllConversations, setShowAllConversations] = useState(false);

  // Add these new states for improved group management
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    action: null
  });

  // Enhanced initialization effect that runs only once on app load
  useEffect(() => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initializeApp = async () => {
      try {
        console.log("Initializing app...");
        setLoading(true);

        // Check for existing token
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.log("No token found, redirecting to login");
          setLoading(false);
          
          router.replace("/(auth)/sign-in");
          return;
        }

        console.log("Token found, fetching user details");

        // Set token in redux (if not already set)
        dispatch(setToken(token));

        // Fetch user details
        const response = await axios.get(`${REACT_APP_BACKEND_URL}/api/user-details`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        });

        // Update user in redux
        if (response?.data?.data) {
          dispatch(setUser(response.data.data));
          console.log("User details fetched successfully");
        }

        // Connect socket with token
        await connectSocket(token);

        setIsAppInitialized(true);
      } catch (error) {
        console.error("Error initializing app:", error.message);
        Alert.alert(
          "Connection Error",
          "Could not connect to the server. Please check your internet connection and try again.",
          [{ text: "Retry", onPress: initializeApp }]
        );
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Separate the socket connection logic to reuse it
  const connectSocket = async (token) => {
    try {
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }

      if (!token) {
        console.error("No token available for socket connection");
        return null;
      }

      const socket = io(`${REACT_APP_BACKEND_URL}`, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        console.log("🔌 Socket connected: ", socket.id);
        // When socket connects, immediately request sidebar data
        if (user?._id) {
          socket.emit("sidebar", user?._id);
        }
      });

      socket.on("onlineUser", (data) => {
        console.log("🟢 Online users: ", data);
        dispatch(setOnlineUser(data));
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      // Set socket in context and local state
      setSocketConnection(socket);
      setSocketConnectionState(socket);

      return socket;
    } catch (err) {
      console.error("Socket connection error:", err);
      return null;
    }
  };

  // Modified useEffect that depends on user and socket initialization
  useEffect(() => {
    if (!socketConnection || !user?._id || !isAppInitialized) return;

    console.log("Fetching conversations for user:", user?._id);
    socketConnection.emit("sidebar", user?._id);

    // Set up the conversation listener
    socketConnection.on("conversation", (data) => {
      console.log("Received conversations:", Array.isArray(data) ? data.length : "not an array");
      if (data) {
        // Ensure data is an array before setting state
        const conversationsArray = Array.isArray(data) ? data : [];
        setAllUsers(conversationsArray);

        // Store conversations in AsyncStorage for offline access
        try {
          AsyncStorage.setItem('cachedConversations', JSON.stringify(conversationsArray));
        } catch (error) {
          console.error("Error caching conversations:", error);
        }
      }
    });

    // Load cached conversations while waiting for server response
    const loadCachedConversations = async () => {
      try {
        const cachedData = await AsyncStorage.getItem('cachedConversations');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setAllUsers(parsedData);
          console.log("Loaded cached conversations:", parsedData.length);
        }
      } catch (error) {
        console.error("Error loading cached conversations:", error);
      }
    };

    loadCachedConversations();

    return () => {
      socketConnection.off("conversation");
    };
  }, [socketConnection, user?._id, isAppInitialized]);

  // useEffect(() => {
  //   const fetchFriendRequestsCount = async () => {
  //     try {
  //       const response = await axios.get(
  //         `http://192.168.1.204:5000/api/pending-friend-requests`,
  //         { withCredentials: true }
  //       );
  //       setFriendRequestsCount(response.data.data.length);
  //     } catch (error) {
  //       console.error("Error fetching friend requests:", error);
  //     }
  //   };

  //   fetchFriendRequestsCount();

  //   const interval = setInterval(fetchFriendRequestsCount, 30000);

  //   return () => clearInterval(interval);
  // }, []);

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
              "http://192.168.1.204:5000/api/search-friend-user",
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

  // const navigateToChat = (chatId) => {
  //   navigation.navigate('Messages', { chatId });
  // };

  const handleSelectChat = (chatItem) => {
    if (!socketConnection) {
      // Try to reconnect socket if not connected
      connectSocket().then(socket => {
        if (socket) {
          setSocketConnectionState(socket);
          setSocketConnection(socket);
          // Delay selecting chat to ensure socket is ready
          setTimeout(() => handleSelectChat(chatItem), 500);
        } else {
          Alert.alert("Connection Error", "Could not connect to the chat server.");
        }
      });
      return;
    }

    setIsChatLoading(true);
    setSelectedChat(chatItem);

    // Add array check before mapping
    setAllUsers(prev => {
      if (!Array.isArray(prev)) {
        console.warn("allUsers is not an array:", prev);
        return [chatItem]; // Return a new array with just this chat item
      }
      return prev.map(item =>
        item._id === chatItem._id ? { ...item, unseenMessages: 0 } : item
      );
    });

    setSeenMessage(true);

    // Clear any existing messages to prevent showing old messages while loading
    setMessages([]);

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

    // Save last selected chat for history, but don't auto-restore
    // This is only for tracking purposes now
    try {
      AsyncStorage.setItem('lastSelectedChat', JSON.stringify(chatItem));
    } catch (error) {
      console.error("Error saving last selected chat:", error);
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

  // Update the global socket connection setup to add debugging for group-related events
  useEffect(() => {
    if (!socketConnection || !user?._id) return;

    // Add a listener for member removal response
    socketConnection.on("memberRemovedFromGroup", (response) => {
      console.log("Received memberRemovedFromGroup event:", response);
      if (response.success) {
        refreshConversations();
      }
    });

    // Add a listener for being removed from a group
    socketConnection.on("removedFromGroup", (data) => {
      console.log("You were removed from a group:", data);

      // If you are viewing that group, go back to conversation list
      if (selectedChat?.userDetails?._id === data.groupId) {
        handleBackToList();
      }

      refreshConversations();
    });

    return () => {
      socketConnection.off("memberRemovedFromGroup");
      socketConnection.off("removedFromGroup");
    };
  }, [socketConnection, user?._id, selectedChat]);

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

      socketConnection.emit("deleteMessage", deletePayload);

      socketConnection.once("messageDeleted", (response) => {
        console.log("Server response to deletion:", response);
        if (response.success) {
          console.log("Message deleted successfully");
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
        onReaction={handleAddReaction}
        senderName={senderName}
        isGroupChat={selectedChat?.isGroup}
        onImagePress={(imageUrl) => handleImageClick(imageUrl)}
      />
    );
  };

  const refreshConversations = () => {
    if (socketConnection && user?._id) {
      console.log("Refreshing conversations for user:", user._id);
      socketConnection.emit("sidebar", user._id);
    }
  };

  const renderConversationItem = ({ item: chatItem }) => {
    // Check if this is a group chat
    if (chatItem.isGroup || chatItem.userDetails?.isGroup) {
      return (
        <GroupChatItem
          group={chatItem}
          onPress={handleSelectChat}
          currentUserId={user?._id}
          onLongPress={handleShowGroupInfo}
        />
      );
    }

    // Original code for direct chat items
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
        onPress={() => handleSelectChat(chatItem)}
      >
        <View className="relative">
          <Image
            source={{ uri: chatItem?.userDetails?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatItem?.userDetails?.name || "User")}` }}
            className="w-12 h-12 rounded-full"
          />
        </View>
        <View className="ml-3 flex-1 overflow-hidden">
          <Text className="text-[15px] font-semibold">{chatItem?.userDetails?.name}</Text>
          <Text numberOfLines={1} className="text-gray-500 text-sm">
            {chatItem?.latestMessage?.msgByUserId !== chatItem?.userDetails?._id ? <Text>Bạn: </Text> : null}
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
  };

  const handleShowGroupInfo = (group) => {
    setCurrentGroupInfo(group);
    setShowGroupInfoModal(true);
  };

  const handleLeaveGroup = (groupId) => {
    if (!socketConnection || !groupId) return;

    setConfirmModal({
      visible: true,
      title: "Rời khỏi nhóm",
      message: "Bạn có chắc muốn rời khỏi nhóm chat này?",
      action: () => {
        socketConnection.emit("leaveGroup", {
          groupId: groupId,
          userId: user._id
        });

        socketConnection.once("leftGroup", (response) => {
          if (response.success) {
            Alert.alert("Thành công", response.message);
            handleBackToList();
            refreshConversations();
          } else {
            Alert.alert("Lỗi", response.message || "Không thể rời khỏi nhóm");
          }
        });
      }
    });
  };

  const handleDeleteGroup = (groupId) => {
    if (!socketConnection || !groupId) return;

    setConfirmModal({
      visible: true,
      title: "Xóa nhóm",
      message: "Bạn có chắc muốn xóa nhóm chat này? Hành động này không thể hoàn tác.",
      action: () => {
        socketConnection.emit("deleteGroup", {
          groupId: groupId,
          adminId: user._id
        });

        socketConnection.once("groupDeleted", (response) => {
          if (response.success) {
            Alert.alert("Thành công", response.message);
            handleBackToList();
            refreshConversations();
          } else {
            Alert.alert("Lỗi", response.message || "Không thể xóa nhóm");
          }
        });
      }
    });
  };

  const renderCreateGroupModal = () => (
    <CreateGroupChat
      visible={showCreateGroupModal}
      onClose={() => setShowCreateGroupModal(false)}
      socketConnection={socketConnection}
      userId={user?._id}
      onGroupCreated={refreshConversations}
    />
  );

  const renderGroupInfoModal = () => (
    <GroupInfoModal
      visible={showGroupInfoModal}
      onClose={() => {
        setShowGroupInfoModal(false);
        // Force refresh conversations when modal closes
        setTimeout(() => refreshConversations(), 500);
      }}
      group={currentGroupInfo}
      currentUserId={user?._id}
      onLeaveGroup={() => handleLeaveGroup(currentGroupInfo?._id)}
      onDeleteGroup={() => handleDeleteGroup(currentGroupInfo?._id)}
      socketConnection={socketConnection}
    />
  );

  const renderConfirmationModal = () => (
    <ConfirmationModal
      visible={confirmModal.visible}
      title={confirmModal.title}
      message={confirmModal.message}
      onConfirm={() => {
        if (confirmModal.action) {
          confirmModal.action();
        }
        setConfirmModal({ ...confirmModal, visible: false });
      }}
      onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      type="warning"
    />
  );

  const displayedConversations = useMemo(() => {
    if (!Array.isArray(allUsers)) return [];

    const sortedConversations = [...allUsers].sort((a, b) => {
      const timeA = a?.latestMessage?.createdAt ? new Date(a.latestMessage.createdAt) : new Date(0);
      const timeB = b?.latestMessage?.createdAt ? new Date(b.latestMessage.createdAt) : new Date(0);
      return timeB - timeA;
    });

    return showAllConversations ? sortedConversations : sortedConversations.slice(0, 7);
  }, [allUsers, showAllConversations]);

  const toggleShowAllConversations = () => {
    setShowAllConversations(prevState => !prevState);
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
            {/* {friendRequestsCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">{friendRequestsCount}</Text>
              </View>
            )} */}
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
                <View className="flex-1">
                  <FlatList
                    data={displayedConversations}
                    renderItem={renderConversationItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ flexGrow: 1 }}
                  />

                  {(Array.isArray(allUsers) && allUsers.length > 10) && (
                    <TouchableOpacity
                      className="py-3 border-t border-gray-200 items-center bg-gray-50"
                      onPress={toggleShowAllConversations}
                    >
                      <Text className="text-blue-500 font-medium">
                        {showAllConversations ? "Hiển thị ít hơn" : `Xem tất cả (${allUsers.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-500">Không có cuộc hội thoại nào</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Add all modals at the end of the component */}
      {renderCreateGroupModal()}
      {renderGroupInfoModal()}
      {renderConfirmationModal()}

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