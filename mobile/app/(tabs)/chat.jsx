import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, TextInput, TouchableOpacity, TouchableWithoutFeedback, FlatList, Text, Image, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Linking, Animated, StatusBar, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode, faTimes, faHistory, faTrash, faImage, faFilePen, faUsers, faAngleDown, faEllipsis, faArrowLeft, faPaperPlane, faFile, faFileImage, faFileVideo, faFileAlt, faCamera, faCheck, faXmark, faUserShield, faDownload, faPhone, faVideo, faSearch, faArrowDown, faShare } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";
import axios from "axios";
import { setUser, setToken } from "../redux/userSlice";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import uploadFileToCloud from "../../helpers/uploadFileToCloud";
import { Video } from 'expo-av';
import MessageBubble from "../../components/MessageBubble";
// Remove ConfirmationModal import
import CreateGroupChat from "../../components/CreateGroupChat";
import GroupChatItem from "../../components/GroupChatItem";
import GroupInfoModal from "../../components/GroupInfoModal";
import DirectChatDetailsModal from "../../components/DirectChatDetailsModal";
import GroupChatInfoModal from "../../components/GroupChatInfoModal";
import ShareMessageModal from "../../components/ShareMessageModal";
import AddGroupMembersModal from "../../components/AddGroupMembersModal";
import { router } from "expo-router";
import { REACT_APP_BACKEND_URL } from "@env";

const DEBUG_MODE = false; // Set to true only when debugging specific issues

