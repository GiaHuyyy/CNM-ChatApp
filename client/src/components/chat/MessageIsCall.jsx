import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import ReactionDisplay from "../ReactionDisplay";
import { faThumbsUp } from "@fortawesome/free-regular-svg-icons";
import EmojiPicker from "emoji-picker-react";

export default function MessageIsCall({
  message,
  isCurrentUser,
  sender,
  dataUser,
  user,
  setHoveredMessage,
  setHoveredLikeMessage,
  getCallIcon,
  getCallStatusText,
  handleQuickLike,
  hoveredLikeMessage,
  handleAddReaction,
}) {
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
              className={`${message.callData?.callStatus === "missed" ? "text-red-500" : "text-blue-500"}`}
            />
          </div>
          <div>
            <p className="text-sm">{getCallStatusText(message)}</p>
            <p className="text-[11px] text-gray-500">{format(new Date(message.createdAt), "HH:mm")}</p>
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
}
