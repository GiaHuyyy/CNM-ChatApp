import { useRef } from "react";
import Button from "./Button";
import {
  faAddressCard,
  faFaceLaughSquint,
  faFaceSmile,
  faFolderClosed,
  faImage,
  faPaperPlane,
  faThumbsUp,
} from "@fortawesome/free-regular-svg-icons";
import commingSoon from "../../helpers/commingSoon";
import { faBolt, faCamera, faEllipsis, faFilePen, faReply, faXmark } from "@fortawesome/free-solid-svg-icons";
import EmojiPicker from "emoji-picker-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect } from "react";
import { useState } from "react";

export default function Footer({
  setMessages,
  messages,
  setReplyingTo,
  replyingTo,
  setEditingMessage,
  editingMessage,
  user,
  dataUser,
  handleSendMessage,
  handleSendEmojiLike,
  handleUploadFile,
  isCurrentUserMuted,
  setSeenMessage,
  selectedFiles,
  getSenderInfo,
  setSelectedFiles, // Add this prop for handling file uploads
}) {
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [openEmoji, setOpenEmoji] = useState(false);

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

  // Handle paste event to detect images
  const handlePaste = (e) => {
    if (isCurrentUserMuted()) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter((item) => item.type.indexOf("image") !== -1);

    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images

      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (file) {
          // Generate a more descriptive name than "image.png"
          const fileName = `pasted_image_${new Date().getTime()}.png`;
          const renamedFile = new File([file], fileName, { type: file.type });

          setSelectedFiles((prev) => [...prev, renamedFile]);
        }
      });
    }
  };

  //   Handle
  const handleInputFocus = () => {
    setSeenMessage(true);
  };

  return (
    <footer className="relative">
      <div className="flex h-10 items-center gap-x-3 border-b border-t border-[#c8c9cc] px-2">
        <Button
          title="Gửi Sticker"
          icon={faFaceLaughSquint}
          width={20}
          handleOnClick={() => setOpenEmoji(true)}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Gửi hình ảnh"
          icon={faImage}
          width={20}
          isUpload
          id="image"
          handleOnClick={handleUploadFile}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Gửi kèm File"
          icon={faFolderClosed}
          width={20}
          isUpload
          id="file"
          handleOnClick={handleUploadFile}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Gửi danh thiếp"
          icon={faAddressCard}
          width={20}
          handleOnClick={commingSoon}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Chụp kèm với cửa sổ Z"
          icon={faCamera}
          width={20}
          handleOnClick={commingSoon}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Định dạng tin nhắn"
          icon={faFilePen}
          width={20}
          handleOnClick={commingSoon}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Chèn tin nhắn nhanh"
          icon={faBolt}
          width={20}
          handleOnClick={commingSoon}
          disabled={isCurrentUserMuted()}
        />
        <Button
          title="Tùy chọn thêm"
          icon={faEllipsis}
          width={20}
          handleOnClick={commingSoon}
          disabled={isCurrentUserMuted()}
        />
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
        accept="image/*,video/*"
        hidden
        onChange={handleUploadFile}
        ref={imageInputRef}
        multiple
        disabled={isCurrentUserMuted()}
      />
      <input
        type="file"
        name="file"
        id="file"
        hidden
        onChange={handleUploadFile}
        ref={fileInputRef}
        multiple
        disabled={isCurrentUserMuted()}
      />
      {replyingTo && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between border-t border-gray-200 bg-blue-50 px-3 py-2">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faReply} className="mr-2 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">
                Đang trả lời{" "}
                <span className="text-blue-600">
                  {replyingTo.msgByUserId === user._id ? "chính bạn" : getSenderInfo(replyingTo.msgByUserId)?.name}
                </span>
              </span>
              <p className="line-clamp-1 text-xs text-gray-500">
                {replyingTo.text || (replyingTo.imageUrl ? "Hình ảnh" : "File đính kèm")}
              </p>
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="rounded p-1 text-gray-500 hover:bg-gray-200">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}
      {editingMessage && (
        <div className="absolute -top-9 left-0 right-0 flex items-center justify-between bg-blue-50 px-3 py-2 text-sm">
          <span>Chỉnh sửa tin nhắn</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setMessages({ text: "" });
            }}
            className="text-red-500 hover:text-red-700"
          >
            Hủy
          </button>
        </div>
      )}
      {isCurrentUserMuted() ? (
        <div className="flex h-[50px] items-center justify-center bg-gray-100 px-3 py-[10px]">
          <p className="text-gray-500">Bạn đã bị tắt quyền nhắn tin trong nhóm này</p>
        </div>
      ) : (
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
            disabled={isCurrentUserMuted()}
            onPaste={handlePaste} // Add paste handler here
          />
          <div className="flex items-center gap-x-1">
            <Button
              title="Biểu cảm"
              icon={faFaceSmile}
              width={20}
              handleOnClick={() => setOpenEmoji(true)}
              styleIcon={isCurrentUserMuted() ? "text-gray-400" : ""}
              disabled={isCurrentUserMuted()}
            />
            {messages.text === "" && (!selectedFiles || selectedFiles.length === 0) ? (
              <Button
                title="Gửi nhanh biểu tưởng cảm xúc"
                icon={faThumbsUp}
                width={20}
                handleOnClick={handleSendEmojiLike}
                styleIcon={isCurrentUserMuted() ? "text-gray-400" : ""}
                disabled={isCurrentUserMuted()}
              />
            ) : (
              <Button
                title="Gửi tin nhắn"
                icon={faPaperPlane}
                width={20}
                styleIcon={isCurrentUserMuted() ? "text-gray-400" : "text-[#005ae0]"}
                handleOnClick={handleSendMessage}
                disabled={isCurrentUserMuted()}
              />
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
