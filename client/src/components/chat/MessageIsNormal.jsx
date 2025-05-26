import {
  faArrowRotateRight,
  faEllipsis,
  faFilePen,
  faQuoteRight,
  faReply,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import ReactionDisplay from "../ReactionDisplay";
import { faThumbsUp } from "@fortawesome/free-regular-svg-icons";
import EmojiPicker from "emoji-picker-react";

const MessageIsNormal = ({
  message,
  isCurrentUser,
  sender,
  dataUser,
  user,
  hoveredMessage,
  setHoveredMessage,
  setHoveredLikeMessage,
  handleQuickLike,
  hoveredLikeMessage,
  handleAddReaction,
  getSenderInfo,
  handleImageClick,
  handleShareMessage,
  handleReplyMessage,
  openActionMessage,
  setOpenActionMessage,
  handleEditMessage,
  handleDeleteMessage,
}) => {
  const scrollToMessage = (messageId) => {
    if (!messageId) return;

    const messageElement = document.getElementById(`message-${messageId}`);

    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      messageElement.classList.add("bg-blue-200");
      setTimeout(() => {
        messageElement.classList.remove("bg-blue-200");
      }, 1500);
    }
  };

  const isDeletedMessage = (message) => {
    return message.isDeleted;
  };

  const renderFiles = () => {
    if (!message.files || !Array.isArray(message.files) || message.files.length === 0) {
      // Handle legacy data structure (for backward compatibility)
      if (message.imageUrl) {
        // Migrate legacy imageUrl to files array format in the UI
        const imageFile = {
          url: message.imageUrl,
          type: "image/jpeg", // Assume JPEG for legacy
          name: "Image",
        };
        return renderMediaContent([imageFile]);
      }
      if (message.fileUrl) {
        // Migrate legacy fileUrl to files array format in the UI
        const documentFile = {
          url: message.fileUrl,
          type: "application/octet-stream", // Generic file type
          name: message.fileName || "File đính kèm",
        };
        return renderMediaContent([documentFile]);
      }
      return null;
    }

    return renderMediaContent(message.files);
  };

  const renderMediaContent = (files) => {
    const imageVideos = files.filter((f) => f.type?.startsWith("image/") || f.type?.startsWith("video/"));

    const documents = files.filter((f) => !f.type?.startsWith("image/") && !f.type?.startsWith("video/"));

    return (
      <div className="flex flex-col gap-2">
        {imageVideos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {imageVideos.map((file, index) => {
              if (file.type?.startsWith("image/")) {
                return (
                  <img
                    key={index}
                    src={file.url}
                    alt={file.name || `Image ${index}`}
                    className="cursor-pointer rounded object-contain"
                    style={{ maxHeight: imageVideos.length > 1 ? "170px" : "300px" }}
                    onClick={() => handleImageClick(file.url)}
                  />
                );
              } else {
                return (
                  <video
                    key={index}
                    controls
                    className="cursor-pointer rounded object-contain"
                    style={{ maxHeight: imageVideos.length > 1 ? "170px" : "300px" }}
                  >
                    <source src={file.url} type={file.type} />
                    Your browser does not support the video tag.
                  </video>
                );
              }
            })}
          </div>
        )}

        {documents.length > 0 && (
          <div className="flex flex-col gap-1">
            {documents.map((file, index) => (
              <div key={index} className="flex items-center gap-2 rounded bg-white p-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600"
                >
                  <FontAwesomeIcon icon={faFilePen} /> {file.name || `File ${index + 1}`}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id={`message-${message._id}`}
      key={message._id}
      className={`flex gap-x-2 ${isCurrentUser ? "justify-end" : "justify-start"} transition-colors duration-300`}
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
        {message.isShared && (
          <div className="mb-1 flex items-center text-xs italic text-gray-500">
            <FontAwesomeIcon icon={faReply} className="mr-1 h-3 w-3 -scale-x-100" />
            <span>Tin nhắn được chia sẻ</span>
          </div>
        )}
        {message.replyTo && (
          <div
            className="mb-2 cursor-pointer rounded border-l-4 border-blue-400 bg-gray-50 p-2 text-xs hover:bg-gray-100"
            onClick={() => scrollToMessage(message.replyTo.messageId)}
          >
            <div className="font-medium text-blue-600">
              {message.replyTo.sender === user._id
                ? "Bạn"
                : getSenderInfo(message.replyTo.sender)?.name || "Người dùng"}
            </div>
            <div className="truncate text-gray-600">{message.replyTo.text}</div>
          </div>
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
            {(message.files && message.files.length > 0) || message.imageUrl || message.fileUrl ? (
              <div className="mt-1">{renderFiles()}</div>
            ) : null}
            {message.text.startsWith("https") || message.text.startsWith("http") ? (
              <a href={message.text} target="_blank" rel="noreferrer" className="text-sm text-blue-500 underline">
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
          <div className={`absolute bottom-3 ${isCurrentUser ? "-left-20" : "-right-20"} flex items-center gap-x-1`}>
            <button
              title="Chia sẻ"
              className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
              onClick={() => handleShareMessage(message)}
            >
              <FontAwesomeIcon icon={faReply} width={10} className="text-[#5a5a5a] group-hover:text-[#005ae0]" />
            </button>
            <button
              title="Trả lời"
              className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
              onClick={() => handleReplyMessage(message)}
            >
              <FontAwesomeIcon icon={faQuoteRight} width={10} className="text-[#5a5a5a] group-hover:text-[#005ae0]" />
            </button>
            <button
              className="group flex items-center justify-center rounded-full bg-white px-[6px] py-[3px]"
              onMouseEnter={() => setOpenActionMessage(true)}
            >
              <FontAwesomeIcon icon={faEllipsis} width={10} className="text-[#5a5a5a] group-hover:text-[#005ae0]" />
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
                  <FontAwesomeIcon icon={faTrash} width={10} className="text-[#5a5a5a] group-hover:text-red-600" />
                  <span className="text-sm group-hover:text-red-600">Xóa tin nhắn</span>
                </button>
              </div>
            )}
          </div>
        )}
        {message.sharedContent && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
            <div className="rounded bg-white p-2">
              {message.sharedContent.originalImage && (
                <img
                  src={message.sharedContent.originalImage}
                  alt="Shared content"
                  className="mb-2 h-40 w-auto object-contain"
                  onClick={() => handleImageClick(message.sharedContent.originalImage)}
                />
              )}
              {message.sharedContent.originalFile && !message.sharedContent.originalImage && (
                <div className="mb-2 flex items-center text-blue-500">
                  <FontAwesomeIcon icon={faFilePen} className="mr-2" />
                  <span>{message.sharedContent.originalFileName}</span>
                </div>
              )}
              {message.sharedContent.originalText && (
                <p className="whitespace-pre-wrap break-words text-sm font-medium">
                  {message.sharedContent.originalText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageIsNormal;
