import { faEllipsisVertical, faMessage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { socketManager } from "../socket/socketConfig";

export default function ListFriend() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingFriend, setRemovingFriend] = useState(null);
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user);

  useEffect(() => {
    fetchFriends();
    
    // Thiết lập lắng nghe sự kiện socket
    const socket = socketManager.connect();
    
    // Khi có người chấp nhận lời mời kết bạn của bạn
    socket.on("friendRequestAccepted", (data) => {
      if (data.receiver) {
        fetchFriends(); // Làm mới danh sách bạn bè
      }
    });
    
    // Khi bị xóa khỏi danh sách bạn bè
    socket.on("friendRemoved", (data) => {
      const { friendId } = data;
      if (friendId) {
        setFriends(prev => prev.filter(friend => 
          friend.friendInfo._id !== friendId
        ));
        toast.info("Bạn đã bị xóa khỏi danh sách bạn bè");
      }
    });
    
    return () => {
      socket.off("friendRequestAccepted");
      socket.off("friendRemoved");
    };
  }, [currentUser._id]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // Sử dụng socket để lấy danh sách bạn bè
      const socket = socketManager.connect();
      
      // Emit sự kiện yêu cầu danh sách bạn bè
      socket.emit("getFriendsList");
      
      // Lắng nghe phản hồi
      socket.once("friendsList", (response) => {
        if (response.success) {
          // Xử lý dữ liệu trả về, tương tự như API trước đó
          const processedFriends = response.data.map(friend => {
            if (friend.sender._id === currentUser._id) {
              return {
                ...friend,
                friendInfo: friend.receiver
              };
            }
            return {
              ...friend,
              friendInfo: friend.sender
            };
          });
          
          setFriends(processedFriends);
        } else {
          toast.error("Không thể tải danh sách bạn bè");
        }
        setLoading(false);
      });
    } catch (error) {
      toast.error("Có lỗi xảy ra");
      setLoading(false);
    }
  };

  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveFriend = async (friendId) => {
    try {
      setRemovingFriend(friendId);
      
      // Sử dụng socket để xóa bạn bè
      const socket = socketManager.connect();
      socket.emit("removeFriend", { friendId });
      
      socket.once("friendRemoved", (response) => {
        if (response.success) {
          setFriends(friends.filter(friend => friend.friendInfo._id !== friendId));
          toast.success(response.message || "Đã xóa khỏi danh sách bạn bè");
        } else {
          toast.error(response.message || "Không thể xóa bạn bè");
        }
        setShowDropdown(null);
        setRemovingFriend(null);
      });
    } catch (error) {
      toast.error("Có lỗi xảy ra");
      setRemovingFriend(null);
    }
  };
  
  const handleStartChat = (userId) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <div className="h-full p-4">
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
        </div>
      ) : friends.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">Chưa có bạn bè</p>
        </div>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <div key={friend._id} className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <img
                  src={friend.friendInfo.profilePic}
                  alt="avatar"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{friend.friendInfo.name}</p>
                  <p className="text-sm text-gray-500">{friend.friendInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStartChat(friend.friendInfo._id)}
                  className="rounded-full p-2 hover:bg-blue-100 text-blue-500"
                  title="Nhắn tin"
                >
                  <FontAwesomeIcon icon={faMessage} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(friend.friendInfo._id)}
                    className="rounded-full p-2 hover:bg-gray-200"
                    disabled={removingFriend === friend.friendInfo._id}
                  >
                    {removingFriend === friend.friendInfo._id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></span>
                    ) : (
                      <FontAwesomeIcon icon={faEllipsisVertical} />
                    )}
                  </button>
                  {showDropdown === friend.friendInfo._id && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
                    >
                      <button
                        onClick={() => handleRemoveFriend(friend.friendInfo._id)}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                      >
                        Xóa bạn
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