export default function Chat() {
  const dispatch = useDispatch();
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

  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState("");

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ url: "", name: "" });

  const [showMediaOptions, setShowMediaOptions] = useState(false);

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [currentGroupInfo, setCurrentGroupInfo] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchGroupUsers, setSearchGroupUsers] = useState("");

  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const inputRef = useRef(null);

  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const initializationAttempted = useRef(false);

  const [showAllConversations, setShowAllConversations] = useState(false);
  const [forceRender, setForceRender] = useState(false);

  const [showDirectChatDetails, setShowDirectChatDetails] = useState(false);

  const [messageToShare, setMessageToShare] = useState(null);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState([]);

  // Add near the top with other refs
  const socketEventsInitialized = useRef(false);

  useEffect(() => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initializeApp = async () => {
      try {
        console.log("Initializing app...");
        setLoading(true);

        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.log("No token found, redirecting to login");
          setLoading(false);

          router.replace("/(auth)/sign-in");
          return;
        }

        console.log("Token found, fetching user details");

        dispatch(setToken(token));

        const response = await axios.get(`${REACT_APP_BACKEND_URL}/api/user-details`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        });

        if (response?.data?.data) {  // Fixed the missing opening parenthesis
          dispatch(setUser(response.data.data));
          console.log("User details fetched successfully");
        }

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

  const connectSocket = async (token) => {
    try {
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }

      if (!token) {
        console.error("No token available for socket connection");
        return null;
      }

      // Configure socket with logging disabled
      const socket = io(`${REACT_APP_BACKEND_URL}`, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        // Disable verbose socket.io logging
        debug: false,
        forceNew: false,
        transports: ['websocket'],
      });

      // Use a ref to track if we've already set up event handlers
      if (!socketEventsInitialized.current) {
        socket.on("connect", () => {
          if (DEBUG_MODE) console.log("Socket connected:", socket.id);
          if (user?._id) {
            socket.emit("sidebar", user?._id);
          }
        });

        socket.on("onlineUser", (data) => {
          if (DEBUG_MODE) console.log("Online users:", data);
          dispatch(setOnlineUser(data));
        });

        socket.on("connect_error", (error) => {
          if (DEBUG_MODE) console.error("Socket connection error:", error);
        });

        socketEventsInitialized.current = true;
      }

      setSocketConnection(socket);
      setSocketConnectionState(socket);

      return socket;
    } catch (err) {
      console.error("Socket connection error:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!socketConnection || !user?._id || !isAppInitialized) return;

    console.log("Fetching conversations for user:", user?._id);
    socketConnection.emit("sidebar", user?._id);

    socketConnection.on("conversation", (data) => {
      console.log("Received conversations:", Array.isArray(data) ? data.length : "not an array");
      if (data) {
        const conversationsArray = Array.isArray(data) ? data : [];
        setAllUsers(conversationsArray);

        try {
          AsyncStorage.setItem('cachedConversations', JSON.stringify(conversationsArray));
        } catch (error) {
          console.error("Error caching conversations:", error);
        }
      }
    });

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
            // Get the token for authentication
            const token = await AsyncStorage.getItem("token");
            if (!token) {
              console.error("No auth token available for search");
              setSearchResults([]);
              setSearchLoading(false);
              setIsSearching(false);
              return;
            }

            // Use the environment variable instead of hardcoded URL
            const response = await axios.post(
              `${REACT_APP_BACKEND_URL}/api/search-friend-user`,
              { search: searchQuery },
              { 
                headers: {
                  Authorization: `Bearer ${token}`
                },
                withCredentials: true 
              }
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
            
            // Show error alert for search failures
            if (error.response?.status === 401) {
              Alert.alert("Authentication Error", "Please login again to continue.");
            } else {
              Alert.alert("Search Error", "Failed to search. Please try again.");
            }
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
    const chatItem = {
      _id: Date.now().toString(),
      userDetails: {
        _id: userItem._id,
        name: userItem.name,
        profilePic: userItem.profilePic || userItem.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.name)}`,
        isGroup: !!userItem.isGroup
      },
      unseenMessages: 0
    };

    clearSearch();
    setIsSearchFocused(false);

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

  const handleSelectChat = (chatItem) => {
    if (!socketConnection) {
      connectSocket().then(socket => {
        if (socket) {
          setSocketConnectionState(socket);
          setSocketConnection(socket);
          setTimeout(() => handleSelectChat(chatItem), 500);
        } else {
          Alert.alert("Connection Error", "Could not connect to the chat server.");
        }
      });
      return;
    }

    setIsChatLoading(true);
    setSelectedChat(chatItem);

    setAllUsers(prev => {
      if (!Array.isArray(prev)) {
        console.warn("allUsers is not an array:", prev);
        return [chatItem];
      }
      return prev.map(item =>
        item._id === chatItem._id ? { ...item, unseenMessages: 0 } : item
      );
    });

    setSeenMessage(true);

    setMessages([]);

    if (selectedChat?.userDetails?._id) {
      socketConnection.emit("leaveRoom", selectedChat.userDetails._id);
    }

    const isGroup = chatItem.isGroup || chatItem.userDetails?.isGroup;
    console.log("Joining chat:", chatItem.userDetails._id, "isGroup:", isGroup);
    socketConnection.emit("joinRoom", chatItem.userDetails._id);

    if (isGroup) {
      socketConnection.emit("seenGroup", chatItem.userDetails._id);
    } else {
      socketConnection.emit("seen", chatItem.userDetails._id);
    }

    try {
      AsyncStorage.setItem('lastSelectedChat', JSON.stringify(chatItem));
    } catch (error) {
      console.error("Error saving last selected chat:", error);
    }
  };

  const handleBackToList = () => {
    console.log("Navigating back to chat list");
    setSelectedChat(null);
    setMessages([]);
    setChatUser(null);

    // Close any open modals
    setShowDirectChatDetails(false);
    setShowGroupInfoModal(false);

    // Force refresh of conversation list
    if (socketConnection && user?._id) {
      socketConnection.emit("sidebar", user._id);
    }
  };

  useEffect(() => {
    if (!socketConnection || !selectedChat) return;

    socketConnection.off("messageUser");
    socketConnection.off("message");
    socketConnection.off("groupMessage");
    socketConnection.off("error");
    socketConnection.off("newMessageReceived");
    socketConnection.off("messageSent");

    const handleMessageUser = (payload) => {
      console.log("Received user data:", payload);
      setChatUser(payload);
      setIsChatLoading(false);
    };

    const handleMessage = (conversation) => {
      console.log("Received direct messages:", conversation?.messages?.length || 0);
      if (conversation && Array.isArray(conversation.messages)) {
        conversation.messages.forEach(msg => {
          if (msg.imageUrl) {
            console.log(`Message ${msg._id} has image: ${msg.imageUrl}`);
          }
        });

        // Sort messages from newest to oldest for inverted FlatList
        // The backend likely returns oldest to newest, so we need to reverse
        const sortedMessages = [...conversation.messages].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        setMessages(sortedMessages);

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
        // Sort messages from newest to oldest for inverted FlatList
        const sortedMessages = [...groupData.messages].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        setMessages(sortedMessages);

        setChatUser({
          _id: groupData._id,
          name: groupData.name || "Group Chat",
          profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name || "Group")}&background=random`,
          isGroup: true,
          members: groupData.members || [],
          groupAdmin: groupData.groupAdmin,
        });

        if (groupData.messages.length > 0 && socketConnection) {
          socketConnection.emit("seenGroup", groupData._id);
        }
      } else {
        setMessages([]);
      }
      setIsChatLoading(false);
    };

    const handleMessageSent = (message) => {
      console.log("Message sent confirmation received:", message?._id);
      console.log("Message details:", {
        hasImage: !!message?.imageUrl,
        imageUrl: message?.imageUrl || 'none',
        hasText: !!message?.text,
        text: message?.text
      });

      setMessages(prevMessages => {
        const tempMessage = prevMessages.find(msg =>
          msg.isTemp &&
          ((msg.imageUrl && message.imageUrl && msg.imageUrl === message.imageUrl) ||
            (msg.text && message.text && msg.text === message.text))
        );

        if (tempMessage) {
          return prevMessages.map(msg =>
            msg._id === tempMessage._id ? { ...message, key: Date.now().toString() } : msg
          );
        }

        // For inverted list, add to beginning of array
        return [
          { ...message, key: Date.now().toString() },
          ...prevMessages.filter(msg =>
            !(msg.isTemp &&
              ((msg.imageUrl && message.imageUrl && msg.imageUrl === message.imageUrl) ||
                (msg.text && message.text && msg.text === message.text))))
        ];
      });

      // Scroll to the new message
      setTimeout(() => {
        messagesEndRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };

    const handleNewMessage = (newMessage) => {
      console.log("New message received:", {
        id: newMessage?._id,
        hasImage: !!newMessage?.imageUrl,
        imageUrl: newMessage?.imageUrl || 'none',
        hasText: !!newMessage?.text
      });

      if (newMessage &&
        ((selectedChat.userDetails?._id === newMessage.sender) ||
          (selectedChat.userDetails?._id === newMessage.receiver) ||
          (selectedChat.userDetails?._id === newMessage.conversationId))) {

        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg._id === newMessage._id);
          if (messageExists) return prevMessages;

          // For inverted list, add to beginning of array
          return [newMessage, ...prevMessages];
        });

        // Scroll to the new message
        setTimeout(() => {
          messagesEndRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    };

    const handleError = (error) => {
      console.error("Socket error:", error);
      setIsChatLoading(false);
      Alert.alert("Error", error.message || "Failed to load conversation");
    };

    socketConnection.on("messageUser", handleMessageUser);
    socketConnection.on("message", handleMessage);
    socketConnection.on("groupMessage", handleGroupMessage);
    socketConnection.on("newMessageReceived", handleNewMessage);
    socketConnection.on("messageSent", handleMessageSent);
    socketConnection.on("error", handleError);

    const isGroup = selectedChat.isGroup || selectedChat.userDetails?.isGroup;
    console.log("Joining room:", selectedChat?.userDetails?._id, "isGroup:", isGroup);
    socketConnection.emit("joinRoom", selectedChat?.userDetails?._id);

    return () => {
      socketConnection.off("messageUser", handleMessageUser);
      socketConnection.off("message", handleMessage);
      socketConnection.off("groupMessage", handleGroupMessage);
      socketConnection.off("newMessageReceived", handleNewMessage);
      socketConnection.off("messageSent", handleMessageSent);
      socketConnection.off("error", handleError);
    };
  }, [socketConnection, selectedChat]);

  // Remove or modify the scrollToEnd effect since we're using inverted mode
  useEffect(() => {
    // No need to automatically scroll to end with inverted list
  }, [messages]);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['image', 'video'],
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

        const newFile = {
          uri,
          fileName,
          mimeType,
          isVideo: mimeType.includes('video'),
          name: fileName,
          type: mimeType
        };

        setSelectedFiles(prev => [...prev, newFile]);
      }
    } catch (error) {
      console.error("Error using camera:", error);
      alert('Error accessing camera. Please try again.');
    }
  };

  // Update pickImage to preserve original filenames
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
        quality: 0.7,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        allowsMultipleSelection: true,
        exif: true // Get extra metadata when available
      });

      if (!result.canceled && result.assets.length > 0) {
        const newFiles = result.assets.map(asset => {
          const uri = asset.uri;

          // Get the file extension
          const fileExtension = uri.split('.').pop().toLowerCase();

          // Determine the MIME type
          const mimeType = asset.mimeType ||
            (fileExtension === 'mp4' ? 'video/mp4' :
              fileExtension === 'mov' ? 'video/quicktime' :
                fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
                  fileExtension === 'png' ? 'image/png' : 'application/octet-stream');

          const isVideo = mimeType.startsWith('video/');

          // Extract real filename from either fileName property or URI
          let originalName = '';

          if (asset.fileName) {
            originalName = asset.fileName;
          } else if (asset.assetId) {
            // For iOS assets with an assetId
            originalName = `${asset.assetId}.${fileExtension}`;
          } else {
            // Extract filename from URI
            const uriParts = uri.split('/');
            originalName = uriParts[uriParts.length - 1];

            // If the URI doesn't have a good filename, create one
            if (!originalName || originalName.indexOf('.') === -1) {
              originalName = `image_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
            }
          }

          console.log(`Selected file: ${originalName} (${mimeType})`);

          return {
            uri,
            fileName: originalName,
            originalName: originalName,
            mimeType,
            isVideo,
            name: originalName,
            type: mimeType,
            ...(Platform.OS === "web" && { file: asset.file })
          };
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
        console.log(`Added ${newFiles.length} media files with original names`);
      }
    } catch (error) {
      console.error("Error picking media:", error);
      alert('Error selecting media. Please try again.');
    }
  };

  // Update pickDocument to ensure original filenames are preserved
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: true
      });

      if (result.canceled === false && result.assets.length > 0) {
        const newDocuments = result.assets.map(asset => {
          const { uri, mimeType, name } = asset;

          if (!uri) {
            throw new Error("Document has no URI");
          }

          // The document picker usually provides the original filename in the name property
          const originalName = name || uri.split('/').pop() || `document_${Date.now()}`;

          console.log(`Selected document: ${originalName} (${mimeType})`);

          return {
            uri,
            fileName: originalName,
            originalName: originalName,
            mimeType,
            isDocument: true,
            name: originalName,
            type: mimeType,
            ...(Platform.OS === "web" && { file: asset.file })
          };
        });

        setSelectedFiles(prev => [...prev, ...newDocuments]);
        console.log(`Added ${newDocuments.length} documents with original names`);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alert('Error selecting document. Please try again.');
    }
  };

  const handleClearUploadFile = () => {
    setSelectedFiles([]);
  };

  const handleRemoveSingleFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const renderFilePreview = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <FlatList
        horizontal
        data={selectedFiles}
        keyExtractor={(_, index) => `file-${index}`}
        renderItem={({ item, index }) => renderSingleFilePreview(item, index)}
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ paddingRight: 15 }}
      />
    );
  };

  const renderSingleFilePreview = (file, index) => {
    if (file.isVideo) {
      return (
        <View className="p-2 bg-gray-200 rounded mx-2 relative">
          <Video
            source={{ uri: file.uri }}
            style={{ width: 120, height: 100 }}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-xs flex-1" numberOfLines={1}>{file.fileName || file.name}</Text>
          </View>
          <TouchableOpacity
            className="absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
            onPress={() => handleRemoveSingleFile(index)}
          >
            <FontAwesomeIcon icon={faTimes} size={10} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    } else if (file.mimeType?.startsWith('image') || file.type?.startsWith('image')) {
      return (
        <View className="p-2 bg-gray-200 rounded mx-2 relative">
          <Image
            source={{ uri: file.uri }}
            className="w-30 h-30 rounded"
            style={{ width: 120, height: 100 }}
            resizeMode="cover"
          />
          <Text className="text-xs" numberOfLines={1}>{file.fileName || file.name}</Text>
          <TouchableOpacity
            className="absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
            onPress={() => handleRemoveSingleFile(index)}
          >
            <FontAwesomeIcon icon={faTimes} size={10} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    } else {
      const fileIcon = (file.fileName || file.name)?.endsWith('.pdf') ? faFileAlt : faFilePen;

      return (
        <View className="p-3 bg-gray-200 rounded mx-2 relative" style={{ width: 120 }}>
          <FontAwesomeIcon
            icon={fileIcon}
            size={24}
            color="#555"
          />
          <Text className="text-xs mt-2" numberOfLines={2}>{file.fileName || file.name}</Text>
          <TouchableOpacity
            className="absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
            onPress={() => handleRemoveSingleFile(index)}
          >
            <FontAwesomeIcon icon={faTimes} size={10} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || !socketConnection || !selectedChat) return;

    setIsUploading(selectedFiles.length > 0);

    try {
      if (editingMessage) {
        socketConnection.emit("editMessage", {
          messageId: editingMessage._id,
          conversationId: selectedChat.userDetails?._id,
          text: messageText,
          userId: user._id,
          isGroup: selectedChat.isGroup || selectedChat.userDetails?.isGroup
        });

        setEditingMessage(null);
        setMessageText("");
        return;
      }

      let uploadedFiles = [];

      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          try {
            // Get the original filename
            const originalName = file.originalName || file.name || file.fileName || "unnamed file";
            console.log(`Preparing to upload file with original name: ${originalName}`);

            let fileToUpload;

            if (Platform.OS === "web") {
              if (file.file) {
                // For web File objects, preserve the name
                fileToUpload = new File(
                  [file.file],
                  originalName,
                  { type: file.type || file.mimeType || 'application/octet-stream' }
                );
              } else if (file.uri) {
                try {
                  const response = await fetch(file.uri);
                  const blob = await response.blob();

                  fileToUpload = new File(
                    [blob],
                    originalName,
                    { type: file.type || file.mimeType || 'image/jpeg' }
                  );
                } catch (fetchError) {
                  console.error("Error fetching file from URI:", fetchError);
                  const response = await fetch(file.uri);
                  const blob = await response.blob();
                  fileToUpload = blob;
                  // Attach the name to the blob for Cloudinary
                  blob.name = originalName;
                }
              } else {
                throw new Error("Invalid file format for upload");
              }
            } else {
              fileToUpload = {
                uri: file.uri,
                name: originalName,  // Use the original name for the upload
                originalName: originalName, // Preserve original name in an extra property
                type: file.mimeType || file.type || 'application/octet-stream'
              };
            }

            // Add original name to the file object for the upload
            fileToUpload.originalName = originalName;

            const uploadResult = await uploadFileToCloud(fileToUpload);

            if (!uploadResult || !uploadResult.secure_url) {
              throw new Error("Upload failed - no URL returned");
            }

            // Return the file info with the original filename
            return {
              url: uploadResult.secure_url,
              name: originalName, // Use original name consistently
              type: file.type || file.mimeType || "",
              isImage: (file.type?.startsWith('image/') || file.mimeType?.startsWith('image/'))
            };
          } catch (error) {
            console.error(`Error uploading file ${file.name || file.fileName}:`, error);
            return null;
          }
        });

        const results = await Promise.all(uploadPromises);
        uploadedFiles = results.filter(result => result !== null);

        if (selectedFiles.length > 0 && uploadedFiles.length === 0) {
          Alert.alert("Upload Failed", "Could not upload any files. Please try again.");
          setIsUploading(false);
          return;
        }
      }

      // Prepare reply info if replying to a message
      const replyInfo = replyingTo ? {
        messageId: replyingTo._id,
        text: replyingTo.text || "",
        sender: replyingTo.msgByUserId
      } : null;

      const isGroup = selectedChat.isGroup || selectedChat.userDetails?.isGroup;

      // Create temporary message with unique ID
      const tempId = `temp_${Date.now()}`;
      const tempMessage = {
        _id: tempId,
        text: messageText,
        msgByUserId: user?._id,
        createdAt: new Date().toISOString(),
        isTemp: true,
        key: tempId,
        files: uploadedFiles.map(file => ({
          url: file.url,
          name: file.name,
          type: file.type
        })),
        replyTo: replyInfo
      };

      // Add temporary message to start of list for immediate feedback
      setMessages(prev => [tempMessage, ...prev]);

      // Scroll to show the new message immediately
      setTimeout(() => {
        messagesEndRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      if (isGroup) {
        const groupMessage = {
          conversationId: selectedChat.userDetails?._id,
          text: messageText,
          files: uploadedFiles.map(file => ({
            url: file.url,
            name: file.name,
            type: file.type
          })),
          msgByUserId: user?._id,
          replyTo: replyInfo
        };

        console.log("Sending group message with files:", {
          conversationId: selectedChat.userDetails?._id,
          hasText: !!messageText.trim(),
          files: uploadedFiles.map(f => f.name) // Log filenames for debugging
        });

        socketConnection.emit("newGroupMessage", groupMessage);
      } else {
        const newMessage = {
          sender: user._id,
          receiver: selectedChat?.userDetails?._id,
          text: messageText,
          msgByUserId: user?._id,
          files: uploadedFiles.map(file => ({
            url: file.url,
            name: file.name,
            type: file.type
          })),
          replyTo: replyInfo // Add reply info
        };

        socketConnection.emit("newMessage", newMessage);
      }

      setMessageText("");
      setSelectedFiles([]);
      setIsUploading(false);
      setReplyingTo(null); // Clear reply state after sending
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

  // Update the handleDeleteGroup function to properly disband groups
  const handleDeleteGroup = () => {
    console.log("Attempting to disband group:", selectedChat?.userDetails?._id);

    if (!socketConnection) {
      console.error("Socket connection is not available");
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    if (!selectedChat || !selectedChat.userDetails?._id) {
      console.error("Invalid group selection");
      Alert.alert("Lỗi", "Không thể xác định nhóm chat. Vui lòng thử lại sau.");
      return;
    }

    // Make sure we have the admin info
    if (!chatUser?.groupAdmin) {
      console.error("Missing group admin information");
      Alert.alert("Lỗi", "Không thể xác định quản trị viên nhóm. Vui lòng thử lại sau.");
      return;
    }

    setIsChatLoading(true);

    // Remove any existing listeners to avoid duplicates
    socketConnection.off("groupDeleted");

    // Set up the listener for the response
    socketConnection.on("groupDeleted", (response) => {
      setIsChatLoading(false);
      console.log("Group dissolution response:", response);

      if (response.success) {
        // Close modals
        setShowGroupInfoModal(false);

        // Navigate back to chat list
        handleBackToList();

        // Show success message
        Alert.alert("Thành công", "Nhóm chat đã được giải tán thành công");

        // Refresh the conversation list
        refreshConversations();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể giải tán nhóm chat. Vui lòng thử lại sau.");
      }
    });

    // Check if user is admin
    const isAdmin = chatUser?.groupAdmin?._id === user._id || chatUser?.groupAdmin === user._id;
    if (!isAdmin) {
      console.error("User is not admin, cannot disband group");
      setIsChatLoading(false);
      Alert.alert("Lỗi", "Chỉ quản trị viên mới có thể giải tán nhóm.");
      return;
    }

    // Create the payload with the correct format that the server expects
    const payload = {
      groupId: selectedChat.userDetails._id,
      userId: user._id
    };

    console.log("Emitting deleteGroup with payload:", payload);

    // Try both event names that the server might be listening for
    socketConnection.emit("deleteGroup", payload);

    // Also try this alternative event name if the server might be using it
    socketConnection.emit("disbandGroup", payload);

    // Set up timeout for no response
    setTimeout(() => {
      if (isChatLoading) {
        setIsChatLoading(false);
        socketConnection.off("groupDeleted");
        Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ. Vui lòng thử lại sau.");
      }
    }, 10000);
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

  const handleImageClick = (imageUrl) => {
    console.log("Opening image:", imageUrl);
    if (!imageUrl) {
      console.error("No image URL provided");
      return;
    }
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleDocumentClick = (documentUrl, documentName) => {
    console.log("Opening document:", documentUrl);
    if (!documentUrl) {
      console.error("No document URL provided");
      return;
    }
    setSelectedDocument({
      url: documentUrl,
      name: documentName || "Document"
    });
    setShowDocumentModal(true);
  };

  const handleVideoClick = (videoUrl) => {
    console.log("Opening video:", videoUrl);
    if (!videoUrl) {
      console.error("No video URL provided");
      return;
    }
    setSelectedVideo(videoUrl);
    setShowVideoModal(true);
  };

  // Add scroll handler function
  const handleScroll = (event) => {
    // For inverted lists, contentOffset.y > 0 means we're scrolled away from the bottom (newest messages)
    const isScrolled = event.nativeEvent.contentOffset.y > 150;

    if (isScrolled !== isScrolledUp) {
      setIsScrolledUp(isScrolled);

      // Animate button visibility
      Animated.timing(scrollButtonOpacity, {
        toValue: isScrolled ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Function to scroll to newest messages
  const scrollToNewestMessages = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleReply = (message) => {
    console.log("Replying to message:", message);
    setReplyingTo(message);

    // Focus the input when replying
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Add a function to scroll to the original message when clicking on a reply
  const scrollToMessage = (messageId) => {
    if (!messageId || !messages || !messagesEndRef.current) return;

    console.log("Scrolling to message:", messageId);

    // Find the index of the message in the current list
    const messageIndex = messages.findIndex(msg => msg._id === messageId);

    if (messageIndex !== -1) {
      // Scroll to the message
      messagesEndRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewOffset: 50, // Add some space at the top
        viewPosition: 0.5 // Position in the middle of the screen
      });

      // Briefly highlight the message (optional)
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        isHighlighted: true
      };
      setMessages(updatedMessages);

      // Remove highlight after a short delay
      setTimeout(() => {
        const resetMessages = [...messages];
        if (resetMessages[messageIndex]) {
          resetMessages[messageIndex] = {
            ...resetMessages[messageIndex],
            isHighlighted: false
          };
          setMessages(resetMessages);
        }
      }, 1500);
    } else {
      // Message not found in the current view - might need to fetch it
      console.log("Message not found in current view");
    }
  };

  // Ensure handleShareMessage function is defined in the main component scope
  const handleShareMessage = (message) => {
    console.log("Opening share message dialog for:", message?._id);
    setMessageToShare(message);
  };

  const renderMessage = ({ item }) => {
    console.log(`Rendering message ${item._id}:`, {
      hasImage: !!item.imageUrl,
      imageUrl: item.imageUrl || 'none',  // Fixed missing closing quote
      hasFile: !!item.fileUrl,
      hasFiles: item.files ? item.files.length : 0,
      fileTypes: item.files ? item.files.map(f => f.type || 'unknown').join(', ') : 'none',
      fileUrls: item.files ? item.files.map(f => f.url ? 'present' : 'missing').join(', ') : 'none',
      isTemp: !!item.isTemp,
      key: item.key || 'none'
    });

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

    const tempStyle = item.isTemp ? { opacity: 0.7 } : {};

    return (
      <View
        style={item.isHighlighted ? { ...tempStyle, backgroundColor: '#f0f8ff' } : tempStyle}
        key={item.key || item._id}
        className="mb-1 px-1"
      >
        <MessageBubble
          message={item}
          isCurrentUser={isCurrentUser}
          userProfilePic={chatUser?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser?.name || "User")}`}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReaction={handleAddReaction}
          onReply={handleReply}
          onReplyClick={scrollToMessage}
          onShareMessage={handleShareMessage} // Ensure this is correctly passed
          senderName={senderName}
          isGroupChat={selectedChat?.isGroup}
          onImagePress={(imageUrl) => handleImageClick(imageUrl)}
          onVideoPress={(videoUrl) => handleVideoClick(videoUrl)}
          onDocumentPress={(documentUrl, documentName) => handleDocumentClick(documentUrl, documentName)}
          forceImageUpdate={true}
        />
      </View>
    );
  };

  // Add the missing renderConversationItem function
  const renderConversationItem = ({ item }) => {
    if (!item || !item.userDetails) {
      console.log("Invalid conversation item:", item);
      return null;
    }

    const isGroup = item.userDetails.isGroup;
    const lastMessage = item.latestMessage || {};

    // Format the timestamp
    const messageTime = lastMessage.createdAt
      ? new Date(lastMessage.createdAt)
      : null;

    const formattedTime = messageTime
      ? messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    // Check if the message is today, if not show date
    const today = new Date();
    const isToday = messageTime &&
      messageTime.getDate() === today.getDate() &&
      messageTime.getMonth() === today.getMonth() &&
      messageTime.getFullYear() === today.getFullYear();

    const dateString = messageTime && !isToday
      ? messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : formattedTime;

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-2 border-b border-gray-100"
        onPress={() => handleSelectChat(item)}
      >
        <View className="relative">
          <Image
            source={{
              uri: item.userDetails.profilePic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userDetails.name)}&background=random`
            }}
            className="w-14 h-14 rounded-full"
          />
          {user.onlineUsers?.includes(item.userDetails._id) && !isGroup && (
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row justify-between items-center">
            <Text className={`font-semibold ${item.unseenMessages ? "text-black" : "text-gray-800"}`} numberOfLines={1}>
              {item.userDetails.nickname || item.userDetails.name}
            </Text>
            {lastMessage.createdAt && (
              <Text className="text-xs text-gray-500">{dateString}</Text>
            )}
          </View>

          <View className="flex-row justify-between items-center mt-1">
            <Text
              className={`text-sm ${item.unseenMessages ? "text-black font-medium" : "text-gray-500"}`}
              numberOfLines={1}
              style={{ maxWidth: '80%' }}
            >
              {lastMessage.text || (lastMessage.files?.length > 0
                ? `${isGroup && lastMessage.msgByUserName ? lastMessage.msgByUserName + ": " : ""}${lastMessage.files.length > 1
                  ? `${lastMessage.files.length} files`
                  : lastMessage.files[0]?.type?.includes('image')
                    ? 'Image'
                    : lastMessage.files[0]?.type?.includes('video')
                      ? 'Video'
                      : 'File'}`
                : "")}
            </Text>

            {item.unseenMessages > 0 && (
              <View className="bg-blue-500 rounded-full w-6 h-6 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {item.unseenMessages > 9 ? "9+" : item.unseenMessages}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const refreshConversations = () => {
    if (socketConnection && user?._id) {
      console.log("Refreshing conversations for user:", user._id);
      socketConnection.emit("sidebar", user._id);
    }
  };

  const handleDeleteDirectConversation = () => {
    console.log("Delete conversation handler called in Chat component");
    if (!socketConnection || !selectedChat) {
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    // Set loading state if needed
    setIsChatLoading(true);

    console.log("Emitting deleteConversation event to socket", {
      conversationId: selectedChat.userDetails?._id,
      userId: user._id
    });

    socketConnection.emit("deleteConversation", {
      conversationId: selectedChat.userDetails?._id,
      userId: user._id
    });

    socketConnection.once("conversationDeleted", (response) => {
      setIsChatLoading(false);
      console.log("Received conversationDeleted response:", response);

      if (response.success) {
        // Close the chat details modal
        setShowDirectChatDetails(false);

        // Navigate back to chat list
        handleBackToList();

        // Show success alert
        Alert.alert("Thành công", "Cuộc hội thoại đã được xóa");

        // Refresh the conversation list
        refreshConversations();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể xóa cuộc hội thoại");
      }
    });
  };

  const handleUpdateNickname = (newNickname) => {
    if (!socketConnection || !selectedChat) {
      Alert.alert("Error", "Unable to connect to server. Please try again later.");
      return;
    }

    // Only proceed if the nickname changed
    if (newNickname === chatUser?.nickname) return;

    // If nickname is empty, it means we want to remove it
    const nicknamePayload = {
      userId: user._id,
      contactId: selectedChat.userDetails?._id,
      nickname: newNickname || null // If empty, set to null to remove nickname
    };

    console.log("Updating nickname:", nicknamePayload);

    // Send the update to the server
    socketConnection.emit("updateContactNickname", nicknamePayload);

    // Handle the response from the server
    socketConnection.once("nicknameUpdated", (response) => {
      if (response.success) {
        // Update the local chat user data with the new nickname
        setChatUser(prev => ({
          ...prev,
          nickname: newNickname || null
        }));

        // Update in the all users list for the conversation list
        setAllUsers(prev => {
          return prev.map(chat => {
            if (chat.userDetails?._id === selectedChat.userDetails?._id) {
              return {
                ...chat,
                userDetails: {
                  ...chat.userDetails,
                  nickname: newNickname || null
                }
              };
            }
            return chat;
          });
        });

        // Flash a success message
        Alert.alert("Success", "Contact name updated successfully");
      } else {
        Alert.alert("Error", response.message || "Failed to update contact name");
      }
    });
  };

  // Add the handleRemoveMember function
  const handleRemoveMember = (groupId, memberId, memberName) => {
    console.log("Handling remove member:", { groupId, memberId, memberName });

    if (!socketConnection) {
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    setIsChatLoading(true);

    // Clean up existing listeners
    socketConnection.off("memberRemoved");
    socketConnection.off("memberRemovedFromGroup");

    // Set up the listener for the server response
    const handleMemberRemovalResponse = (response) => {
      setIsChatLoading(false);
      console.log("Member removal response:", response);

      if (response.success) {
        // Update the chat user data by removing the member
        if (chatUser && chatUser.members) {
          const updatedMembers = chatUser.members.filter(m =>
            (typeof m === 'object' ? m._id.toString() : m.toString()) !==
            (typeof memberId === 'object' ? memberId.toString() : memberId.toString())
          );

          setChatUser(prev => ({
            ...prev,
            members: updatedMembers
          }));
        }

        // Show success message
        Alert.alert("Thành công", `Đã xóa ${memberName} khỏi nhóm`);

        // Refresh the group data
        if (socketConnection && selectedChat?.userDetails?._id) {
          socketConnection.emit("joinRoom", selectedChat.userDetails._id);
        }
      } else {
        Alert.alert("Lỗi", response.message || "Không thể xóa thành viên. Vui lòng thử lại sau.");
      }
    };

    // Listen for both potential event names the server might emit
    socketConnection.on("memberRemoved", handleMemberRemovalResponse);
    socketConnection.on("memberRemovedFromGroup", handleMemberRemovalResponse);

    // Prepare payload - normalize all IDs to strings for consistency
    const payload = {
      groupId: typeof groupId === 'object' ? groupId.toString() : groupId,
      memberId: typeof memberId === 'object' ? memberId.toString() : memberId,
      userId: typeof user._id === 'object' ? user._id.toString() : user._id, // Admin ID
      adminId: typeof user._id === 'object' ? user._id.toString() : user._id  // Alternate format some APIs might use
    };

    console.log("Emitting removeMember with payload:", payload);

    // Try both event names the server might be listening for
    socketConnection.emit("removeMember", payload);
    socketConnection.emit("removeMemberFromGroup", payload);

    // Set timeout for no response
    setTimeout(() => {
      if (isChatLoading) {
        setIsChatLoading(false);
        socketConnection.off("memberRemoved");
        socketConnection.off("memberRemovedFromGroup");
        Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ. Vui lòng thử lại sau.");
      }
    }, 10000);
  };

  const handleLeaveGroup = (groupId) => {
    console.log("Handling leave group for:", groupId);
    if (!socketConnection) {
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    setIsChatLoading(true);

    // Clean up existing listeners
    socketConnection.off("groupLeft");

    // Set up the listener for the server response
    socketConnection.on("groupLeft", (response) => {
      setIsChatLoading(false);
      console.log("Group left response:", response);

      if (response.success) {
        // Close any open modals first
        setShowGroupInfoModal(false);

        // Show success message and navigate only AFTER user acknowledges
        Alert.alert(
          "Thành công",
          "Bạn đã rời khỏi nhóm",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate back to chat list
                handleBackToList();

                // Refresh the conversation list
                refreshConversations();
              }
            }
          ]
        );
      } else {
        Alert.alert("Lỗi", response.message || "Không thể rời khỏi nhóm. Vui lòng thử lại sau.");
      }
    });

    // Prepare payload
    const payload = {
      groupId: typeof groupId === 'object' ? groupId.toString() : groupId,
      userId: typeof user._id === 'object' ? user._id.toString() : user._id
    };

    console.log("Emitting leaveGroup with payload:", payload);
    socketConnection.emit("leaveGroup", payload);

    // Set timeout for no response
    setTimeout(() => {
      if (isChatLoading) {
        setIsChatLoading(false);
        socketConnection.off("groupLeft");
        Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ. Vui lòng thử lại sau.");
      }
    }, 10000);
  };

  const handleShowChatDetails = () => {
    // Kiểm tra chặt chẽ hơn xem đây có phải là nhóm không
    const isGroup = selectedChat?.userDetails?.isGroup === true ||
      (chatUser && chatUser.isGroup === true) ||
      (chatUser && Array.isArray(chatUser.members) && chatUser.members.length > 2);

    console.log("Showing chat details for:", {
      chatName: chatUser?.name,
      isGroup: isGroup,
      hasMembers: !!chatUser?.members,
      membersCount: chatUser?.members?.length || 0
    });

    if (isGroup) {
      setShowGroupInfoModal(true);
    } else {
      setShowDirectChatDetails(true);
    }
  };

  const handleAddMember = () => {
    // Close the group info modal first
    setShowGroupInfoModal(false);

    // Add a small delay before opening the add member modal
    setTimeout(() => {
      console.log("Opening add member modal for group:", selectedChat?.userDetails?._id);
      setShowAddMemberModal(true);
    }, 300);
  };

  const handleMembersAdded = () => {
    console.log("Members added successfully");
    setShowAddMemberModal(false);

    // Refresh the chat data after members are added
    if (socketConnection && selectedChat?.userDetails?._id) {
      socketConnection.emit("joinRoom", selectedChat.userDetails._id);
    }

    // Show success notification
    Alert.alert("Thành công", "Đã thêm thành viên vào nhóm");

    // Refresh conversation list
    refreshConversations();
  };

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

  // Add state variables for scroll tracking
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;

  // Add this handler for share success notifications
  const handleShareSuccess = (recipient) => {
    const recipientName = recipient.userDetails?.name || recipient.name;
    Alert.alert("Thành công", `Đã chia sẻ tin nhắn đến ${recipientName}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0068FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      <View className="flex-1 bg-white">
        {!selectedChat ? (
          <View className="bg-blue-500">
            <View className="flex-row items-center justify-between px-4 pb-3">
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
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-blue-500">
            <View className="flex-row items-center justify-between px-4 pb-3">
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
                      <Text className="text-white font-semibold">
                        {selectedChat.userDetails?.isGroup
                          ? chatUser?.name
                          : (chatUser?.nickname || chatUser?.name)
                        }
                      </Text>
                      <Text className="text-white text-xs opacity-80">
                        {selectedChat.userDetails?.isGroup
                          ? `${selectedChat.members?.length || 0} members`
                          : (chatUser?.online ? 'Đang hoạt động' : 'Không hoạt động')}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <View className="flex-row items-center">
                {!selectedChat.userDetails?.isGroup && (
                  <>
                    <TouchableOpacity className="mr-4">
                      <FontAwesomeIcon icon={faPhone} size={18} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity className="mr-4">
                      <FontAwesomeIcon icon={faVideo} size={18} color="white" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity className="mr-4">
                  <FontAwesomeIcon icon={faSearch} size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShowChatDetails}
                >
                  <FontAwesomeIcon icon={faEllipsis} size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
                                {(item.firstResult.name || "")?.charAt(0)?.toUpperCase()
                                }
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

        {searchLoading && !searchResults.length && (
          <View className="p-4 items-center justify-center">
            <Text className="text-gray-500">Đang tìm kiếm...</Text>
          </View>
        )}

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
              <View className="flex-1 relative">
                <FlatList
                  ref={messagesEndRef}
                  data={messages}
                  inverted={true} // This ensures newest messages show up at the bottom immediately
                  renderItem={renderMessage}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={{ paddingVertical: 15 }}
                  ItemSeparatorComponent={() => <View className="h-1" />}
                  onScroll={handleScroll}
                  scrollEventThrottle={200}
                  onScrollToIndexFailed={(info) => {
                    console.log("Failed to scroll to index", info);
                  }}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0, // Keep the first item visible
                    autoscrollToTopThreshold: 10 // Autoscroll when within 10px of top
                  }}
                />

                {/* Scroll to bottom button */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: 16,
                    bottom: 16,
                    opacity: scrollButtonOpacity,
                    transform: [{
                      scale: scrollButtonOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }],
                  }}
                  pointerEvents={isScrolledUp ? 'auto' : 'none'}
                >
                  <TouchableOpacity
                    className="bg-blue-500 w-12 h-12 rounded-full items-center justify-center shadow-md"
                    onPress={scrollToNewestMessages}
                    activeOpacity={0.8}
                  >
                    <FontAwesomeIcon icon={faArrowDown} size={18} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}

            {selectedFiles.length > 0 && (
              <View className="bg-gray-100 p-3 border-t border-gray-300">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-medium">Files đã chọn ({selectedFiles.length})</Text>
                  <TouchableOpacity onPress={handleClearUploadFile}>
                    <FontAwesomeIcon icon={faTimes} size={20} color="#888" />
                  </TouchableOpacity>
                </View>
                <View className="mt-2">{renderFilePreview()}</View>
              </View>
            )}

            {/* Add reply UI before the input field */}
            {replyingTo && (
              <View className="bg-blue-50 px-4 py-2 flex-row justify-between items-center border-t border-blue-100">
                <View className="flex-1">
                  <Text className="text-blue-600 font-medium">Đang trả lời tin nhắn</Text>
                  <Text className="text-gray-600 text-sm" numberOfLines={1}>
                    {replyingTo.text || (replyingTo.files?.length > 0 ? "Media message" : "Message")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={cancelReply}
                >
                  <FontAwesomeIcon icon={faXmark} size={18} color="#555" />
                </TouchableOpacity>
              </View>
            )}

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

            <View className="flex-row items-center bg-gray-100 p-2">
              <View className="relative">
                <TouchableOpacity className="mx-2" onPress={toggleMediaOptions}>
                  <FontAwesomeIcon icon={faPlus} size={20} color="#555" />
                </TouchableOpacity>
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
                disabled={(!messageText.trim() && selectedFiles.length === 0) || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#0084ff" />
                ) : (
                  <FontAwesomeIcon

                    icon={faPaperPlane}
                    size={20}
                    color={(messageText.trim() || selectedFiles.length > 0) ? "#0084ff" : "#aaa"}
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

        {/* Direct chat details modal for 1-on-1 chats */}
        <DirectChatDetailsModal
          visible={showDirectChatDetails}
          onClose={() => setShowDirectChatDetails(false)}
          user={chatUser}
          currentUser={user}
          messages={messages}
          onDeleteConversation={handleDeleteDirectConversation}
          onUpdateNickname={handleUpdateNickname}
        />

        {/* Group chat info modal for group chats */}
        <GroupChatInfoModal
          visible={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          group={chatUser}
          currentUser={user}
          onLeaveGroup={handleLeaveGroup}
          messages={messages}
          onAddMember={handleAddMember} // Pass the handler that will close this modal and open the add member modal
          onRemoveMember={handleRemoveMember}
          socketConnection={socketConnection}
          onDeleteGroup={handleDeleteGroup}
        />

        {/* Add Member Modal - as a separate modal, not nested */}
        <AddGroupMembersModal
          visible={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          groupId={selectedChat?.userDetails?._id}
          currentUserId={user?._id}
          existingMembers={chatUser?.members || []}
          socketConnection={socketConnection}
          onMembersAdded={handleMembersAdded}
          onSuccess={() => {
            // Refresh conversation list
            if (socketConnection && user?._id) {
              socketConnection.emit("sidebar", user._id);
            }
          }}
        />

        <Modal
          visible={showImageModal}
          transparent={true}
          onRequestClose={() => setShowImageModal(false)}
          animationType="fade"
        >
          <TouchableWithoutFeedback onPress={() => setShowImageModal(false)}>
            <View className="flex-1 bg-black bg-opacity-90 justify-center items-center">
              <TouchableOpacity
                className="absolute top-24 right-5 z-10 p-3 bg-black/50 rounded-full"
                onPress={() => setShowImageModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
              </TouchableOpacity>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage, cache: 'reload' }}
                  className="w-full h-3/4"
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-white">Không thể hiển thị hình ảnh</Text>
              )}

              <View className="flex-row mt-5 justify-center">
                <TouchableOpacity
                  className="flex-row items-center bg-blue-500 px-4 py-2 rounded-full mr-4"
                  onPress={() => Linking.openURL(selectedImage)}
                >
                  <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
                  <Text className="text-white font-semibold">Lưu ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center bg-green-500 px-4 py-2 rounded-full"
                  onPress={() => {
                    try {
                      Share.share({
                        url: selectedImage,
                        message: selectedImage
                      });
                    } catch (error) {
                      Alert.alert("Lỗi", "Không thể chia sẻ nội dung này.");
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faShare} size={16} color="#fff" className="mr-2" />
                  <Text className="text-white font-semibold">Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={showVideoModal}
          transparent={true}
          onRequestClose={() => setShowVideoModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowVideoModal(false)}>
            <View className="flex-1 bg-black bg-opacity-95 justify-center items-center">
              <TouchableOpacity
                className="absolute top-24 right-5 z-10 p-3 bg-black/50 rounded-full"
                onPress={() => setShowVideoModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
              </TouchableOpacity>

              <View className="w-full h-1/2 flex justify-center items-center">
                <Video
                  source={{ uri: selectedVideo }}
                  shouldPlay={true}
                  resizeMode="contain"
                  useNativeControls
                  style={{ width: '100%', height: '100%' }}
                  isLooping={false}
                />
              </View>

              <View className="flex-row mt-5 justify-center">
                <TouchableOpacity
                  className="flex-row items-center bg-blue-500 px-4 py-2 rounded-full mr-4"
                  onPress={() => Linking.openURL(selectedVideo)}
                >
                  <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
                  <Text className="text-white font-semibold">Lưu video</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={showDocumentModal}
          transparent={true}
          onRequestClose={() => setShowDocumentModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDocumentModal(false)}>
            <View className="flex-1 bg-black bg-opacity-95 justify-center items-center">
              <TouchableOpacity
                className="absolute top-24 right-5 z-10 p-3 bg-black/50 rounded-full"
                onPress={() => setShowDocumentModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} size={24} color="#fff" />
              </TouchableOpacity>

              <View className="bg-white p-5 w-4/5 rounded-lg">
                <Text className="text-lg font-bold mb-4 text-center">{selectedDocument.name}</Text>
                <Text className="text-center mb-4">Document Preview is not available</Text>
                <View className="flex-row justify-center">
                  <TouchableOpacity
                    className="mt-3 bg-blue-500 px-4 py-2 rounded-full flex-row items-center"
                    onPress={() => Linking.openURL(selectedDocument.url)}
                  >
                    <FontAwesomeIcon icon={faDownload} size={16} color="#fff" className="mr-2" />
                    <Text className="text-white font-semibold">Download Document</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Share Message Modal */}
        <ShareMessageModal
          visible={!!messageToShare}
          onClose={() => setMessageToShare(null)}
          message={messageToShare}
          allUsers={allUsers}
          socketConnection={socketConnection}
          currentUser={user}
          onSuccess={handleShareSuccess}
        />

        {/* ADD THIS: Create Group Modal and Add Member Modal */}
        <CreateGroupChat
          visible={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          socketConnection={socketConnection}
          userId={user?._id}
          onGroupCreated={() => {
            refreshConversations();
            setShowCreateGroupModal(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}