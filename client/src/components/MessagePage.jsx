import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "../context/GlobalProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAddressCard,
  faBell,
  faBookmark,
  faEdit,
  faFaceLaughSquint,
  faFaceSmile,
  faFolderClosed,
  faImage,
  faThumbsUp,
  faUser,
} from "@fortawesome/free-regular-svg-icons";
import {
  faBars,
  faBolt,
  faCamera,
  faCaretDown,
  faChevronLeft,
  faEllipsis,
  faFilePen,
  faGear,
  faLink,
  faMagnifyingGlass,
  faPaperPlane,
  faPhone,
  faPlus,
  faQuoteRight,
  faShare,
  faSignOut,
  faThumbTack,
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

export default function MessagePage() {
  const params = useParams();
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

  // State to track if members panel is open

  const [showRightSideBar, setShowRightSideBar] = useState(true);

  const [showContextMenu, setShowContextMenu] = useState("Thông tin hội thoại");

  const [activeTab, setActiveTab] = useState("Anh/Video");

  useEffect(() => {
    if (socketConnection) {
      // Clear previous event listeners when changing rooms
      socketConnection.off("messageUser");
      socketConnection.off("message");
      socketConnection.off("groupMessage");

      // Join the new room
      socketConnection.emit("joinRoom", params.userId);

      socketConnection.on("messageUser", (payload) => {
        console.log("Message User: ", payload);
        setDataUser({ ...payload, isGroup: false });

        // Already been marked as seen in the server
        setSeenMessage(true);
      });

      socketConnection.on("message", (message) => {
        console.log("Message Data", message);
        setAllMessages(message?.messages || []);
        setConversation(message);
      });

      socketConnection.on("groupMessage", (groupData) => {
        console.log("Group Message Data", groupData);
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

        // Already been marked as seen in the server
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

  const handleUploadFile = (e) => {
    const file = e.target.files[0];
    console.log("File: ", file);
    setSelectedFile(file);
  };

  const handleClearUploadFile = () => {
    setSelectedFile(null);
    if (imageInputRef.current) imageInputRef.current.value = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSendMessage = async () => {
    if ((!messages.text.trim() && !selectedFile) || !socketConnection) {
      return; // Don't send empty messages
    }

    let fileUrl = "";
    if (selectedFile) {
      const uploadFile = await uploadFileToCloud(selectedFile);
      fileUrl = uploadFile.secure_url;
    }

    if (dataUser.isGroup) {
      // Send group message
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
      // Send direct message
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

    // Reset state
    setMessages({ text: "", imageUrl: "", fileUrl: "", fileName: "" });
    setSelectedFile(null);
    handleClearUploadFile();
  };

  const handleSendEmojiLike = () => {
    if (dataUser.isGroup) {
      // Send like emoji to group
      const emojiMessage = {
        conversationId: params.userId,
        text: "👍",
        msgByUserId: user?._id,
      };
      socketConnection.emit("newGroupMessage", emojiMessage);
    } else {
      // Send like emoji to direct chat
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

  // Get sender info for group messages
  const getSenderInfo = (senderId) => {
    if (!conversation?.members) return { name: "Unknown", profilePic: "" };

    const memberInfo = conversation.members.find((m) => m._id === senderId);
    return memberInfo || { name: "Unknown", profilePic: "" };
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

  const ActionGroupButton = ({ icon, title, handleOnClick }) => {
    return (
      <div className="flex flex-col items-center justify-center gap-y-1">
        <button
          onClick={handleOnClick}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebe7eb] hover:bg-[#e0dde0]"
        >
          <FontAwesomeIcon icon={icon} width={20} />
        </button>
        <span className="w-16 text-center text-xs">{title}</span>
      </div>
    );
  };

  return (
    <main className="flex h-full">
      <div className="flex h-full flex-1 flex-col">
        {/* Header chat */}
        <header className="sticky top-0 flex h-[68px] items-center justify-between border-b border-[#c8c9cc] px-4">
          <div className="flex w-full items-center space-x-4">
            <div className="relative">
              <img
                src={dataUser?.profilePic}
                alt={dataUser.name}
                className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
              />
              {/* {dataUser.isGroup && (
                <div className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 p-1">
                  <FontAwesomeIcon icon={faUsers} size="xs" className="text-white" />
                </div>
              )} */}
              {!dataUser.isGroup && dataUser.online && (
                <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
              )}
            </div>
            <div className="flex flex-col gap-y-1">
              <span className="text-base font-semibold">{dataUser?.name}</span>
              {dataUser.isGroup && (
                <span className="text-xs text-gray-500">{dataUser.members?.length || 0} thành viên</span>
              )}
              {!dataUser.isGroup && (
                <button className="flex">
                  <FontAwesomeIcon
                    icon={faBookmark}
                    width={16}
                    className="rotate-90 text-sm text-[#555454] hover:text-[#005ae0]"
                  />
                </button>
              )}
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

        <div className="flex flex-1 overflow-hidden">
          {/* Show all message chat */}
          <section className={`scrollbar relative flex-1 overflow-y-auto overflow-x-hidden bg-[#ebecf0]`}>
            {/* All message chat */}
            <div className="absolute inset-0 mt-2 flex flex-col gap-y-5 px-4">
              {allMessages.map((message) => {
                const isCurrentUser = message.msgByUserId === user._id;
                let sender = null;

                // For group chats, get the sender's info
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
                      {/* Show sender name in group chats */}
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
                          <div className={`absolute bottom-4 z-50 ${isCurrentUser ? "right-8" : "left-8"}`}>
                            <EmojiPicker
                              emojiStyle="apple"
                              reactionsDefaultOpen={true}
                              onEmojiClick={(emojiData) => {
                                console.log("Chọn emoji:", emojiData.emoji);
                                // Add emoji reaction functionality here
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

            {/* Render file preview */}
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

        {/* Sent message */}
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

          {/* Emoji Picker React*/}
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
          {/* Input file*/}
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

      {/* Right side bar */}
      {showRightSideBar && (
        <div className="w-[344px] overflow-auto border-l border-[#c8c9cc] bg-[#ebecf0]">
          {/* Header */}
          <div className="sticky top-0 flex h-[68px] items-center justify-center border-b border-[#c8c9cc] bg-white">
            {showContextMenu !== "Thông tin hội thoại" && (
              <button
                className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-full object-cover hover:bg-[#ebe7eb]"
                onClick={() => setShowContextMenu("Thông tin hội thoại")}
              >
                <FontAwesomeIcon icon={faChevronLeft} width={20} />
              </button>
            )}
            <span className="text-lg font-bold">{showContextMenu}</span>
          </div>

          {/* Context main */}
          {showContextMenu === "Thông tin hội thoại" && (
            <div className="">
              {/* Information conversation*/}
              <div className="flex flex-col items-center bg-white px-4 py-3">
                <button className="my-3">
                  <img
                    src={dataUser?.profilePic}
                    alt={dataUser.name}
                    className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                  />
                </button>
                <div className="flex items-center space-x-1">
                  <span className="text-base font-semibold">{dataUser.name}</span>
                  <button>
                    <FontAwesomeIcon icon={faEdit} width={20} />
                  </button>
                </div>
                <div className="mt-3 flex w-full items-center justify-between">
                  <ActionGroupButton icon={faBell} title="Tăt thông báo" handleOnClick={commingSoon} />
                  <ActionGroupButton icon={faThumbTack} title="Ghim hội thoại" handleOnClick={commingSoon} />
                  <ActionGroupButton icon={faUsers} title="Thêm thành viên" handleOnClick={commingSoon} />
                  <ActionGroupButton icon={faGear} title="Quản lý nhóm" handleOnClick={commingSoon} />
                </div>
              </div>

              {/* Member group chat */}
              {dataUser.isGroup && (
                <div className="mt-2 flex flex-col items-center bg-white">
                  <button className="flex h-12 w-full items-center justify-between px-4">
                    <span className="text-base font-semibold">Thành viên nhóm</span>
                    <FontAwesomeIcon icon={faCaretDown} width={20} />
                  </button>
                  <button
                    className="flex h-12 w-full items-center justify-start px-4 text-sm hover:bg-[#f1f2f4]"
                    onClick={() => setShowContextMenu("Thành viên")}
                  >
                    <FontAwesomeIcon icon={faUser} width={20} />
                    {dataUser.members?.length || 0} thành viên
                  </button>
                </div>
              )}

              {/* Photo & Video */}
              <div className="mt-2 flex flex-col items-center bg-white">
                <button className="flex h-12 w-full items-center justify-between px-4">
                  <span className="text-base font-semibold">Ảnh/Video</span>
                  <FontAwesomeIcon icon={faCaretDown} width={20} />
                </button>
                {/*  Show 8 photo and video lastest from conversation*/}
                <div className="grid w-full grid-cols-4 gap-2 px-4">
                  {allMessages
                    .filter((message) => message.imageUrl || message.fileUrl)
                    .slice(0, 9)
                    .map(
                      (message) =>
                        !(message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")) && (
                          <button key={message._id} className="h-[72px] overflow-hidden hover:opacity-80">
                            {message.imageUrl && (
                              <img src={message.imageUrl} alt="image" className="rounded-[3px] object-contain" />
                            )}
                            {message.fileUrl &&
                              (message.fileUrl.endsWith(".mp4") ||
                              message.fileUrl.endsWith(".webm") ||
                              message.fileUrl.endsWith(".ogg") ? (
                                <video controls className="rounded-[3px] object-contain">
                                  <source src={message.fileUrl} type="video/mp4" />
                                  Your browser does not support the video tag.
                                </video>
                              ) : (
                                <></>
                              ))}
                          </button>
                        ),
                    )}
                </div>

                <div className="w-full p-4">
                  <button
                    className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm font-semibold hover:bg-[#e0dde0]"
                    onClick={() => {
                      setShowContextMenu("Kho lưu trữ"), setActiveTab("Anh/Video");
                    }}
                  >
                    Xem tất cả
                  </button>
                </div>
              </div>

              {/* File */}
              <div className="mt-2 flex flex-col items-center bg-white">
                <button className="flex h-12 w-full items-center justify-between px-4">
                  <span className="text-base font-semibold">File</span>
                  <FontAwesomeIcon icon={faCaretDown} width={20} />
                </button>
                {/*  Show 3 file lastest from conversation*/}
                <div className="flex w-full flex-col">
                  {allMessages
                    .filter((message) => message.fileUrl)
                    .slice(0, 4)
                    .map(
                      (message) =>
                        (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")) && (
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            key={message._id}
                            className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
                          >
                            <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />

                            <div className="flex flex-1 flex-col items-start pl-3">
                              <span className="break-words text-sm">{message.fileName}</span>
                              <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
                                {/* Number kb */}
                                {/* {Math.round(message.fileSize / 1024)} KB */}
                                <span>100.00 KB</span>
                                <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
                              </div>
                            </div>
                          </a>
                        ),
                    )}
                </div>

                <div className="w-full p-4">
                  <button
                    className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm font-semibold hover:bg-[#e0dde0]"
                    onClick={() => {
                      setShowContextMenu("Kho lưu trữ"), setActiveTab("Files");
                    }}
                  >
                    Xem tất cả
                  </button>
                </div>
              </div>

              {/* Link */}
              <div className="mt-2 flex flex-col items-center bg-white">
                <button className="flex h-12 w-full items-center justify-between px-4">
                  <span className="text-base font-semibold">Link</span>
                  <FontAwesomeIcon icon={faCaretDown} width={20} />
                </button>
                {/*  Show 3 Link lastest from conversation */}
                <div className="flex w-full flex-col">
                  {allMessages
                    .filter((message) => message.text.startsWith("https"))
                    .slice(0, 4)
                    .map((message) => (
                      <a
                        href={message.text}
                        target="_blank"
                        rel="noreferrer"
                        key={message._id}
                        className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
                      >
                        <FontAwesomeIcon icon={faLink} width={20} className="text-[#ccc]" />

                        <div className="flex flex-1 flex-col items-start pl-3">
                          <span className="break-words text-sm">{message.text}</span>
                          <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
                            {/* slice https:// , result: facebook.com */}
                            <span className="font-medium text-blue-500">{message.text.slice(8)}</span>
                            <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                </div>

                <div className="w-full p-4">
                  <button
                    className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm font-semibold hover:bg-[#e0dde0]"
                    onClick={() => {
                      setShowContextMenu("Kho lưu trữ"), setActiveTab("Link");
                    }}
                  >
                    Xem tất cả
                  </button>
                </div>
              </div>

              {/* OutGroup */}
              {dataUser.isGroup && (
                <div className="mt-2 flex flex-col items-center bg-white">
                  <button
                    className="flex h-12 w-full items-center justify-start px-4 text-sm text-red-600 hover:bg-[#f1f2f4]"
                    onClick={commingSoon}
                  >
                    <FontAwesomeIcon icon={faSignOut} width={20} />
                    Rời nhóm
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show member group panel */}
          {showContextMenu === "Thành viên" && (
            <div className="h-[calc(100vh_-_68px)] w-full overflow-hidden bg-white pt-4">
              <div className="mx-4">
                <button className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm hover:bg-[#e0dde0]">
                  <FontAwesomeIcon icon={faUsers} width={20} />
                  Thêm thành viên
                </button>
              </div>
              <span className="mb-3 mt-4 block px-4 text-sm">
                Danh sách thành viên ({dataUser.members?.length || 0})
              </span>
              {dataUser.members?.map((member) => (
                <button
                  key={member._id}
                  title={member.name}
                  className="flex h-16 w-full items-center px-4 hover:bg-[#ebe7eb]"
                >
                  <img src={member.profilePic} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex flex-col items-start pl-3">
                    {member._id === user._id ? (
                      <span className="text-[15px] text-pink-600">Bạn</span>
                    ) : (
                      <p className="text-[15px]">{member.name}</p>
                    )}
                    {dataUser.groupAdmin._id === member._id && (
                      <span className="text-xs text-blue-500">Quản trị viên</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Show 2 tab : Show all Ảnh/Video && Show all File*/}
          {showContextMenu === "Kho lưu trữ" && (
            <div className="h-[calc(100vh_-_68px)] w-full overflow-hidden bg-white">
              <div className="flex w-full items-center justify-between px-4">
                <button
                  className={`flex h-11 flex-1 items-center justify-center gap-x-1 border-b-2 ${activeTab === "Anh/Video" && "border-[#005ae0] text-[#005ae0]"} text-[15px] font-bold`}
                  onClick={() => setActiveTab("Anh/Video")}
                >
                  Ảnh/video
                </button>
                <button
                  className={`flex h-11 flex-1 items-center justify-center gap-x-1 border-b-2 ${activeTab === "Files" && "border-[#005ae0] text-[#005ae0]"} text-[15px] font-bold`}
                  onClick={() => setActiveTab("Files")}
                >
                  Files
                </button>
                <button
                  className={`flex h-11 flex-1 items-center justify-center gap-x-1 border-b-2 ${activeTab === "Link" && "border-[#005ae0] text-[#005ae0]"} text-[15px] font-bold`}
                  onClick={() => setActiveTab("Link")}
                >
                  Link
                </button>
              </div>

              {/* Show context Anh/Video follow activetab */}
              {activeTab === "Anh/Video" && (
                <div className="grid grid-cols-4 gap-2 px-4">
                  {allMessages
                    .filter((message) => message.imageUrl || message.fileUrl)
                    .map(
                      (message) =>
                        !(message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")) && (
                          <button key={message._id} className="h-[72px] overflow-hidden hover:opacity-80">
                            {message.imageUrl && (
                              <img src={message.imageUrl} alt="image" className="rounded-[3px] object-contain" />
                            )}
                            {message.fileUrl &&
                              (message.fileUrl.endsWith(".mp4") ||
                              message.fileUrl.endsWith(".webm") ||
                              message.fileUrl.endsWith(".ogg") ? (
                                <video controls className="rounded-[3px] object-contain">
                                  <source src={message.fileUrl} type="video/mp4" />
                                  Your browser does not support the video tag.
                                </video>
                              ) : (
                                <></>
                              ))}
                          </button>
                        ),
                    )}
                </div>
              )}

              {/* Show context Files follow activetab */}
              {activeTab === "Files" && (
                <div className="flex flex-col">
                  {allMessages
                    .filter((message) => message.fileUrl)
                    .map(
                      (message) =>
                        (message.fileUrl.endsWith(".docx") || message.fileUrl.endsWith(".pdf")) && (
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            key={message._id}
                            className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
                          >
                            <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />

                            <div className="flex flex-1 flex-col items-start pl-3">
                              <span className="break-words text-sm">{message.fileName}</span>
                              <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
                                {/* Number kb */}
                                {/* {Math.round(message.fileSize / 1024)} KB */}
                                <span>100.00 KB</span>
                                <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
                              </div>
                            </div>
                          </a>
                        ),
                    )}
                </div>
              )}

              {/* Show context Link follow activetab */}
              {activeTab === "Link" && (
                <div className="flex flex-col">
                  {allMessages
                    .filter((message) => message.text.startsWith("https"))
                    .map((message) => (
                      <a
                        href={message.text}
                        target="_blank"
                        rel="noreferrer"
                        key={message._id}
                        className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
                      >
                        <FontAwesomeIcon icon={faLink} width={20} className="text-[#ccc]" />

                        <div className="flex flex-1 flex-col items-start pl-3">
                          <span className="break-words text-sm">{message.text}</span>
                          <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
                            {/* slice https:// , result: facebook.com */}
                            <span className="font-medium text-blue-500">{message.text.slice(8)}</span>
                            <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
