import { faBookmark } from "@fortawesome/free-regular-svg-icons";
import { faBars, faMagnifyingGlass, faPhone, faPlus, faUsers, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "./Button";
import commingSoon from "../../helpers/commingSoon";
import { useEffect, useState, useCallback } from "react";
import { useGlobalContext } from "../../context/GlobalProvider";

export default function Header({
  dataUser,
  isLoading,
  handleAudioCall,
  handleVideoCall,
  setShowRightSideBar,
  showRightSideBar,
}) {
  const { socketConnection } = useGlobalContext();
  const [onlineMembers, setOnlineMembers] = useState(0);
  const [onlineUserList, setOnlineUserList] = useState([]);

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

  return (
    <header className="sticky top-0 flex h-[68px] items-center justify-between border-b border-[#c8c9cc] px-4">
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
              className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
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
              {dataUser.isGroup && (
                <span className="text-xs text-gray-500">
                  {dataUser.members?.length || 0} thành viên
                  {onlineMembers > 0 && <span className="text-green-500"> • {onlineMembers} online</span>}
                </span>
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
        <Button title="Thêm bạn vào nhóm" icon={faPlus} width={20} handleOnClick={commingSoon} />
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
        <Button title="Tìm kiếm tin nhắn" icon={faMagnifyingGlass} width={18} handleOnClick={commingSoon} />
        <Button
          title="Thông tin hội thoại"
          icon={faBars}
          width={18}
          handleOnClick={() => setShowRightSideBar(!showRightSideBar)}
        />
      </div>
    </header>
  );
}
