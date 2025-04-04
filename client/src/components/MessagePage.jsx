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
import uploadFileToCloud from "../helpers/uploadFileToClound";
import { format } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import AddGroupMemberModal from "./AddGroupMemberModal";
import ConfirmModal from "./ConfirmModal";
import RightSidebar from "./RightSidebar";
import { toast } from "sonner";

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

  const [showRightSideBar, setShowRightSideBar] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState("Thông tin hội thoại");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
  });

  useEffect(() => {
    if (socketConnection) {
      socketConnection.off("messageUser");
      socketConnection.off("message");
      socketConnection.off("groupMessage");

      socketConnection.emit("joinRoom", params.userId);

      socketConnection.on("messageUser", (payload) => {
        setDataUser({ ...payload, isGroup: false });
        setSeenMessage(true);
      });

      socketConnection.on("message", (message) => {
        setAllMessages(message?.messages || []);
        setConversation(message);
      });

      setShowContextMenu("Thông tin hội thoại");

      socketConnection.on("groupMessage", (groupData) => {
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
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off("messageUser");
        socketConnection.off("message");
        socketConnection.off("groupMessage");
      }
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

    let fileUrl = "";
    if (selectedFile) {
      const uploadFile = await uploadFileToCloud(selectedFile);
      fileUrl = uploadFile.secure_url;
    }

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

    // First try to find member in current group members
    const memberInfo = conversation.members.find((m) => m._id === senderId);

    if (memberInfo) return memberInfo;

    // If not found in current members, the user may have left the group
    // Check if the message object has populated sender info from messages array
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

    // If we can't find sender info anywhere, show as former member
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
        // Extract only the ID string, ensuring we don't send the full user object
        let cleanUserId;

        if (typeof user._id === "object" && user._id !== null) {
          // If it's an ObjectId object
          cleanUserId = user._id.toString();
        } else if (typeof user._id === "string") {
          cleanUserId = user._id;
        } else {
          // Fallback - use the user._id directly, though this should rarely happen
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
            // Navigate back to home after leaving
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
        // Extract clean user ID
        const cleanUserId = typeof user._id === "object" ? user._id.toString() : user._id;

        socketConnection.emit("deleteConversation", {
          conversationId: params.userId,
          userId: cleanUserId,
        });

        socketConnection.once("conversationDeleted", (response) => {
          if (response.success) {
            toast.success(response.message);
            // Navigate back to home after successful deletion
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

    // Only admin can remove members
    if (user._id !== dataUser.groupAdmin?._id) {
      toast.error("Chỉ quản trị viên mới có thể xóa thành viên");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xóa thành viên khỏi nhóm",
      message: `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
      action: () => {
        // Extract clean user IDs
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

  // Filter messages for media sections
  const photoVideoMessages = allMessages.filter(
    (message) =>
      (message.imageUrl || message.fileUrl) &&
      !(message.fileUrl && (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf"))),
  );

  const fileMessages = allMessages.filter(
    (message) => message.fileUrl && (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")),
  );

  const linkMessages = allMessages.filter((message) => message.text.startsWith("https"));

  // Add this function to check if a message is a system notification
  const isSystemNotification = (messageText) => {
    if (!messageText) return false;

    // Patterns that match system notifications
    const patterns = [
      /đã tạo nhóm/i,
      /đã thêm .+ vào nhóm/i,
      /đã thêm \d+ người dùng vào nhóm/i,
      /đã rời khỏi nhóm/i,
      /đã xóa/i,
    ];

    return patterns.some((pattern) => pattern.test(messageText));
  };

  return (
    <main className="flex h-full">
      <div className="flex h-full flex-1 flex-col">
        {/* Header: message page */}
        <header className="sticky top-0 flex h-[68px] items-center justify-between border-b border-[#c8c9cc] px-4">
          <div className="flex w-full items-center space-x-4">
            <div className="relative">
              <img
                src={dataUser?.profilePic}
                alt={dataUser.name}
                className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
              />
              {!dataUser.isGroup && dataUser.online && (
                <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
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
          <div className="flex items-center space-x-[3px]">
            <Button title="Thêm bạn vào nhóm" icon={faPlus} width={20} handleOnClick={commingSoon} />
            <Button title="Cuộc gọi thoại" icon={faPhone} width={20} handleOnClick={commingSoon} />
            <Button title="Cuộc gọi video" icon={faVideo} width={20} handleOnClick={commingSoon} />
            <Button title="Tìm kiếm tin nhắn" icon={faMagnifyingGlass} width={18} handleOnClick={commingSoon} />
            <Button
              title="Thông tin hội thoại"
              icon={faBars}
              width={18}
              handleOnClick={() => setShowRightSideBar(!showRightSideBar)}
            />
          </div>
        </header>

        {/* Body: Show all messages */}
        <div className="flex flex-1 overflow-hidden">
          <section className={`scrollbar relative flex-1 overflow-y-auto overflow-x-hidden bg-[#ebecf0]`}>
            <div className="absolute inset-0 mt-2 flex flex-col gap-y-5 px-4">
              {allMessages.map((message) => {
                // Check if this is a system notification message
                if (isSystemNotification(message.text)) {
                  return (
                    <div key={message._id} className="flex justify-center">
                      <div className="flex items-center rounded-full bg-white px-4 py-2 text-center text-[11px] font-semibold text-gray-500">
                        <span>{message.text}:</span>
                        <span className="text-[11px] font-medium text-[#00000060]">
                          {format(new Date(message.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Regular message rendering
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
                      className={`relative h-full max-w-md rounded-md border border-[#c9d0db] p-3 ${
                        isCurrentUser ? "bg-[#dbebff] text-[#081b3a]" : "bg-white text-[#081b3a]"
                      }`}
                    >
                      {dataUser.isGroup && !isCurrentUser && (
                        <div className="mb-1 text-xs font-medium text-blue-600">{sender?.name}</div>
                      )}

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
                        </p>
                      </div>

                      <div
                        className="absolute -bottom-2 -right-2 flex cursor-pointer items-center gap-x-1 rounded-full bg-white px-1 py-[3px]"
                        onMouseEnter={() => {
                          setHoveredLikeMessage(message._id), setHoveredMessage(null);
                        }}
                        onMouseLeave={() => setHoveredLikeMessage(null)}
                      >
                        <FontAwesomeIcon icon={faThumbsUp} width={14} className="text-[#8b8b8b]" />

                        {hoveredLikeMessage === message._id && (
                          <div className={`absolute bottom-4 z-50 ${isCurrentUser ? "right-3" : "left-3"}`}>
                            <EmojiPicker
                              emojiStyle="apple"
                              reactionsDefaultOpen={true}
                              onEmojiClick={(emojiData) => {
                                console.log("Chọn emoji:", emojiData.emoji);
                              }}
                            />
                          </div>
                        )}
                      </div>

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
                            onClick={commingSoon}
                          >
                            <FontAwesomeIcon
                              icon={faTrash}
                              width={10}
                              className="text-[#5a5a5a] group-hover:text-red-600"
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

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
        {/* Footer: Input send message */}
        <footer className="relative">
          <div className="flex h-10 items-center gap-x-3 border-b border-t border-[#c8c9cc] px-2">
            <Button title="Gửi Sticker" icon={faFaceLaughSquint} width={20} handleOnClick={() => setOpenEmoji(true)} />
            <Button title="Gửi hình ảnh" icon={faImage} width={20} isUpload id="image" />
            <Button title="Gửi kèm File" icon={faFolderClosed} width={20} isUpload id="file" />
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
      </div>

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
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
      />
    </main>
  );
}
