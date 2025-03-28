import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";

export default function AddGroupMemberModal({ isOpen, onClose, groupId, existingMembers }) {
  const { socketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);

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

        // Filter out users who are already members of the group
        const existingMemberIds = existingMembers.map((member) => member._id);
        const filteredResults = response.data.data.filter((user) => !existingMemberIds.includes(user._id));

        setSearchResults(filteredResults || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, existingMembers]);

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

  // Add members to group
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 người dùng");
      return;
    }

    try {
      setIsLoading(true);

      // Add members to group via socket
      socketConnection.emit("addMembersToGroup", {
        groupId,
        newMembers: selectedUsers.map((member) => member._id),
        addedBy: user._id,
      });

      // Listen for confirmation
      socketConnection.once("membersAddedToGroup", (response) => {
        if (response.success) {
          toast.success(response.message || "Đã thêm thành viên vào nhóm");
          setSelectedUsers([]);
          onClose();
        } else {
          toast.error(response.message || "Không thể thêm thành viên vào nhóm");
        }
        setIsLoading(false);
      });
    } catch (error) {
      toast.error("Lỗi khi thêm thành viên");
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
          <h3 className="text-lg font-medium">Thêm thành viên vào nhóm</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} width={18} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* User search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tìm kiếm người dùng</label>
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
          {searchResults.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              <label className="mb-1 block text-sm font-medium text-gray-700">Kết quả tìm kiếm</label>
              <div className="mt-1 space-y-2">
                {searchResults.map((searchUser) => {
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
          ) : searchQuery.trim() && !isLoading ? (
            <div className="text-center text-sm text-gray-500">
              Không tìm thấy người dùng phù hợp hoặc tất cả người dùng đã trong nhóm
            </div>
          ) : null}

          {/* Add button */}
          <div className="mt-6">
            <button
              disabled={isLoading || selectedUsers.length === 0}
              onClick={handleAddMembers}
              className={`w-full rounded-md bg-blue-600 py-2 text-white ${
                isLoading || selectedUsers.length === 0 ? "cursor-not-allowed opacity-50" : "hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Đang thêm..." : "Thêm vào nhóm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

AddGroupMemberModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  groupId: PropTypes.string.isRequired,
  existingMembers: PropTypes.array.isRequired,
};
