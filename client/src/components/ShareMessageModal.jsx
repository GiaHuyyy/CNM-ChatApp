import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMagnifyingGlass, faCheck, faUsers } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import { toast } from "sonner";

export default function ShareMessageModal({ isOpen, onClose, message }) {
  const { socketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const modalRef = useRef(null);

  // Close the modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Load conversations for sharing
  useEffect(() => {
    const fetchConversations = async () => {
      if (!socketConnection) return;

      // Use the socket to get conversations
      socketConnection.emit("sidebar", user?._id);

      socketConnection.once("conversation", (data) => {
        if (data && Array.isArray(data)) {
          // Filter out conversations that don't have userDetails
          const validConversations = data.filter(
            (conv) => conv && conv.userDetails && typeof conv.userDetails === "object",
          );
          setConversations(validConversations);
          setFilteredConversations(validConversations);
        }
      });
    };

    if (isOpen) {
      fetchConversations();
    }
  }, [socketConnection, user?._id, isOpen]);

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter((conv) => {
      // Make sure conv.userDetails exists and has a name property
      if (!conv?.userDetails?.name) return false;

      return conv.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleShareMessage = () => {
    if (!selectedConversation || !socketConnection) {
      toast.error("Vui lòng chọn cuộc trò chuyện");
      return;
    }

    setIsSharing(true);

    try {
      // Create the shared content object with original message data
      const sharedContent = {
        originalText: message.text || "",
        originalSender: message.msgByUserId === user._id ? "Bạn" : "Người dùng khác",
        originalImage: message.imageUrl || "",
        originalFile: message.fileUrl || "",
        originalFileName: message.fileName || "",
      };

      // Use original text as default or custom message if provided
      const shareText = customMessage || message.text || "";

      // Create message data based on conversation type (group or direct)
      const messageData = selectedConversation.isGroup
        ? {
            conversationId: selectedConversation.userDetails._id,
            text: shareText,
            msgByUserId: user?._id,
            sharedContent: sharedContent,
          }
        : {
            sender: user._id,
            receiver: selectedConversation.userDetails._id,
            text: shareText,
            msgByUserId: user?._id,
            sharedContent: sharedContent,
          };

      // Include media if present in original message
      if (message.imageUrl) messageData.imageUrl = message.imageUrl;
      if (message.fileUrl) messageData.fileUrl = message.fileUrl;
      if (message.fileName) messageData.fileName = message.fileName;

      // Send message using appropriate event
      const eventName = selectedConversation.isGroup ? "newGroupMessage" : "newMessage";
      socketConnection.emit(eventName, messageData);

      // Show success message and close modal (without waiting for response)
      toast.success("Tin nhắn đã được chia sẻ thành công");
      setIsSharing(false);
      onClose();
    } catch (error) {
      console.error("Error sharing message:", error);
      toast.error("Có lỗi xảy ra khi chia sẻ tin nhắn");
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={modalRef} className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Chia sẻ tin nhắn</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} width={18} className="text-gray-500" />
          </button>
        </div>

        {/* Message preview */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-500">Chia sẻ tin nhắn:</p>
          <div className="mt-2 rounded border border-gray-200 bg-white p-3">
            {message.text && <p className="mb-2 text-sm">{message.text}</p>}
            {message.imageUrl && (
              <img src={message.imageUrl} alt="Shared content" className="h-32 w-auto object-cover" />
            )}
            {message.fileUrl && !message.imageUrl && (
              <p className="text-sm text-blue-500">{message.fileName || "Attached file"}</p>
            )}
          </div>
        </div>

        {/* Add custom text */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Thêm tin nhắn (tùy chọn)</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nhập tin nhắn của bạn..."
            rows={2}
          />
        </div>

        {/* Search box */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Chia sẻ đến</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FontAwesomeIcon icon={faMagnifyingGlass} width={15} className="text-gray-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Tìm cuộc trò chuyện..."
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="mb-4 max-h-60 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">Không tìm thấy cuộc trò chuyện</p>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => {
                // Add null checks for userDetails
                if (!conv?.userDetails) return null;

                // Create a fallback profile picture
                const profilePic =
                  conv.userDetails.profilePic ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.userDetails.name || "Chat")}&background=random`;

                return (
                  <div
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`flex cursor-pointer items-center rounded-md p-2 ${
                      selectedConversation?._id === conv._id ? "bg-blue-50" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={profilePic}
                        alt={conv.userDetails.name || "Conversation"}
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            conv.userDetails.name || "Chat",
                          )}&background=random`;
                        }}
                      />
                      {conv.isGroup && (
                        <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#005ae0]">
                          <FontAwesomeIcon icon={faUsers} width={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium">{conv.userDetails.name || "Untitled Chat"}</p>
                      <p className="text-xs text-gray-500">
                        {conv.isGroup ? `${conv.members?.length || 0} thành viên` : ""}
                      </p>
                    </div>
                    {selectedConversation?._id === conv._id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                        <FontAwesomeIcon icon={faCheck} width={10} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Share button */}
        <button
          disabled={!selectedConversation || isSharing}
          onClick={handleShareMessage}
          className={`w-full rounded-md bg-blue-600 py-2 text-white ${
            !selectedConversation || isSharing ? "cursor-not-allowed opacity-50" : "hover:bg-blue-700"
          }`}
        >
          {isSharing ? "Đang chia sẻ..." : "Chia sẻ"}
        </button>
      </div>
    </div>
  );
}

ShareMessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.object.isRequired,
};
