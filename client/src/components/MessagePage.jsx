import { faFilePen, faPhone, faTrash, faVideo, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useCallContext } from "../context/CallProvider";
import { useGlobalContext } from "../context/GlobalProvider";
// import uploadFileToCloud from "../helpers/uploadFileToClound";
import uploadFileToS3 from "../helpers/uploadFileToS3";

import { toast } from "sonner";
import AddGroupMemberModal from "./AddGroupMemberModal";
import ConfirmModal from "./ConfirmModal";
import ImageViewerModal from "./ImageViewerModal";
import RightSidebar from "./RightSidebar";
import ShareMessageModal from "./ShareMessageModal";
import Footer from "./chat/Footer";
import Header from "./chat/Header";
import MessageIsCall from "./chat/MessageIsCall";
import MessageIsNormal from "./chat/MessageIsNormal";
import handleAudioCall from "./handles/handleAudioCall";
import handleVideoCall from "./handles/handleVideoCall";
// Import component PinnedMessagesHeader mới
import PinnedMessagesHeader from "./chat/PinnedMessagesHeader";

export default function MessagePage() {
  const params = useParams();
  const { socketConnection, seenMessage, setSeenMessage } = useGlobalContext();
  const user = useSelector((state) => state?.user);
  const callContext = useCallContext();
  const callUser = callContext?.callUser;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const conversationInitialized = useRef(false);

  const [dataUser, setDataUser] = useState({
    _id: "",
    name: "",
    phone: "",
    profilePic: "",
    online: false,
    isGroup: false,
    members: [],
    deputyAdmins: [], // Make sure this field is initialized
  });

  const [messages, setMessages] = useState({
    text: "",
  });

  const [allMessages, setAllMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [openTrash, setOpenTrash] = useState(false);

  const [hoveredLikeMessage, setHoveredLikeMessage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [openActionMessage, setOpenActionMessage] = useState(false);

  const [showRightSideBar, setShowRightSideBar] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState("Thông tin hội thoại");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
  });

  const [editingMessage, setEditingMessage] = useState(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [shareMessage, setShareMessage] = useState(null);

  const [visibleMessages, setVisibleMessages] = useState(10); // Number of messages to display
  const loadMoreRef = useRef(null); // Reference for detecting when to load more
  const messagesContainerRef = useRef(null); // Reference to the messages container
  const previousMessagesCountRef = useRef(0); // Track previous message count

  // Add a ref to track scroll position
  const scrollPositionRef = useRef(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // New state to track loading status
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // Add a counter ref to track nested drag events
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!socketConnection) {
      console.log("Waiting for socket connection...");
      return;
    }

    if (!params.userId) {
      console.error("Missing conversation ID in URL parameters");
      setLoadError("Missing conversation ID");
      setIsLoading(false);
      return;
    }

    const initializeConversation = () => {
      setIsLoading(true);
      setLoadError(null);
      conversationInitialized.current = false;

      // Clear any existing event listeners to prevent duplicates
      socketConnection.off("messageUser");
      socketConnection.off("message");
      socketConnection.off("groupMessage");
      socketConnection.off("error");

      console.log("Joining room with ID:", params.userId);
      // Send only the actual user ID, not the full path
      socketConnection.emit("joinRoom", params.userId);

      // Set timeout for fetching data
      const timeoutId = setTimeout(() => {
        if (!conversationInitialized.current) {
          console.error("Timeout fetching conversation data");
          setLoadError("Vui lòng thử lại.");
          setIsLoading(false);
        }
      }, 5000); // Increase timeout to 5 seconds

      socketConnection.on("messageUser", (payload) => {
        console.log("Received messageUser event:", payload);
        setDataUser({ ...payload, isGroup: false });
        setSeenMessage(true);
        setIsLoading(false);
        conversationInitialized.current = true;
        clearTimeout(timeoutId);
      });

      socketConnection.on("message", (message) => {
        console.log("Received message event:", message?.messages?.length || 0, "messages");
        // Add more detailed debug for shared messages
        const sharedMessages = message?.messages?.filter((msg) => msg.sharedContent);
        if (sharedMessages?.length > 0) {
          console.log("Found shared messages:", sharedMessages);
        }
        setAllMessages(message?.messages || []);
        setConversation(message);
        setIsLoading(false);
        conversationInitialized.current = true;
        clearTimeout(timeoutId);
      });

      socketConnection.on("groupMessage", (groupData) => {
        // Enhanced debugging for group data with deputies
        console.log("Received groupMessage event:", {
          id: groupData?._id,
          name: groupData?.name,
          isGroup: groupData?.isGroup,
          membersCount: groupData?.members?.length || 0,
          profilePic: groupData?.profilePic,
          hasDeputyAdmins: Boolean(groupData?.deputyAdmins && groupData?.deputyAdmins.length),
          deputyAdminsCount: groupData?.deputyAdmins?.length || 0,
        });

        // If there are deputy admins, log more details
        if (groupData?.deputyAdmins && groupData?.deputyAdmins.length > 0) {
          console.log("Deputy admins in group:", groupData.deputyAdmins);
        }

        setAllMessages(groupData?.messages || []);
        setConversation(groupData);

        // Ensure group name is properly handled
        const groupName = groupData?.name || `Group ${groupData?._id?.toString().slice(-5)}`;

        setDataUser({
          _id: groupData._id,
          name: groupName,
          profilePic:
            groupData?.profilePic ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`,
          isGroup: true,
          members: groupData.members || [],
          groupAdmin: groupData.groupAdmin,
          mutedMembers: groupData.mutedMembers || [],
          deputyAdmins: groupData.deputyAdmins || [], // Make sure we save deputyAdmins
        });
        setSeenMessage(true);
        setIsLoading(false);
        conversationInitialized.current = true;
        clearTimeout(timeoutId);
      });

      socketConnection.on("error", (error) => {
        console.error("Socket error:", error);

        // Add more details to help debug
        if (error.details) {
          console.error("Error details:", error.details);
        }

        // Handle specific error messages with user-friendly text
        let userMessage = "Error loading conversation";
        if (
          error.message === "Invalid conversation ID format" ||
          error.message === "Invalid room ID" ||
          error.message === "Conversation not found"
        ) {
          userMessage = "Không thể tìm thấy cuộc hội thoại. Vui lòng thử lại.";
        } else if (error.message.includes("Error loading")) {
          userMessage = "Không thể tải dữ liệu. Vui lòng thử lại sau.";
        }

        setLoadError(userMessage);
        setIsLoading(false);
        clearTimeout(timeoutId);

        // For new direct message conversations, provide a better user experience
        if (error.message === "Conversation not found") {
          // This could be a new conversation - handle gracefully
          setLoadError("Bắt đầu cuộc trò chuyện mới. Hãy gửi tin nhắn để bắt đầu.");
        }
      });

      return () => {
        clearTimeout(timeoutId);
        socketConnection.off("messageUser");
        socketConnection.off("message");
        socketConnection.off("groupMessage");
        socketConnection.off("error");
      };
    };

    initializeConversation();

    // Set up reconnection handler to rejoin room
    const handleReconnect = () => {
      console.log("Socket reconnected, reinitializing conversation");
      initializeConversation();
    };

    socketConnection.on("connect", handleReconnect);

    return () => {
      socketConnection.off("connect", handleReconnect);
    };
  }, [socketConnection, params.userId, setSeenMessage]);

  useEffect(() => {
    // Only scroll to bottom when new messages arrive, not when loading older ones
    const currentMessageCount = allMessages.length;
    const previousMessageCount = previousMessagesCountRef.current || 0;

    // If new messages were added (not just loading older ones)
    if (currentMessageCount > previousMessageCount && visibleMessages === Math.min(10, currentMessageCount)) {
      // Scroll to bottom immediately with no animation
      messagesEndRef.current?.scrollIntoView();
    }

    // Store the current message count for next comparison
    previousMessagesCountRef.current = currentMessageCount;
  }, [allMessages, visibleMessages]);

  useEffect(() => {
    if (seenMessage) {
      inputRef.current?.focus();
    }
  }, [seenMessage]);

  useEffect(() => {
    if (socketConnection && params.userId && !dataUser.isGroup) {
      socketConnection.on("onlineUser", (onlineUsers) => {
        console.log("Online users updated:", onlineUsers);
        if (!dataUser.isGroup && params.userId) {
          setDataUser((prev) => ({
            ...prev,
            online: onlineUsers.includes(params.userId),
          }));
        }
      });

      return () => {
        socketConnection.off("onlineUser");
      };
    }
  }, [socketConnection, params.userId, dataUser.isGroup]);

  useEffect(() => {
    if (socketConnection) {
      socketConnection.on("call-ended", () => {
        console.log("Call ended, refreshing messages");
        setTimeout(() => {
          socketConnection.emit("joinRoom", params.userId);
        }, 500);
      });

      return () => {
        socketConnection.off("call-ended");
      };
    }
  }, [socketConnection, params.userId]);

  useEffect(() => {
    // Reset visible messages count when conversation changes
    setVisibleMessages(10);
  }, [params.userId]);

  // Setup intersection observer for infinite scrolling with scroll position preservation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && allMessages.length > visibleMessages && !isLoadingMore) {
          // Store current scroll height before loading more messages
          if (messagesContainerRef.current) {
            scrollPositionRef.current = {
              scrollHeight: messagesContainerRef.current.scrollHeight,
              scrollTop: messagesContainerRef.current.scrollTop,
            };
          }

          // Set loading state to true
          setIsLoadingMore(true);

          // Add 2-second delay before loading more messages
          setTimeout(() => {
            // Load 10 more messages after delay
            setVisibleMessages((prev) => Math.min(prev + 10, allMessages.length));
            // Reset loading state
            setIsLoadingMore(false);
          }, 1000);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [allMessages, visibleMessages, isLoadingMore]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    if (scrollPositionRef.current && messagesContainerRef.current) {
      // Calculate how much the content height has changed
      const heightDifference = messagesContainerRef.current.scrollHeight - scrollPositionRef.current.scrollHeight;

      // Adjust scroll position to maintain the relative view
      messagesContainerRef.current.scrollTop = scrollPositionRef.current.scrollTop + heightDifference;

      // Clear the stored position
      scrollPositionRef.current = null;
    }
  }, [visibleMessages]);

  // Calculate which messages to display - modified to handle incremental loading correctly
  const messagesToDisplay = useMemo(() => {
    // Start showing the most recent messages, then load older ones when scrolling
    return allMessages.slice(-visibleMessages);
  }, [allMessages, visibleMessages]);

  // Only scroll to newest messages when a new message is received
  useEffect(() => {
    // Only scroll to bottom automatically for newly received messages
    const currentMessageCount = allMessages.length;
    const previousMessageCount = previousMessagesCountRef.current || 0;

    if (currentMessageCount > previousMessageCount) {
      // Scroll to bottom immediately without animation
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "auto",
      });
    }

    // Store the current message count for next comparison
    previousMessagesCountRef.current = currentMessageCount;
  }, [allMessages]);

  const handleUploadFile = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleClearUploadFile = () => {
    setSelectedFiles([]);
    if (imageInputRef.current) imageInputRef.current.value = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!messages.text.trim() && selectedFiles.length === 0) || !socketConnection) {
      return;
    }

    if (editingMessage) {
      socketConnection.emit("editMessage", {
        messageId: editingMessage._id,
        conversationId: params.userId,
        text: messages.text,
        userId: user._id,
        isGroup: dataUser.isGroup,
      });

      setEditingMessage(null);
      setMessages({ text: "" });
      return;
    }

    // Upload multiple files
    const uploadedFiles = [];

    if (selectedFiles.length > 0) {
      toast.loading("Đang tải lên tệp tin...");

      try {
        // Upload files in parallel
        const uploadPromises = selectedFiles.map(async (file) => {
          // const uploadResult = await uploadFileToCloud(file);
          const uploadResult = await uploadFileToS3(file);
          return {
            url: uploadResult.secure_url,
            name: file.name,
            type: file.type,
            size: file.size,
          };
        });

        const results = await Promise.all(uploadPromises);
        uploadedFiles.push(...results);
        toast.dismiss();
        toast.success(`Đã tải lên ${results.length} tệp tin`);
      } catch (error) {
        console.error("Error uploading files:", error);
        toast.error("Không thể tải lên tệp tin");
        return;
      }
    }

    // Create message object
    const messageData = {
      text: messages.text,
      files: uploadedFiles,
      replyTo: replyingTo
        ? {
            messageId: replyingTo._id,
            text: replyingTo.text,
            sender: replyingTo.msgByUserId,
          }
        : null,
    };

    // Send through appropriate socket event
    if (dataUser.isGroup) {
      socketConnection.emit("newGroupMessage", {
        conversationId: params.userId,
        ...messageData,
        msgByUserId: user?._id,
      });
    } else {
      socketConnection.emit("newMessage", {
        sender: user._id,
        receiver: params.userId,
        ...messageData,
        msgByUserId: user?._id,
      });
    }

    // Reset state
    setMessages({ text: "" });
    setSelectedFiles([]);
    setReplyingTo(null);
    handleClearUploadFile();
  };

  const handleSendEmojiLike = () => {
    if (dataUser.isGroup) {
      const emojiMessage = {
        conversationId: params.userId,
        text: "👍",
        msgByUserId: user?._id,
      };
      socketConnection.emit("newGroupMessage", emojiMessage);
    } else {
      const emojiMessage = {
        sender: user._id,
        receiver: params.userId,
        text: "👍",
        imageUrl: "",
        fileUrl: "",
        fileName: "",
        msgByUserId: user?._id,
      };
      socketConnection.emit("newMessage", emojiMessage);
    }
  };

  const getSenderInfo = (senderId) => {
    if (!senderId) return { name: "Unknown", profilePic: "" };

    // Convert senderId to string for consistent comparison
    const senderIdStr =
      typeof senderId === "object"
        ? senderId._id
          ? senderId._id.toString()
          : senderId.toString()
        : senderId.toString();

    // For direct messages: if not current user, it must be the other person
    if (!dataUser.isGroup) {
      const currentUserIdStr =
        typeof user._id === "object" ? (user._id ? user._id.toString() : user._id.toString()) : user._id.toString();

      if (senderIdStr !== currentUserIdStr) {
        return {
          _id: dataUser._id,
          name: dataUser.name,
          profilePic: dataUser.profilePic,
        };
      } else {
        return {
          _id: user._id,
          name: "Bạn", // "You" in Vietnamese
          profilePic: user.profilePic,
        };
      }
    }

    // For groups, continue with existing logic
    if (!conversation?.members) return { name: "Unknown", profilePic: "" };

    // Find member by comparing string IDs
    const memberInfo = conversation.members.find((m) => {
      const memberId = typeof m._id === "object" ? m._id.toString() : m._id.toString();
      return memberId === senderIdStr;
    });

    if (memberInfo) return memberInfo;

    // Look through messages to find sender info
    const messageWithSender = allMessages.find((msg) => {
      if (!msg.msgByUserId) return false;

      const msgSenderId =
        typeof msg.msgByUserId === "object"
          ? msg.msgByUserId._id
            ? msg.msgByUserId._id.toString()
            : msg.msgByUserId.toString()
          : msg.msgByUserId.toString();

      return msgSenderId === senderIdStr && msg.msgByUserId.name;
    });

    if (messageWithSender && messageWithSender.msgByUserId) {
      return {
        _id: messageWithSender.msgByUserId._id,
        name: messageWithSender.msgByUserId.name,
        profilePic: messageWithSender.msgByUserId.profilePic || "",
      };
    }

    return { name: "Thành viên đã rời nhóm", profilePic: "" };
  };

  const renderFilePreview = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 p-3">
        {selectedFiles.map((file, index) => {
          if (file.type.startsWith("image/")) {
            return (
              <div key={index} className="relative">
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-32 w-32 rounded object-contain" />
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 bg-opacity-70 text-white"
                >
                  <FontAwesomeIcon icon={faXmark} width={8} />
                </button>
              </div>
            );
          }

          if (file.type.startsWith("video/")) {
            return (
              <div key={index} className="relative">
                <video className="h-32 w-32 rounded object-contain">
                  <source src={URL.createObjectURL(file)} type={file.type} />
                </video>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 bg-opacity-70 text-white"
                >
                  <FontAwesomeIcon icon={faXmark} width={8} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="relative flex h-24 w-24 flex-col items-center justify-center rounded bg-gray-100 p-2"
            >
              <FontAwesomeIcon icon={faFilePen} width={20} className="text-gray-500" />
              <span className="mt-1 truncate text-xs">{file.name}</span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="absolute right-1 top-1 rounded-full bg-gray-800 bg-opacity-70 p-1 text-white"
              >
                <FontAwesomeIcon icon={faXmark} width={10} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setMessages({
      text: message.text,
    });
    inputRef.current?.focus();
    setOpenActionMessage(false);
  };

  const handleDeleteMessage = (messageId) => {
    if (!socketConnection) return;

    setConfirmModal({
      isOpen: true,
      title: "Xóa tin nhắn",
      message: "Bạn có chắc chắn muốn xóa tin nhắn này?",
      action: () => {
        socketConnection.emit("deleteMessage", {
          messageId,
          conversationId: params.userId,
          userId: user._id,
          isGroup: dataUser.isGroup,
        });

        setOpenActionMessage(false);
      },
    });
  };

  const photoVideoMessages = allMessages.filter(
    (message) =>
      message.files && message.files.some((file) => file.type?.startsWith("image/") || file.type?.startsWith("video/")),
  );

  const fileMessages = allMessages.filter(
    (message) =>
      message.files &&
      message.files.some((file) => !file.type?.startsWith("image/") && !file.type?.startsWith("video/")),
  );

  const linkMessages = allMessages.filter(
    (message) => message.text.startsWith("https") || message.text.startsWith("http"),
  );

  const isSystemNotification = (messageText) => {
    if (!messageText) return false;

    const patterns = [
      /đã tạo nhóm/i,
      /đã thêm .+ vào nhóm/i,
      /đã thêm \d+ người dùng vào nhóm/i,
      /đã rời khỏi nhóm/i,
      /đã xóa/i,
      /đã cập nhật/i,
      /đã thay đổi tên nhóm/i,
      /đã thay đổi ảnh nhóm/i,
      /đã mở/i,
      /đã tắt/i,
      /đã được/i,
      /đã bị/i,
    ];

    return patterns.some((pattern) => pattern.test(messageText));
  };

  const handleAddReaction = (messageId, emoji) => {
    if (!socketConnection) return;

    socketConnection.emit("addReaction", {
      messageId,
      conversationId: params.userId,
      emoji,
      userId: user._id,
      isGroup: dataUser.isGroup,
    });

    setHoveredLikeMessage(null);
  };

  const handleQuickLike = (messageId) => {
    handleAddReaction(messageId, "👍");
  };

  const isCallMessage = (message) => {
    return (
      message.text === "Cuộc gọi thoại" ||
      message.text === "Cuộc gọi video" ||
      (message.callData && message.callData.callType)
    );
  };

  const getCallIcon = (message) => {
    const isVideoCall =
      message.text === "Cuộc gọi video" || (message.callData && message.callData.callType === "video");
    return isVideoCall ? faVideo : faPhone;
  };

  const getCallStatusText = (message) => {
    if (!message.callData) return message.text;

    const status = message.callData.callStatus;
    const duration = message.callData.callDuration || 0;

    if (status === "missed" || status === "rejected") {
      return "Cuộc gọi nhỡ";
    } else if (status === "completed") {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      return message.text + ` • ${formattedTime}`;
    }

    return message.text;
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const isCurrentUserMuted = () => {
    if (!dataUser.isGroup || !dataUser.mutedMembers) return false;

    const currentUserIdStr = typeof user._id === "object" ? user._id.toString() : user._id;

    return dataUser.mutedMembers.some((mutedId) => {
      const mutedIdStr =
        typeof mutedId === "object" ? (mutedId._id ? mutedId._id.toString() : mutedId.toString()) : mutedId.toString();

      return mutedIdStr === currentUserIdStr;
    });
  };

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
    setOpenActionMessage(false);
  };

  const handleShareMessage = (message) => {
    setShareMessage(message);
    setOpenActionMessage(false);
  };

  // Handle drag and drop for files - improved to prevent flickering
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingFile(false);

    // Check if user is muted
    if (isCurrentUserMuted()) {
      toast.error("Bạn đã bị tắt quyền nhắn tin trong nhóm này");
      return;
    }

    // Only process files if there are any in the drop event
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      // Accept all file types instead of filtering just for media
      setSelectedFiles((prev) => [...prev, ...files]);

      // Show success toast with file count and types
      const imageCount = files.filter((file) => file.type.startsWith("image/")).length;
      const videoCount = files.filter((file) => file.type.startsWith("video/")).length;
      const otherCount = files.length - imageCount - videoCount;

      let message = "Đã thêm ";
      if (imageCount > 0) message += `${imageCount} ảnh`;
      if (videoCount > 0) message += `${imageCount > 0 ? ", " : ""}${videoCount} video`;
      if (otherCount > 0) message += `${imageCount > 0 || videoCount > 0 ? " và " : ""}${otherCount} file`;

      toast.success(message);
    }
  };

  // Add cleanup effect for drag state
  useEffect(() => {
    // Reset drag state when component unmounts or conversation changes
    return () => {
      dragCounter.current = 0;
      setIsDraggingFile(false);
    };
  }, [params.userId]);

  const handleScrollToMessage = (messageId) => {
    console.log("Scrolling to message:", messageId);

    // Tìm tin nhắn trong danh sách
    const messageIndex = allMessages.findIndex((msg) => msg._id === messageId);

    if (messageIndex === -1) {
      console.error("Message not found in the message list:", messageId);
      return;
    }

    // Tính toán số tin nhắn cần hiển thị để đảm bảo tin nhắn được tìm thấy nằm trong DOM
    const messagesNeeded = allMessages.length - messageIndex;

    // Cập nhật số lượng tin nhắn hiển thị nếu cần
    if (visibleMessages < messagesNeeded) {
      setVisibleMessages(messagesNeeded);

      // Đợi cho DOM cập nhật sau khi thay đổi số lượng tin nhắn hiển thị
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Thêm hiệu ứng highlight
          messageElement.classList.add("bg-blue-100");
          setTimeout(() => {
            messageElement.classList.remove("bg-blue-100");
          }, 2000);
        } else {
          console.error("Message element still not found after increasing visible messages:", messageId);
        }
      }, 300);
    } else {
      // Nếu tin nhắn đã nằm trong DOM, cuộn đến nó ngay lập tức
      const messageElement = document.getElementById(`message-${messageId}`);

      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Thêm hiệu ứng highlight
        messageElement.classList.add("bg-blue-100");
        setTimeout(() => {
          messageElement.classList.remove("bg-blue-100");
        }, 2000);
      } else {
        console.error("Message element not found:", messageId);
      }
    }
  };

  const handlePinMessage = (message, action) => {
    if (!socketConnection || !conversation) {
      console.log("Không thể ghim tin nhắn: Thiếu socket hoặc conversation");
      return;
    }

    // Kiểm tra xem có đang cố ghim (không phải bỏ ghim) và có đạt giới hạn chưa
    if (action === "pin" && conversation?.pinnedMessages && conversation.pinnedMessages.length >= 5) {
      toast.error("Bạn chỉ có thể ghim tối đa 5 tin nhắn.", { position: "top-center" });
      return;
    }

    const messageId = message._id;
    const conversationId = conversation._id;

    if (!messageId || !conversationId) {
      console.error("Thiếu ID tin nhắn hoặc cuộc trò chuyện", { messageId, conversationId });
      toast.error("Không thể thực hiện thao tác ghim tin nhắn");
      return;
    }

    console.log("Đang ghim tin nhắn với thông số:", {
      conversationId,
      messageId,
      action,
    });

    socketConnection.emit("pinMessage", {
      conversationId,
      messageId,
      action,
      isGroup: dataUser.isGroup,
    });

    setOpenActionMessage(false);
  };

  // Thêm useEffect để lắng nghe phản hồi từ server khi ghim/bỏ ghim tin nhắn
  useEffect(() => {
    if (!socketConnection) return;

    const handlePinError = (data) => {
      toast.error(data.message || "Lỗi khi ghim tin nhắn.");
    };

    const handleMessagePinnedUnpinned = (data) => {
      if (data.success) {
        toast.success(data.action === "pin" ? "Đã ghim tin nhắn" : "Đã bỏ ghim tin nhắn");
      }
    };

    socketConnection.on("pinMessageError", handlePinError);
    socketConnection.on("messagePinnedUnpinned", handleMessagePinnedUnpinned);

    return () => {
      socketConnection.off("pinMessageError", handlePinError);
      socketConnection.off("messagePinnedUnpinned", handleMessagePinnedUnpinned);
    };
  }, [socketConnection]);

  // Replace the problematic useEffect that's causing the loop
  useEffect(() => {
    if (conversation?.pinnedMessages?.length > 0) {
      console.log("Current pinned messages:", conversation.pinnedMessages);

      // Only check once per conversation load if pinned messages need refreshing
      const needsRefresh = conversation.pinnedMessages.some(
        (msg) => typeof msg !== "object" || (typeof msg === "object" && !msg.msgByUserId),
      );

      // Use a ref to prevent multiple refreshes for the same conversation
      if (needsRefresh && socketConnection && !conversationInitialized.current) {
        console.log("Pinned messages need refresh, requesting data once...");
        socketConnection.emit("joinRoom", params.userId);

        // Mark as initialized to prevent further refresh requests
        conversationInitialized.current = true;
      }
    }
  }, [conversation?._id, socketConnection, params.userId, conversation?.pinnedMessages]);

  // Improve the message comparison function to safely handle different ID formats
  const isCurrentUserMessage = (message) => {
    if (!message || !user || !user._id) return false;

    // Get string version of user ID
    const currentUserIdStr =
      typeof user._id === "object"
        ? user._id?.toString
          ? user._id.toString()
          : user._id
        : user._id?.toString
          ? user._id.toString()
          : user._id;

    // Get string version of message sender ID
    const senderIdStr =
      typeof message.msgByUserId === "object"
        ? message.msgByUserId?._id
          ? message.msgByUserId._id.toString()
          : message.msgByUserId?.toString()
        : message.msgByUserId?.toString
          ? message.msgByUserId.toString()
          : message.msgByUserId;

    // Compare as strings
    return senderIdStr === currentUserIdStr;
  };

  return (
    <main className="flex h-full">
      <div className="flex h-full flex-1 flex-col">
        {/* Header */}
        {(dataUser._id || isLoading) && (
          <Header
            dataUser={dataUser}
            isLoading={isLoading}
            handleAudioCall={() => handleAudioCall({ callUser, dataUser, params })}
            handleVideoCall={() => handleVideoCall({ callUser, dataUser, params })}
            setShowRightSideBar={setShowRightSideBar}
            showRightSideBar={showRightSideBar}
            messages={allMessages}
            onMessageFound={handleScrollToMessage}
            getSenderInfo={getSenderInfo}
            conversation={conversation} // Thêm prop này
          />
        )}

        <div className="flex flex-1 overflow-hidden">
          <section
            className={`custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden bg-[#ebecf0] ${
              isDraggingFile ? "border-2 border-dashed border-blue-400" : ""
            }`}
            ref={messagesContainerRef}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Thêm PinnedMessagesHeader vào đây */}
            {!isLoading && !loadError && conversation?.pinnedMessages && conversation.pinnedMessages.length > 0 && (
              <PinnedMessagesHeader
                pinnedMessages={conversation.pinnedMessages}
                onNavigateToMessage={handleScrollToMessage}
                onUnpinMessage={handlePinMessage}
                currentUserId={user?._id}
                getSenderInfo={getSenderInfo}
                allMessages={allMessages} // Add this prop to pass all messages
              />
            )}

            {/* Loading chat */}
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
                  <p className="mt-4 text-gray-500">Đang tải tin nhắn...</p>
                </div>
              </div>
            ) : loadError ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="rounded-lg bg-red-50 p-6 text-center">
                  <p className="mb-2 text-lg font-semibold text-red-600">Không thể tải cuộc trò chuyện</p>
                  <p className="text-sm text-gray-700">{loadError}</p>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setLoadError(null);
                      if (socketConnection) {
                        socketConnection.emit("joinRoom", params.userId);
                      }
                    }}
                    className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            ) : (
              // Render messages
              <div className="absolute inset-0 mt-2 flex flex-col gap-y-5 px-4">
                {/* Load more messages trigger - show only if there are more messages to load */}
                {allMessages.length > visibleMessages && (
                  <div ref={loadMoreRef} className="flex justify-center py-2">
                    <div className="flex items-center space-x-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
                      <span>
                        {isLoadingMore
                          ? "Đang tải tin nhắn..."
                          : `Tải thêm tin nhắn (${visibleMessages}/${allMessages.length})`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Display limited number of messages */}
                {messagesToDisplay.map((message) => {
                  // If the message is a system notification center it
                  if (isSystemNotification(message.text)) {
                    return (
                      <div key={message._id} className="flex justify-center">
                        <div className="flex items-center rounded-full bg-white px-4 py-2 text-center text-[11px] font-semibold text-gray-500">
                          <span>{message.text}</span>
                          <span className="text-[11px] font-medium text-[#00000060]">
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    );
                  } else if (isCallMessage(message)) {
                    const isCurrentUser = isCurrentUserMessage(message); // Replace with function
                    let sender = null;
                    if (dataUser.isGroup && !isCurrentUser) {
                      sender = getSenderInfo(message.msgByUserId);
                    }
                    return (
                      <MessageIsCall
                        key={message._id}
                        message={message}
                        isCurrentUser={isCurrentUser}
                        sender={sender}
                        dataUser={dataUser}
                        user={user}
                        setHoveredMessage={setHoveredMessage}
                        hoveredLikeMessage={hoveredLikeMessage}
                        setHoveredLikeMessage={setHoveredLikeMessage}
                        getCallIcon={getCallIcon}
                        getCallStatusText={getCallStatusText}
                        handleQuickLike={handleQuickLike}
                        handleAddReaction={handleAddReaction}
                      />
                    );
                  } else {
                    const isCurrentUser = isCurrentUserMessage(message); // Replace with function
                    let sender = null;
                    if (dataUser.isGroup && !isCurrentUser) {
                      sender = getSenderInfo(message.msgByUserId);
                    }
                    return (
                      <MessageIsNormal
                        key={message._id}
                        message={message}
                        isCurrentUser={isCurrentUser}
                        sender={sender}
                        dataUser={dataUser}
                        user={user}
                        conversation={conversation} // Add this prop
                        hoveredMessage={hoveredMessage}
                        setHoveredMessage={setHoveredMessage}
                        setHoveredLikeMessage={setHoveredLikeMessage}
                        handleQuickLike={handleQuickLike}
                        hoveredLikeMessage={hoveredLikeMessage}
                        handleAddReaction={handleAddReaction}
                        getSenderInfo={getSenderInfo}
                        handleImageClick={handleImageClick}
                        handleShareMessage={handleShareMessage}
                        handleReplyMessage={handleReplyMessage}
                        openActionMessage={openActionMessage}
                        setOpenActionMessage={setOpenActionMessage}
                        handleEditMessage={handleEditMessage}
                        handleDeleteMessage={handleDeleteMessage}
                        handlePinMessage={handlePinMessage} // Add this prop
                      />
                    );
                  }
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="sticky top-0 z-50 flex h-full items-center justify-center bg-gray-400 bg-opacity-40">
                <div
                  className="relative max-h-80 overflow-y-auto rounded bg-[#fffefe] p-4"
                  onMouseEnter={() => setOpenTrash(true)}
                  onMouseLeave={() => setOpenTrash(false)}
                >
                  {renderFilePreview()}
                  {openTrash && (
                    <button
                      onClick={handleClearUploadFile}
                      className="group absolute right-0 top-0 mr-1 mt-1 h-7 w-7 rounded hover:bg-[#f0f0f0]"
                    >
                      <FontAwesomeIcon icon={faTrash} width={12} className="text-[#ccc] group-hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer input chat */}
        {!isLoading && !loadError && (
          <Footer
            setMessages={setMessages}
            messages={messages}
            setReplyingTo={setReplyingTo}
            replyingTo={replyingTo}
            setEditingMessage={setEditingMessage}
            editingMessage={editingMessage}
            user={user}
            dataUser={dataUser}
            handleSendMessage={handleSendMessage}
            handleSendEmojiLike={handleSendEmojiLike}
            handleUploadFile={handleUploadFile}
            isCurrentUserMuted={isCurrentUserMuted}
            setSeenMessage={setSeenMessage}
            conversation={conversation}
            allMessages={allMessages}
            selectedFiles={selectedFiles}
            getSenderInfo={getSenderInfo}
            setSelectedFiles={setSelectedFiles} // Pass the setter function
          />
        )}
      </div>

      {/* Right side bar */}
      {!isLoading && !loadError && showRightSideBar && (
        <RightSidebar
          socketConnection={socketConnection}
          params={params}
          isVisible={showRightSideBar}
          dataUser={dataUser}
          user={user}
          showContextMenu={showContextMenu}
          setShowContextMenu={setShowContextMenu}
          setConfirmModal={setConfirmModal}
          photoVideoMessages={photoVideoMessages}
          fileMessages={fileMessages}
          linkMessages={linkMessages}
          handleAddMember={handleAddMember}
        />
      )}

      {/* Modal add member */}
      {showAddMemberModal && (
        <AddGroupMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          groupId={params.userId}
          existingMembers={dataUser.members || []}
        />
      )}

      {/* Modal confirm */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action || (() => {})}
        title={confirmModal.title || "Xác nhận"}
        message={confirmModal.message || "Bạn có chắc chắn muốn thực hiện hành động này?"}
        type="danger"
      />

      {showImageModal && <ImageViewerModal fileUrl={selectedImage} onClose={() => setShowImageModal(false)} />}

      {/* Modal share message */}
      {shareMessage && (
        <ShareMessageModal
          isOpen={Boolean(shareMessage)}
          onClose={() => setShareMessage(null)}
          message={shareMessage}
        />
      )}
    </main>
  );
}
