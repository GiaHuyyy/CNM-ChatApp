import { faChevronDown, faChevronUp, faFilePen, faImage, faThumbTack, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

export default function PinnedMessagesHeader({ 
  pinnedMessages, 
  onNavigateToMessage,
  onUnpinMessage, 
  currentUserId,
  getSenderInfo,
  allMessages
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [validPinnedMessages, setValidPinnedMessages] = useState([]);
  const processedRef = useRef(new Set()); // Track already processed messages
  
  // Process pinned messages data only when necessary
  useEffect(() => {
    if (!pinnedMessages?.length || !allMessages?.length) {
      setValidPinnedMessages([]);
      return;
    }
    
    // Check if we already processed these exact pinnedMessages
    const pinnedIds = pinnedMessages.map(p => 
      typeof p === 'object' ? p._id?.toString() : p?.toString()
    ).filter(Boolean).sort().join(',');
    
    // Process messages only once for the same set of IDs
    if (processedRef.current.has(pinnedIds) && validPinnedMessages.length > 0) {
      return;
    }
    
    // Process pinned messages - avoid excessive logging
    const processedMessages = pinnedMessages
      .map(pinnedItem => {
        // Handle if already a complete object
        if (typeof pinnedItem === 'object' && pinnedItem?.text) {
          return pinnedItem;
        }
        
        // Handle if just an ID
        const pinnedId = typeof pinnedItem === 'object' ? 
          pinnedItem?._id?.toString() : pinnedItem?.toString();
        
        if (!pinnedId) return null;
        
        // Find full message in allMessages
        return allMessages.find(msg => msg._id?.toString() === pinnedId);
      })
      .filter(Boolean); // Remove any nulls
    
    if (processedMessages.length > 0) {
      setValidPinnedMessages(processedMessages);
      processedRef.current.add(pinnedIds);
    }
  }, [pinnedMessages, allMessages, validPinnedMessages.length]);

  if (!validPinnedMessages.length) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
      <div 
        className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faThumbTack} className="text-blue-500" />
          <span className="font-medium text-blue-700">
            {validPinnedMessages.length} tin nhắn đã ghim
          </span>
        </div>
        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-gray-500" />
      </div>

      {isExpanded && (
        <div className="max-h-60 overflow-y-auto bg-white px-4 pb-2">
          {validPinnedMessages.map(message => {
            // Get sender information
            let senderName = "Unknown";
            let senderPic = "";
            
            try {
              if (message.msgByUserId) {
                if (typeof message.msgByUserId === 'object') {
                  senderName = message.msgByUserId._id?.toString() === currentUserId ? "Bạn" : message.msgByUserId.name;
                  senderPic = message.msgByUserId.profilePic;
                } else {
                  const sender = getSenderInfo(message.msgByUserId);
                  senderName = message.msgByUserId?.toString() === currentUserId ? "Bạn" : sender.name;
                  senderPic = sender.profilePic;
                }
              }
            } catch (error) {
              // Silently handle error
            }
            
            // Generate message preview
            let messagePreview = message.text || "Tin nhắn đã ghim";
            let messageIcon = null;
            
            if (message.files?.length) {
              if (message.files.some(f => f.type?.startsWith("image/"))) {
                messageIcon = <FontAwesomeIcon icon={faImage} className="mr-1 text-blue-400" />;
                messagePreview = "Hình ảnh";
              } else if (message.files.some(f => !f.type?.startsWith("image/") && !f.type?.startsWith("video/"))) {
                messageIcon = <FontAwesomeIcon icon={faFilePen} className="mr-1 text-blue-400" />;
                messagePreview = "Tệp đính kèm";
              }
            }
            
            return (
              <div 
                key={message._id}
                className="group mb-2 flex items-start justify-between rounded-md border border-gray-100 bg-gray-50 p-2 hover:bg-gray-100"
              >
                <div 
                  className="flex flex-1 cursor-pointer"
                  onClick={() => onNavigateToMessage(message._id)}
                >
                  <div className="mr-2 flex-shrink-0">
                    <img 
                      src={senderPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`}
                      alt="avatar" 
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium">
                      {senderName}
                    </div>
                    <div className="flex items-center max-w-sm truncate text-sm text-gray-600">
                      {messageIcon}
                      {messagePreview}
                    </div>
                  </div>
                </div>
                <button 
                  className="ml-2 hidden rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 group-hover:block"
                  onClick={() => onUnpinMessage(message, "unpin")}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            );
          })}
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
  getSenderInfo: PropTypes.func.isRequired,
  allMessages: PropTypes.array.isRequired // Add prop validation for allMessages
};
