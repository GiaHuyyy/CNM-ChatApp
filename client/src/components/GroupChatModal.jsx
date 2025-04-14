import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // Add this import
import axios from "axios";
import { toast } from "sonner";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";

export default function GroupChatModal({ isOpen, onClose, onGroupCreated }) {
  const { socketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);
  const navigate = useNavigate(); // Add this line to get navigate function

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef(null);

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

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsLoading(true);
        const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/search-friend-user`;
        const response = await axios.post(URL, { search: searchQuery }, { withCredentials: true });
        setSearchResults(response.data.data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUserSelection = (selectedUser) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === selectedUser._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== selectedUser._id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };

  // Create group chat
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length < 2) {
      toast.error("Vui lòng chọn ít nhất 2 người dùng");
      return;
    }

    try {
      setIsLoading(true);

      // Add current user to members if not already included
      const members = [...selectedUsers, user].filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i);

      // Create a new group conversation via socket
      socketConnection.emit("createGroupChat", {
        name: groupName,
        members: members.map((member) => member._id),
        creator: user._id,
      });

      // Listen for group creation confirmation
      socketConnection.once("groupCreated", (response) => {
        if (response.success) {
          toast.success("Nhóm chat đã được tạo");
          setSelectedUsers([]);
          setGroupName("");
          onClose();

          // Update to use navigate instead of window.location
          if (response.conversationId) {
            // If onGroupCreated callback exists, call it
            if (onGroupCreated) onGroupCreated(response.conversationId);

            // Use React Router's navigate with new path prefix
            navigate(`/chat/${response.conversationId}`);
          }
        } else {
          toast.error(response.message || "Không thể tạo nhóm chat");
        }
        setIsLoading(false);
      });
    } catch (error) {
      toast.error("Lỗi khi tạo nhóm chat");
      console.error(error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={modalRef} className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Tạo nhóm chat mới</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} width={18} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group name input */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên nhóm</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nhập tên nhóm chat"
            />
          </div>

          {/* User search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Thêm thành viên</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Tìm kiếm người dùng theo tên hoặc số điện thoại"
            />
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Đã chọn ({selectedUsers.length})</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div key={user._id} className="flex items-center rounded-full bg-blue-100 px-2 py-1">
                    <img src={user.profilePic} alt={user.name} className="h-5 w-5 rounded-full object-cover" />
                    <span className="ml-2 text-sm">{user.name}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <FontAwesomeIcon icon={faXmark} width={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              <label className="mb-1 block text-sm font-medium text-gray-700">Kết quả tìm kiếm</label>
              <div className="mt-1 space-y-2">
                {searchResults.map((searchUser) => {
                  // Don't show current user in search results
                  if (searchUser._id === user._id) return null;

                  const isSelected = selectedUsers.some((u) => u._id === searchUser._id);
                  return (
                    <div
                      key={searchUser._id}
                      onClick={() => toggleUserSelection(searchUser)}
                      className={`flex cursor-pointer items-center rounded-md p-2 ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-100"
                      }`}
                    >
                      <img
                        src={searchUser.profilePic}
                        alt={searchUser.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium">{searchUser.name}</p>
                        <p className="text-xs text-gray-500">{searchUser.phone}</p>
                      </div>
                      {isSelected ? (
                        <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                          <span className="text-xs text-white">✓</span>
                        </div>
                      ) : (
                        <div className="ml-auto text-blue-500">
                          <FontAwesomeIcon icon={faPlus} width={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create button */}
          <div className="mt-6">
            <button
              disabled={isLoading || selectedUsers.length < 2 || !groupName.trim()}
              onClick={handleCreateGroup}
              className={`w-full rounded-md bg-blue-600 py-2 text-white ${
                isLoading || selectedUsers.length < 2 || !groupName.trim()
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Đang tạo..." : "Tạo nhóm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

GroupChatModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onGroupCreated: PropTypes.func,
};
