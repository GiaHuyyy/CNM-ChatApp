import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGlobalContext } from "../context/GlobalProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAddressCard,
  faBookmark,
  faFaceLaughSquint,
  faFaceSmile,
  faFolderClosed,
  faImage,
  faThumbsUp,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRotateRight,
  faBars,
  faBolt,
  faCamera,
  faEllipsis,
  faFilePen,
  faMagnifyingGlass,
  faPaperPlane,
  faPhone,
  faPlus,
  faQuoteRight,
  faShare,
  faTrash,
  faUsers,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import commingSoon from "../helpers/commingSoon";
import uploadFileToS3 from "../helpers/uploadFileToS3";
import { format } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import AddGroupMemberModal from "./AddGroupMemberModal";
import ConfirmModal from "./ConfirmModal";
import RightSidebar from "./RightSidebar";
import { toast } from "sonner";
import ReactionDisplay from "./ReactionDisplay";
import { useCallContext } from "../context/CallProvider";
import uploadFileToCloud from "../helpers/uploadFileToClound";

// Button component
const Button = ({ icon, width, title, styleIcon, isUpload, id, handleOnClick }) => {
  return isUpload ? (
    <label
      htmlFor={id}
      title={title}
      onClick={handleOnClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] hover:bg-[#ebe7eb]"
    >
      <FontAwesomeIcon icon={icon} width={width} className={`${styleIcon}`} />
    </label>
  ) : (
    <button
      title={title}
      onClick={handleOnClick}
      className="flex h-8 w-8 items-center justify-center rounded-[3px] hover:bg-[#ebe7eb]"
    >
      <FontAwesomeIcon icon={icon} width={width} className={`${styleIcon}`} />
    </button>
  );
};

Button.propTypes = {
  icon: PropTypes.object,
  width: PropTypes.number,
  title: PropTypes.string,
  styleIcon: PropTypes.string,
  isUpload: PropTypes.bool,
  id: PropTypes.string,
  handleOnClick: PropTypes.func,
};

export default function MessagePage() {
  const params = useParams();
  const navigate = useNavigate();
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
  });

  const [messages, setMessages] = useState({
    text: "",
    imageUrl: "",
    fileUrl: "",
    fileName: "",
  });

  const [allMessages, setAllMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [openTrash, setOpenTrash] = useState(false);

  const [openEmoji, setOpenEmoji] = useState(false);
  const emojiPickerRef = useRef(null);

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

      console.log("Joining room:", params.userId);
      // Immediately join the room
      socketConnection.emit("joinRoom", params.userId);

      // Set timeout for fetching data
      const timeoutId = setTimeout(() => {
        if (!conversationInitialized.current) {
          console.error("Timeout fetching conversation data");
          setLoadError("Could not load conversation data. Please try again.");
          setIsLoading(false);
        }
      }, 10000);

      socketConnection.on("messageUser", (payload) => {
        console.log("Received messageUser event:", payload);
        setDataUser({ ...payload, isGroup: false });
        setSeenMessage(true);
        setIsLoading(false);
        conversationInitialized.current = true;
      });

      socketConnection.on("message", (message) => {
        console.log("Received message event:", message?.messages?.length || 0, "messages");
        setAllMessages(message?.messages || []);
        setConversation(message);
        setIsLoading(false);
        conversationInitialized.current = true;
      });

      socketConnection.on("groupMessage", (groupData) => {
        console.log("Received groupMessage event:", groupData?.messages?.length || 0, "messages");
        setAllMessages(groupData?.messages || []);
        setConversation(groupData);
        setDataUser({
          _id: groupData._id,
          name: groupData.name,
          profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=random`,
          isGroup: true,
          members: groupData.members || [],
          groupAdmin: groupData.groupAdmin,
        });
        setSeenMessage(true);
        setIsLoading(false);
        conversationInitialized.current = true;
      });

      socketConnection.on("error", (error) => {
        console.error("Socket error:", error);
        setLoadError(error.message || "Error loading conversation");
        setIsLoading(false);
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
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [allMessages]);

  useEffect(() => {
    if (seenMessage) {
      inputRef.current?.focus();
    }
  }, [seenMessage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setOpenEmoji(false);
      }
    }

    if (openEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openEmoji]);

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

  const handleUploadFile = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleClearUploadFile = () => {
    setSelectedFile(null);
    if (imageInputRef.current) imageInputRef.current.value = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSendMessage = async () => {
    if ((!messages.text.trim() && !selectedFile) || !socketConnection) {
      return;
    }
    console.log(selectedFile, "selectedFile");
    let fileUrl = "";
    if (selectedFile) {
      // Upload use S3 AWS
      // const uploadPhotoToCloud = await uploadFileToS3(selectedFile);
      // Upload use Cloudinary
      const uploadPhotoToCloud = await uploadFileToCloud(selectedFile);
      fileUrl = uploadPhotoToCloud.secure_url;
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
    } else {
      if (dataUser.isGroup) {
        const groupMessage = {
          conversationId: params.userId,
          text: messages.text,
          imageUrl: selectedFile?.type?.startsWith("image/") ? fileUrl : "",
          fileUrl: selectedFile && !selectedFile.type.startsWith("image/") ? fileUrl : "",
          fileName: selectedFile?.name || "",
          msgByUserId: user?._id,
        };
        socketConnection.emit("newGroupMessage", groupMessage);
      } else {
        const newMessage = {
          sender: user._id,
          receiver: params.userId,
          text: messages.text,
          imageUrl: selectedFile?.type?.startsWith("image/") ? fileUrl : "",
          fileUrl: selectedFile && !selectedFile.type.startsWith("image/") ? fileUrl : "",
          fileName: selectedFile?.name || "",
          msgByUserId: user?._id,
        };
        socketConnection.emit("newMessage", newMessage);
      }
    }

    setMessages({ text: "", imageUrl: "", fileUrl: "", fileName: "" });
    setSelectedFile(null);
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
    if (!conversation?.members) return { name: "Unknown", profilePic: "" };

    const memberInfo = conversation.members.find((m) => m._id === senderId);

    if (memberInfo) return memberInfo;

    const messageWithSender = allMessages.find(
      (msg) => msg.msgByUserId && msg.msgByUserId._id === senderId && msg.msgByUserId.name,
    );

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
    if (!selectedFile) return null;

    if (selectedFile.type.startsWith("image/")) {
      return (
        <img src={URL.createObjectURL(selectedFile)} alt="image" className="aspect-square max-w-sm object-scale-down" />
      );
    }

    if (selectedFile.type.startsWith("video/")) {
      return (
        <video controls className="aspect-square max-w-sm object-scale-down">
          <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <div className="mt-5 flex flex-col items-center">
        <FontAwesomeIcon icon={faFilePen} width={50} className="text-[#ccc]" />
        <p className="mt-2 text-sm">{selectedFile.name}</p>
      </div>
    );
  };

  const handleInputFocus = () => {
    setSeenMessage(true);
  };

  const handleLeaveGroup = () => {
    if (!socketConnection || !dataUser.isGroup) return;

    setConfirmModal({
      isOpen: true,
      title: "Rời nhóm chat",
      message: "Bạn có chắc chắn muốn rời khỏi nhóm này?",
      action: () => {
        let cleanUserId;

        if (typeof user._id === "object" && user._id !== null) {
          cleanUserId = user._id.toString();
        } else if (typeof user._id === "string") {
          cleanUserId = user._id;
        } else {
          cleanUserId = user._id;
          console.warn("Unexpected user ID format:", user._id);
        }

        socketConnection.emit("leaveGroup", {
          groupId: params.userId,
          userId: cleanUserId,
        });

        socketConnection.once("leftGroup", (response) => {
          if (response.success) {
            toast.success(response.message);
            navigate("/");
          } else {
            toast.error(response.message);
          }
        });
      },
    });
  };

  const handleDeleteConversation = () => {
    if (!socketConnection) return;

    setConfirmModal({
      isOpen: true,
      title: dataUser.isGroup ? "Xóa nhóm chat" : "Xóa lịch sử trò chuyện",
      message: dataUser.isGroup
        ? "Bạn có chắc chắn muốn xóa nhóm chat này? Thao tác này không thể hoàn tác."
        : "Bạn có chắc chắn muốn xóa lịch sử trò chuyện này? Thao tác này không thể hoàn tác.",
      action: () => {
        const cleanUserId = typeof user._id === "object" ? user._id.toString() : user._id;

        socketConnection.emit("deleteConversation", {
          conversationId: params.userId,
          userId: cleanUserId,
        });

        socketConnection.once("conversationDeleted", (response) => {
          if (response.success) {
            toast.success(response.message);
            navigate("/");
          } else {
            toast.error(response.message);
          }
        });
      },
    });
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (!socketConnection || !dataUser.isGroup) return;

    if (user._id !== dataUser.groupAdmin?._id) {
      toast.error("Chỉ quản trị viên mới có thể xóa thành viên");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xóa thành viên khỏi nhóm",
      message: `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
      action: () => {
        const cleanAdminId = typeof user._id === "object" ? user._id.toString() : user._id;
        const cleanMemberId = typeof memberId === "object" ? memberId.toString() : memberId;

        socketConnection.emit("removeMemberFromGroup", {
          groupId: params.userId,
          memberId: cleanMemberId,
          adminId: cleanAdminId,
        });

        socketConnection.once("memberRemovedFromGroup", (response) => {
          if (response.success) {
            toast.success(response.message);
          } else {
            toast.error(response.message);
          }
        });
      },
    });
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setMessages({
      ...messages,
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

  const isDeletedMessage = (message) => {
    return message.isDeleted;
  };

  const photoVideoMessages = allMessages.filter(
    (message) =>
      (message.imageUrl || message.fileUrl) &&
      !(message.fileUrl && (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf"))),
  );

  const fileMessages = allMessages.filter(
    (message) => message.fileUrl && (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")),
  );

  const linkMessages = allMessages.filter((message) => message.text.startsWith("https"));

  const isSystemNotification = (messageText) => {
    if (!messageText) return false;

    const patterns = [
      /đã tạo nhóm/i,
      /đã thêm .+ vào nhóm/i,
      /đã thêm \d+ người dùng vào nhóm/i,
      /đã rời khỏi nhóm/i,
      /đã xóa/i,
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

  const handleAudioCall = () => {
    if (dataUser.isGroup) {
      toast.error("Không thể gọi điện cho nhóm chat");
      return;
    }

    if (!callUser) {
      toast.error("Chức năng gọi điện đang không khả dụng");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Trình duyệt của bạn không hỗ trợ cuộc gọi");
      return;
    }

    if (!dataUser.online) {
      toast.error("Người dùng hiện không trực tuyến, không thể gọi điện");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        callUser(params.userId, dataUser.name, dataUser.profilePic, false);
      })
      .catch((err) => {
        console.error("Permission check failed:", err);
        if (err.name === "NotAllowedError") {
          toast.error("Vui lòng cấp quyền truy cập microphone để thực hiện cuộc gọi");
        } else {
          toast.error("Không thể truy cập thiết bị âm thanh");
        }
      });
  };

  const handleVideoCall = () => {
    if (dataUser.isGroup) {
      toast.error("Không thể gọi video cho nhóm chat");
      return;
    }

    if (!callUser) {
      toast.error("Chức năng gọi video đang không khả dụng");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Trình duyệt của bạn không hỗ trợ cuộc gọi video");
      return;
    }

    if (!dataUser.online) {
      toast.error("Người dùng hiện không trực tuyến, không thể gọi video");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        callUser(params.userId, dataUser.name, dataUser.profilePic, true);
      })
      .catch((err) => {
        console.error("Permission check failed:", err);
        if (err.name === "NotAllowedError") {
          toast.error("Vui lòng cấp quyền truy cập camera và microphone để thực hiện cuộc gọi video");
        } else {
          toast.error("Không thể truy cập camera hoặc microphone");
        }
      });
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

  return (
    <main className="flex h-full">
      <div className="flex h-full flex-1 flex-col">
        {(dataUser._id || isLoading) && (
          <header className="sticky top-0 flex h-[68px] items-center justify-between border-b border-[#c8c9cc] px-4">
            {isLoading ? (
              <div className="flex w-full items-center space-x-4">
                <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200"></div>
                <div className="flex flex-col gap-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center space-x-4">
                <div className="relative">
                  <img
                    src={dataUser?.profilePic}
                    alt={dataUser.name}
                    className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                  />
                  {!dataUser.isGroup && dataUser.online ? (
                    <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
                  ) : (
                    <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#8f918f]"></div>
                  )}
                  {dataUser.isGroup && (
                    <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#005ae0]">
                      <FontAwesomeIcon icon={faUsers} width={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-y-1">
                  <span className="text-base font-semibold">{dataUser?.name}</span>
                  <div className="flex items-center space-x-2">
                    {dataUser.isGroup && (
                      <span className="text-xs text-gray-500">{dataUser.members?.length || 0} thành viên</span>
                    )}
                    <button className="flex">
                      <FontAwesomeIcon
                        icon={faBookmark}
                        width={16}
                        className="rotate-90 text-sm text-[#555454] hover:text-[#005ae0]"
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-[3px]">
              <Button title="Thêm bạn vào nhóm" icon={faPlus} width={20} handleOnClick={commingSoon} />
              <Button
                title={dataUser.online ? "Cuộc gọi thoại" : "Người dùng không trực tuyến"}
                icon={faPhone}
                width={20}
                handleOnClick={handleAudioCall}
                styleIcon={dataUser.isGroup || !dataUser.online ? "text-gray-400" : ""}
              />
              <Button
                title={dataUser.online ? "Cuộc gọi video" : "Người dùng không trực tuyến"}
                icon={faVideo}
                width={20}
                handleOnClick={handleVideoCall}
                styleIcon={dataUser.isGroup || !dataUser.online ? "text-gray-400" : ""}
              />
              <Button title="Tìm kiếm tin nhắn" icon={faMagnifyingGlass} width={18} handleOnClick={commingSoon} />
              <Button
                title="Thông tin hội thoại"
                icon={faBars}
                width={18}
                handleOnClick={() => setShowRightSideBar(!showRightSideBar)}
              />
            </div>
          </header>
        )}

        <div className="flex flex-1 overflow-hidden">
          <section className={`scrollbar relative flex-1 overflow-y-auto overflow-x-hidden bg-[#ebecf0]`}>
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
              <div className="absolute inset-0 mt-2 flex flex-col gap-y-5 px-4">
                {allMessages.map((message) => {
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
                    const isCurrentUser = message.msgByUserId === user._id;
                    let sender = null;
                    if (dataUser.isGroup && !isCurrentUser) {
                      sender = getSenderInfo(message.msgByUserId);
                    }
                    return (
                      <div
                        key={message._id}
                        className={`flex gap-x-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        onMouseEnter={() => setHoveredMessage(message._id)}
                        onMouseLeave={() => setHoveredMessage(null)}
                      >
                        {!isCurrentUser && (
                          <button className="flex">
                            <img
                              src={dataUser.isGroup && sender ? sender.profilePic : dataUser.profilePic}
                              alt="avatar"
                              className="h-9 w-9 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                            />
                          </button>
                        )}
                        <div
                          className={`relative h-full rounded-md border border-[#c9d0db] p-3 text-[#081b3a] ${
                            isCurrentUser ? "bg-[#dbebff]" : "bg-white"
                          }`}
                        >
                          {dataUser.isGroup && !isCurrentUser && (
                            <div className="mb-1 text-xs font-medium text-blue-600">{sender?.name}</div>
                          )}
                          <div className="flex items-center">
                            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-200">
                              <FontAwesomeIcon
                                icon={getCallIcon(message)}
                                className={`${
                                  message.callData?.callStatus === "missed" ? "text-red-500" : "text-blue-500"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm">{getCallStatusText(message)}</p>
                              <p className="text-[11px] text-gray-500">
                                {format(new Date(message.createdAt), "HH:mm")}
                              </p>
                            </div>
                          </div>
                          {message.reactions && message.reactions.length > 0 && (
                            <ReactionDisplay reactions={message.reactions} currentUserId={user._id} />
                          )}
                          <div
                            className="absolute -bottom-2 -right-2 flex cursor-pointer items-center gap-x-1 rounded-full bg-white px-1 py-[3px]"
                            onMouseEnter={() => {
                              setHoveredLikeMessage(message._id), setHoveredMessage(null);
                            }}
                            onMouseLeave={() => setHoveredLikeMessage(null)}
                            onClick={() => handleQuickLike(message._id)}
                          >
                            <FontAwesomeIcon icon={faThumbsUp} width={14} className="text-[#8b8b8b]" />
                            {hoveredLikeMessage === message._id && (
                              <div className={`absolute bottom-4 z-50 ${isCurrentUser ? "right-3" : "left-3"}`}>
                                <EmojiPicker
                                  emojiStyle="apple"
                                  reactionsDefaultOpen={true}
                                  onEmojiClick={(emojiData) => {
                                    handleAddReaction(message._id, emojiData.emoji);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const isCurrentUser = message.msgByUserId === user._id;
                    let sender = null;
                    if (dataUser.isGroup && !isCurrentUser) {
                      sender = getSenderInfo(message.msgByUserId);
                    }
                    return (
                      <div
                        key={message._id}
                        className={`flex gap-x-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        onMouseEnter={() => setHoveredMessage(message._id)}
                        onMouseLeave={() => setHoveredMessage(null)}
                      >
                        {!isCurrentUser && (
                          <button className="flex">
                            <img
                              src={dataUser.isGroup && sender ? sender.profilePic : dataUser.profilePic}
                              alt="avatar"
                              className="h-9 w-9 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                            />
                          </button>
                        )}
                        <div
                          className={`relative h-full max-w-md rounded-md border border-[#c9d0db] p-3 text-[#081b3a] ${
                            isCurrentUser ? "bg-[#dbebff]" : "bg-white"
                          }`}
                        >
                          {dataUser.isGroup && !isCurrentUser && (
                            <div className="mb-1 text-xs font-medium text-blue-600">{sender?.name}</div>
                          )}
                          {isDeletedMessage(message) ? (
                            <div>
                              <p className="break-words text-sm italic text-gray-500">Tin nhắn đã được xóa</p>
                              <p className="mt-1 text-[11px] text-[#00000080]">
                                {format(new Date(message.createdAt), "HH:mm")}
                                {message.isEdited && <span className="ml-1 text-[10px] italic">(Đã chỉnh sửa)</span>}
                              </p>
                            </div>
                          ) : (
                            <>
                              {message.imageUrl && (
                                <img src={message.imageUrl} alt="image" className="rounded-[3px] object-contain" />
                              )}
                              {message.fileUrl && (
                                <div className="flex items-center gap-x-1">
                                  {message.fileUrl.endsWith(".mp4") ||
                                  message.fileUrl.endsWith(".webm") ||
                                  message.fileUrl.endsWith(".ogg") ? (
                                    <video controls className="rounded-[3px] object-contain">
                                      <source src={message.fileUrl} type="video/mp4" />
                                      Your browser does not support the video tag.
                                    </video>
                                  ) : (
                                    <>
                                      <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />
                                      <a
                                        href={message.fileUrl}
                                        className="break-words text-sm"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {message.fileName}
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                              <div>
                                {message.text.startsWith("https") ? (
                                  <a
                                    href={message.text}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-500 underline"
                                  >
                                    {message.text}
                                  </a>
                                ) : (
                                  <p className="break-words text-sm">{message.text}</p>
                                )}
                                <p className="mt-1 text-[11px] text-[#00000080]">
                                  {format(new Date(message.createdAt), "HH:mm")}
                                  {message.isEdited && <span className="ml-1 text-[10px] italic">(Đã chỉnh sửa)</span>}
                                </p>
                                <ReactionDisplay reactions={message.reactions} currentUserId={user._id} />
                              </div>
                            </>
                          )}
                          {!isDeletedMessage(message) && (
                            <div
                              className="absolute -bottom-2 -right-2 flex cursor-pointer items-center gap-x-1 rounded-full bg-white px-1 py-[3px]"
                              onMouseEnter={() => {
                                setHoveredLikeMessage(message._id), setHoveredMessage(null);
                              }}
                              onMouseLeave={() => setHoveredLikeMessage(null)}
                              onClick={() => handleQuickLike(message._id)}
                            >
                              <FontAwesomeIcon icon={faThumbsUp} width={14} className="text-[#8b8b8b]" />
                              {hoveredLikeMessage === message._id && (
                                <div className={`absolute bottom-4 z-50 ${isCurrentUser ? "right-3" : "left-3"}`}>
                                  <EmojiPicker
                                    emojiStyle="apple"
                                    reactionsDefaultOpen={true}
                                    onEmojiClick={(emojiData) => {
                                      handleAddReaction(message._id, emojiData.emoji);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {hoveredMessage === message._id && (
                            <div
                              className={`absolute bottom-3 ${isCurrentUser ? "-left-20" : "-right-20"} flex items-center gap-x-1`}
                            >
                              <button
                                className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
                                onClick={commingSoon}
                              >
                                <FontAwesomeIcon
                                  icon={faQuoteRight}
                                  width={10}
                                  className="text-[#5a5a5a] group-hover:text-[#005ae0]"
                                />
                              </button>
                              <button
                                className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
                                onClick={commingSoon}
                              >
                                <FontAwesomeIcon
                                  icon={faShare}
                                  width={10}
                                  className="text-[#5a5a5a] group-hover:text-[#005ae0]"
                                />
                              </button>
                              <button
                                className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
                                onMouseEnter={() => setOpenActionMessage(true)}
                              >
                                <FontAwesomeIcon
                                  icon={faEllipsis}
                                  width={10}
                                  className="text-[#5a5a5a] group-hover:text-[#005ae0]"
                                />
                              </button>

                              {openActionMessage && isCurrentUser && !isDeletedMessage(message) && (
                                <div
                                  className={`absolute bottom-7 ${isCurrentUser ? "right-0" : "left-0"} w-[120px] rounded-sm bg-white py-2`}
                                  onMouseEnter={() => setOpenActionMessage(true)}
                                  onMouseLeave={() => setOpenActionMessage(false)}
                                >
                                  <button
                                    className="group flex w-full items-center gap-1 bg-white px-[6px] py-1 hover:bg-[#c6cad2]"
                                    onClick={() => handleEditMessage(message)}
                                  >
                                    <FontAwesomeIcon icon={faArrowRotateRight} width={10} className="text-[#5a5a5a]" />
                                    <span className="text-sm">Sửa tin nhắn</span>
                                  </button>
                                  <button
                                    className="group flex w-full items-center gap-1 bg-white px-[6px] py-1 hover:bg-[#c6cad2]"
                                    onClick={() => handleDeleteMessage(message._id)}
                                  >
                                    <FontAwesomeIcon
                                      icon={faTrash}
                                      width={10}
                                      className="text-[#5a5a5a] group-hover:text-red-600"
                                    />
                                    <span className="text-sm group-hover:text-red-600">Xóa tin nhắn</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            {selectedFile && (
              <div className="sticky top-0 z-50 flex h-full items-center justify-center bg-gray-400 bg-opacity-40">
                <div
                  className="relative rounded bg-[#fffefe] p-4"
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

        {!isLoading && !loadError && (
          <footer className="relative">
            <div className="flex h-10 items-center gap-x-3 border-b border-t border-[#c8c9cc] px-2">
              <Button
                title="Gửi Sticker"
                icon={faFaceLaughSquint}
                width={20}
                handleOnClick={() => setOpenEmoji(true)}
              />
              <Button
                title="Gửi hình ảnh"
                icon={faImage}
                width={20}
                isUpload
                id="image"
                handleOnClick={handleUploadFile}
              />
              <Button
                title="Gửi kèm File"
                icon={faFolderClosed}
                width={20}
                isUpload
                id="file"
                handleOnClick={handleUploadFile}
              />
              <Button title="Gửi danh thiếp" icon={faAddressCard} width={20} handleOnClick={commingSoon} />
              <Button title="Chụp kèm với cửa sổ Z" icon={faCamera} width={20} handleOnClick={commingSoon} />
              <Button title="Định dạng tin nhắn" icon={faFilePen} width={20} handleOnClick={commingSoon} />
              <Button title="Chèn tin nhắn nhanh" icon={faBolt} width={20} handleOnClick={commingSoon} />
              <Button title="Tùy chọn thêm" icon={faEllipsis} width={20} handleOnClick={commingSoon} />
            </div>
            {openEmoji && (
              <div ref={emojiPickerRef} className="absolute bottom-24 left-0 z-50">
                <EmojiPicker
                  disableSearchBar
                  disableSkinTonePicker
                  emojiStyle="apple"
                  height={400}
                  width={300}
                  searchDisabled
                  onEmojiClick={(emojiData) => {
                    setMessages({ ...messages, text: messages.text + emojiData.emoji });
                  }}
                />
              </div>
            )}
            <input
              type="file"
              name="image"
              id="image"
              accept="image/*"
              hidden
              onChange={handleUploadFile}
              ref={imageInputRef}
            />
            <input type="file" name="file" id="file" hidden onChange={handleUploadFile} ref={fileInputRef} />
            <div className="flex h-[50px] items-center px-3 py-[10px]">
              {editingMessage && (
                <div className="absolute -top-9 left-0 right-0 flex items-center justify-between bg-blue-50 px-3 py-2 text-sm">
                  <span>Chỉnh sửa tin nhắn</span>
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setMessages({ text: "", imageUrl: "", fileUrl: "", fileName: "" });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Hủy
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder={`Nhập tin nhắn với ${dataUser.name}`}
                className="h-full flex-1 rounded-[3px] text-sm"
                value={messages.text}
                onChange={(e) => setMessages({ ...messages, text: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                onFocus={handleInputFocus}
                onBlur={() => setSeenMessage(false)}
                ref={inputRef}
              />
              <div className="flex items-center gap-x-1">
                <Button title="Biểu cảm" icon={faFaceSmile} width={20} handleOnClick={() => setOpenEmoji(true)} />
                {messages.text === "" && !selectedFile ? (
                  <Button
                    title="Gửi nhanh biểu tưởng cảm xúc"
                    icon={faThumbsUp}
                    width={20}
                    handleOnClick={handleSendEmojiLike}
                  />
                ) : (
                  <Button
                    title="Gửi tin nhắn"
                    icon={faPaperPlane}
                    width={20}
                    styleIcon="text-[#005ae0]"
                    handleOnClick={handleSendMessage}
                  />
                )}
              </div>
            </div>
          </footer>
        )}
      </div>

      {!isLoading && !loadError && showRightSideBar && (
        <RightSidebar
          isVisible={showRightSideBar}
          dataUser={dataUser}
          user={user}
          showContextMenu={showContextMenu}
          setShowContextMenu={setShowContextMenu}
          photoVideoMessages={photoVideoMessages}
          fileMessages={fileMessages}
          linkMessages={linkMessages}
          onAddMember={handleAddMember}
          onLeaveGroup={handleLeaveGroup}
          onDeleteConversation={handleDeleteConversation}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showAddMemberModal && (
        <AddGroupMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          groupId={params.userId}
          existingMembers={dataUser.members || []}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action || (() => {})}
        title={confirmModal.title || "Xác nhận"}
        message={confirmModal.message || "Bạn có chắc chắn muốn thực hiện hành động này?"}
        type="danger"
      />
    </main>
  );
}
