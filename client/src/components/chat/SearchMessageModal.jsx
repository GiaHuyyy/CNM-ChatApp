import {
    faCalendarAlt,
    faChevronDown,
    faChevronUp,
    faMagnifyingGlass,
    faSpinner,
    faTimes
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

export default function SearchMessageModal({ 
  isOpen, 
  onClose, 
  messages, 
  onResultClick,
  currentUserId,
  getSenderInfo // Nhận prop getSenderInfo
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const selectedResultRef = useRef(null);
  
  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Perform search when query changes
  useEffect(() => {
    if (!searchQuery.trim() && !dateFilter) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Debounce search
    const timer = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      
      // Filter messages based on search query and date filter
      let filteredMessages = messages.filter(msg => !msg.isDeleted);
      
      // Apply text search if query exists
      if (query) {
        filteredMessages = filteredMessages.filter(msg => 
          msg.text && msg.text.toLowerCase().includes(query)
        );
      }
      
      // Apply date filter if selected
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredMessages = filteredMessages.filter(msg => {
          const msgDate = new Date(msg.createdAt);
          return msgDate.toDateString() === filterDate.toDateString();
        });
      }
      
      const results = filteredMessages.map(msg => {
        // Get message context (highlight matched text)
        const text = msg.text || "";
        let before = text;
        let match = "";
        let after = "";
        
        if (query) {
          const index = text.toLowerCase().indexOf(query);
          if (index >= 0) {
            before = text.substring(0, index);
            match = text.substring(index, index + query.length);
            after = text.substring(index + query.length);
          }
        }
        
        // Format timestamp
        const timestamp = new Date(msg.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
        
        // Determine if message is from current user
        const isFromCurrentUser = msg.msgByUserId === currentUserId;
        
        // Sử dụng getSenderInfo để lấy tên người gửi
        let senderName = "Người dùng khác";
        if (!isFromCurrentUser && getSenderInfo) {
          const senderInfo = getSenderInfo(msg.msgByUserId);
          senderName = senderInfo.name;
        }
        
        return {
          ...msg,
          formattedText: { before, match, after },
          timestamp,
          isFromCurrentUser,
          senderName
        };
      });
      
      setSearchResults(results);
      setSelectedResultIndex(results.length > 0 ? 0 : -1);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, dateFilter, messages, currentUserId, getSenderInfo]);
  
  // Scroll to selected result
  useEffect(() => {
    if (selectedResultRef.current && resultsContainerRef.current) {
      selectedResultRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedResultIndex]);

  // Xử lý khi người dùng nhấp vào kết quả tìm kiếm
  const handleResultClick = (messageId) => {
    if (onResultClick) {
      console.log("User clicked result with ID:", messageId);
      onResultClick(messageId);
      onClose();
    }
  };
  
  const navigateResult = (direction) => {
    if (direction === 'next' && selectedResultIndex < searchResults.length - 1) {
      setSelectedResultIndex(prev => prev + 1);
    } else if (direction === 'prev' && selectedResultIndex > 0) {
      setSelectedResultIndex(prev => prev - 1);
    }
  };
  
  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter(null);
    setSearchResults([]);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      handleResultClick(searchResults[selectedResultIndex]._id);
    } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
      setSelectedResultIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
      setSelectedResultIndex(prev => prev > 0 ? prev - 1 : prev);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed top-0 right-0 z-50 h-full w-[350px] bg-white border-l border-gray-200 shadow-lg flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Tìm kiếm tin nhắn</h3>
          <button 
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100"
            aria-label="Đóng"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="flex items-center rounded-lg bg-gray-100 px-3 py-2 mb-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-500 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập nội dung cần tìm..."
            className="flex-1 bg-transparent outline-none"
          />
          {isSearching && (
            <FontAwesomeIcon icon={faSpinner} className="text-gray-500 animate-spin" />
          )}
          {searchQuery && !isSearching && (
            <button onClick={() => setSearchQuery("")} aria-label="Xóa tìm kiếm">
              <FontAwesomeIcon icon={faTimes} className="text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Date filter */}
        <div className="flex items-center mb-2">
          <div className="flex items-center rounded-lg bg-gray-100 px-3 py-2 flex-1">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500 mr-2" />
            <input
              type="date"
              value={dateFilter || ""}
              onChange={e => setDateFilter(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              placeholder="Lọc theo ngày"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter(null)} aria-label="Xóa lọc ngày">
                <FontAwesomeIcon icon={faTimes} className="text-gray-500" />
              </button>
            )}
          </div>
          
          {(searchQuery || dateFilter) && (
            <button 
              onClick={clearFilters}
              className="ml-2 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>
      
      {/* Results navigation */}
      {searchResults.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <span className="text-sm text-gray-500">
            {selectedResultIndex + 1} / {searchResults.length} kết quả
          </span>
          <div className="flex items-center">
            <button 
              onClick={() => navigateResult('prev')}
              disabled={selectedResultIndex <= 0}
              className={`p-1.5 rounded-full ${selectedResultIndex <= 0 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
              aria-label="Kết quả trước"
            >
              <FontAwesomeIcon icon={faChevronUp} />
            </button>
            <button 
              onClick={() => navigateResult('next')}
              disabled={selectedResultIndex >= searchResults.length - 1}
              className={`p-1.5 rounded-full ${selectedResultIndex >= searchResults.length - 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
              aria-label="Kết quả tiếp theo"
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </button>
          </div>
        </div>
      )}
      
      {/* Results list */}
      <div 
        ref={resultsContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {isSearching ? (
              <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin mb-2" />
            ) : searchQuery || dateFilter ? (
              <>
                <p>Không tìm thấy kết quả nào</p>
                <p className="text-sm">Thử tìm kiếm với từ khóa khác</p>
              </>
            ) : (
              <p>Nhập từ khóa để tìm kiếm tin nhắn</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {searchResults.map((result, index) => (
              <div
                key={result._id}
                ref={index === selectedResultIndex ? selectedResultRef : null}
                onClick={() => handleResultClick(result._id)}
                className={`p-3 cursor-pointer hover:bg-gray-50 ${
                  index === selectedResultIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${result.isFromCurrentUser ? 'text-blue-600' : ''}`}>
                    {result.isFromCurrentUser ? 'Bạn' : result.senderName || "Người dùng khác"}
                  </span>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
                <p className="text-sm text-gray-800 break-words">
                  {result.formattedText.before}
                  <span className="bg-yellow-200 font-medium">{result.formattedText.match}</span>
                  {result.formattedText.after}
                </p>
                
                {/* Display message type indicators */}
                {(result.files && result.files.length > 0) && (
                  <div className="mt-1 text-xs text-blue-500">
                    {result.files.some(f => f.type?.startsWith('image/')) && '📷 '}
                    {result.files.some(f => f.type?.startsWith('video/')) && '🎥 '}
                    {result.files.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/')) && '📎 '}
                    {result.files.length > 1 ? `${result.files.length} tệp đính kèm` : 'Tệp đính kèm'}
                  </div>
                )}
                
                {/* Legacy file indicators */}
                {!result.files && result.imageUrl && <div className="mt-1 text-xs text-blue-500">📷 Hình ảnh</div>}
                {!result.files && result.fileUrl && <div className="mt-1 text-xs text-blue-500">📎 Tệp đính kèm</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

SearchMessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  messages: PropTypes.array.isRequired,
  onResultClick: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
  getSenderInfo: PropTypes.func // Thêm prop type cho getSenderInfo
};
