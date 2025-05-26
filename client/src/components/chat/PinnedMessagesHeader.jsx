import { faChevronDown, faChevronUp, faThumbTack, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

export default function PinnedMessagesHeader({ 
  pinnedMessages, 
  onNavigateToMessage,
  onUnpinMessage, 
  currentUserId,
  getSenderInfo 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedMessageIds, setExpandedMessageIds] = useState({});

  // Reset expanded state when pinnedMessages changes
  useEffect(() => {
    // Default: show all pinned messages in collapsed form
    const initialExpandState = {};
    pinnedMessages.forEach(msg => {
      initialExpandState[msg._id] = false;
    });
    setExpandedMessageIds(initialExpandState);
  }, [pinnedMessages]);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const toggleMessageExpand = (messageId, e) => {
    e.stopPropagation(); // Prevent triggering parent click
    setExpandedMessageIds(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
      <div 
        className="flex cursor-pointer items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faThumbTack} className="text-blue-500" />
          <span className="font-medium text-blue-700">
            {pinnedMessages.length} tin nhắn đã ghim
          </span>
        </div>
        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-gray-500" />
      </div>

      {isExpanded && (
        <div className="max-h-[200px] overflow-y-auto bg-white px-2 py-1">
          {pinnedMessages.map(message => (
            <div 
              key={message._id}
              className="group mb-1 flex flex-col rounded-md border border-gray-100 bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex items-start justify-between p-2">
                <div 
                  className="flex flex-1 cursor-pointer"
                  onClick={() => onNavigateToMessage(message._id)}
                >
                  <div className="mr-2 flex-shrink-0">
                    {message.msgByUserId && (
                      <img 
                        src={typeof message.msgByUserId === 'object' ? 
                          message.msgByUserId.profilePic : 
                          getSenderInfo(message.msgByUserId).profilePic} 
                        alt="avatar" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium">
                      {typeof message.msgByUserId === 'object' ? 
                        (message.msgByUserId._id === currentUserId ? 'Bạn' : message.msgByUserId.name) : 
                        (message.msgByUserId === currentUserId ? 'Bạn' : getSenderInfo(message.msgByUserId).name)}
                    </div>
                    <div className={`${expandedMessageIds[message._id] ? '' : 'line-clamp-1'} text-sm text-gray-600`}>
                      {message.text}
                    </div>
                    
                    {/* Hiển thị files nếu có (ảnh/video/tập tin) */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-1 text-xs text-blue-500">
                        {message.files.some(f => f.type?.startsWith("image/")) && '📷 '}
                        {message.files.some(f => f.type?.startsWith("video/")) && '🎥 '}
                        {message.files.some(f => !f.type?.startsWith("image/") && !f.type?.startsWith("video/")) && '📎 '}
                        {message.files.length} tệp đính kèm
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {/* Phóng to/thu nhỏ nội dung */}
                  {message.text && message.text.length > 50 && (
                    <button 
                      onClick={(e) => toggleMessageExpand(message._id, e)}
                      className="mr-1 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-500"
                    >
                      <FontAwesomeIcon icon={expandedMessageIds[message._id] ? faChevronUp : faChevronDown} />
                    </button>
                  )}
                  {/* Nút bỏ ghim */}
                  <button 
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinMessage(message, "unpin");
                    }}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
              
              {/* Hiển thị media nếu có */}
              {expandedMessageIds[message._id] && message.files && message.files.length > 0 && message.files.some(f => f.type?.startsWith("image/")) && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-1">
                    {message.files
                      .filter(f => f.type?.startsWith("image/"))
                      .slice(0, 2) // Giới hạn hiển thị 2 ảnh
                      .map((file, idx) => (
                        <img 
                          key={idx}
                          src={file.url} 
                          alt="attachment" 
                          className="h-16 w-16 rounded object-cover"
                          onClick={() => onNavigateToMessage(message._id)}
                        />
                      ))}
                    {message.files.filter(f => f.type?.startsWith("image/")).length > 2 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100 text-gray-500">
                        +{message.files.filter(f => f.type?.startsWith("image/")).length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

PinnedMessagesHeader.propTypes = {
  pinnedMessages: PropTypes.array.isRequired,
  onNavigateToMessage: PropTypes.func.isRequired,
  onUnpinMessage: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
  getSenderInfo: PropTypes.func.isRequired
};
