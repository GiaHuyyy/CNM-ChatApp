import { faBookmark } from "@fortawesome/free-regular-svg-icons";
import { faBars, faMagnifyingGlass, faPhone, faUsers, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useGlobalContext } from "../../context/GlobalProvider";
import AddFriend from "../AddFriend";
import Button from "./Button";
import SearchMessageModal from "./SearchMessageModal";

export default function Header({
  dataUser,
  isLoading,
  handleAudioCall,
  handleVideoCall,
  setShowRightSideBar,
  showRightSideBar,
  messages,
  onMessageFound,
  getSenderInfo // Nhận prop getSenderInfo
}) {
  const { socketConnection } = useGlobalContext();
  const [onlineMembers, setOnlineMembers] = useState(0);
  const [onlineUserList, setOnlineUserList] = useState([]);
  const [isFriend, setIsFriend] = useState(true);
  const currentUser = useSelector((state) => state.user);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Check if users are friends
  useEffect(() => {
    const checkFriendStatus = async () => {
      // Only check for non-group conversations and if we have valid user IDs
      if (dataUser?.isGroup || !dataUser?._id || !currentUser?._id) {
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_BACKEND_URL}/api/check-friend/${dataUser._id}`, {
          withCredentials: true,
        });

        // If request succeeded and status is "accepted", they are friends
        setIsFriend(response.data.success && response.data.data.status === "accepted");
      } catch (error) {
        console.error("Error checking friend status:", error);
        // Default to assuming not friends if check fails
        setIsFriend(false);
      }
    };

    checkFriendStatus();
  }, [dataUser?._id, dataUser?.isGroup, currentUser?._id]);

  // Handle avatar click to show AddFriend modal
  const handleAvatarClick = () => {
    // Only show AddFriend for 1-on-1 chats (not for groups)
    if (!dataUser.isGroup) {
      setShowAddFriend(true);
    }
  };

  // Calculate online members using memoized function to avoid unnecessary recalculations
  const calculateOnlineMembers = useCallback(() => {
    if (!dataUser?.isGroup || !dataUser?.members || !onlineUserList.length) {
      return 0;
    }

    try {
      // Count online members in this group
      return dataUser.members.filter((member) => {
        // Handle different member formats safely
        if (!member) return false;

        let memberId;
        if (typeof member === "object") {
          memberId = member._id ? member._id.toString() : member.toString();
        } else {
          memberId = member.toString();
        }

        return onlineUserList.includes(memberId);
      }).length;
    } catch (error) {
      console.error("Error calculating online members:", error);
      return 0;
    }
  }, [dataUser?.members, onlineUserList, dataUser?.isGroup]);

  // Track online users globally with a robust handler
  useEffect(() => {
    if (!socketConnection) return;

    const handleOnlineUsers = (onlineUserIds) => {
      // Debug: log any significant changes to online users
      const oldCount = onlineUserList.length;
      const newCount = onlineUserIds.length;

      if (Math.abs(oldCount - newCount) > 0) {
        console.log(`Online users changed from ${oldCount} to ${newCount}`);
      }

      setOnlineUserList(onlineUserIds);
    };

    socketConnection.on("onlineUser", handleOnlineUsers);

    // Request online users list when component mounts
    socketConnection.emit("getOnlineUsers");

    return () => {
      socketConnection.off("onlineUser", handleOnlineUsers);
    };
  }, [socketConnection, onlineUserList]);

  // Update online members count whenever relevant data changes
  useEffect(() => {
    const count = calculateOnlineMembers();
    setOnlineMembers(count);
  }, [calculateOnlineMembers]);

  // Request online users when conversation changes
  useEffect(() => {
    if (!socketConnection || !dataUser?._id) return;
    socketConnection.emit("getOnlineUsers");
  }, [socketConnection, dataUser._id]);

  // Xử lý tìm kiếm tin nhắn
  const handleToggleSearch = () => {
    setShowSearch(prev => !prev);
  };

  const handleSearchResultClick = (messageId) => {
    if (onMessageFound) {
      onMessageFound(messageId);
      setShowSearch(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 flex h-[68px] items-center justify-between border-b border-[#c8c9cc] px-4 bg-white z-10">
        {isLoading ? (
          <div className="flex w-full items-center space-x-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200"></div>
            <div className="flex flex-col gap-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
              <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center space-x-4">
            <div className="relative">
              <img
                src={dataUser?.profilePic}
                alt={dataUser.name}
                className="h-12 w-12 cursor-pointer rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                onClick={handleAvatarClick}
              />
              {!dataUser.isGroup && dataUser.online ? (
                <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
              ) : (
                <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#8f918f]"></div>
              )}
              {dataUser.isGroup && (
                <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#005ae0]">
                  <FontAwesomeIcon icon={faUsers} width={10} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-y-1">
              <span className="text-base font-semibold">{dataUser?.name}</span>
              <div className="flex items-center space-x-2">
                {dataUser.isGroup ? (
                  <span className="text-xs text-gray-500">
                    {dataUser.members?.length || 0} thành viên
                    {onlineMembers > 0 && <span className="text-green-500"> • {onlineMembers} online</span>}
                  </span>
                ) : (
                  !isFriend && (
                    <div className="flex h-5 items-center justify-center rounded bg-gray-300 px-1 pt-[1px]">
                      <span className="text-[10px] font-bold">NGƯỜI LẠ</span>
                    </div>
                  )
                )}
                <button className="flex">
                  <FontAwesomeIcon
                    icon={faBookmark}
                    width={16}
                    className="rotate-90 text-sm text-[#555454] hover:text-[#005ae0]"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center space-x-[3px]">
          <Button
            title={dataUser.online ? "Cuộc gọi thoại" : "Người dùng không trực tuyến"}
            icon={faPhone}
            width={20}
            handleOnClick={handleAudioCall}
            styleIcon={dataUser.isGroup || !dataUser.online ? "text-gray-400" : ""}
          />
          <Button
            title={dataUser.online ? "Cuộc gọi video" : "Người dùng không trực tuyến"}
            icon={faVideo}
            width={20}
            handleOnClick={handleVideoCall}
            styleIcon={dataUser.isGroup || !dataUser.online ? "text-gray-400" : ""}
          />
          <Button
            title="Tìm kiếm tin nhắn"
            icon={faMagnifyingGlass}
            width={18}
            handleOnClick={handleToggleSearch}
            styleIcon={showSearch ? "text-[#005ae0]" : ""}
          />
          <Button
            title="Thông tin hội thoại"
            icon={faBars}
            width={18}
            handleOnClick={() => setShowRightSideBar(!showRightSideBar)}
          />
        </div>
      </header>

      {/* Search message modal */}
      {showSearch && (
        <SearchMessageModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          messages={messages || []}
          onResultClick={handleSearchResultClick}
          currentUserId={currentUser?._id}
          getSenderInfo={getSenderInfo} // Truyền getSenderInfo xuống
        />
      )}

      {/* AddFriend modal with pre-loaded user */}
      {showAddFriend && !dataUser.isGroup && (
        <AddFriend onClose={() => setShowAddFriend(false)} preloadedUser={dataUser} isFriend={isFriend} />
      )}
    </>
  );
}

Header.propTypes = {
  dataUser: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  handleAudioCall: PropTypes.func.isRequired,
  handleVideoCall: PropTypes.func.isRequired,
  setShowRightSideBar: PropTypes.func.isRequired,
  showRightSideBar: PropTypes.bool.isRequired,
  messages: PropTypes.array,
  onMessageFound: PropTypes.func,
  getSenderInfo: PropTypes.func // Thêm prop type cho getSenderInfo
};
