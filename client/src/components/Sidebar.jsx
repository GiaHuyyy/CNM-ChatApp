import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { faAddressBook, faImage, faMessage, faSquareCheck } from "@fortawesome/free-regular-svg-icons";
import {
  faAngleDown,
  faBriefcase,
  faCloud,
  faCloudArrowUp,
  faEllipsis,
  faFilePen,
  faGear,
  faMagnifyingGlass,
  faUserPlus,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { useGlobalContext } from "../context/GlobalProvider";
import commingSoon from "../helpers/commingSoon";
import AddFriend from "./AddFriend";
import DropdownAvatar from "./DropdownAvatar";
import DropdownSetting from "./DropdownSetting";
import EditUserDetails from "./EditUserDetails";
import GroupChatModal from "./GroupChatModal";

export default function Sidebar({ onGroupCreated }) {
  const user = useSelector((state) => state.user);
  const isOnline = user?.onlineUser?.includes(user?._id);
  const { socketConnection, setSeenMessage } = useGlobalContext();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);

  const [dropdownSettingVisible, setDropdownSettingVisible] = useState(false);
  const dropdownSettingRef = useRef(null);
  const buttonSettingRef = useRef(null);

  const [dropdownAvatarVisible, setDropdownAvatarVisible] = useState(false);
  const dropdownAvatarRef = useRef(null);
  const buttonAvatarRef = useRef(null);

  const [editUserDetails, setEditUserDetails] = useState(false);
  const [addFriend, setAddFriend] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchFriendUserInput, setSearchFriendUserInput] = useState("");
  const [searchFriendUser, setSearchFriendUser] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [openTab, setOpenTab] = useState("chat");

  const toggleDropdownSetting = () => {
    setDropdownSettingVisible(!dropdownSettingVisible);
    setDropdownAvatarVisible(false);
  };

  const toggleDropdownAvatar = () => {
    setDropdownAvatarVisible(!dropdownAvatarVisible);
    setDropdownSettingVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownSettingRef.current &&
        !dropdownSettingRef.current.contains(event.target) &&
        !buttonSettingRef.current.contains(event.target)
      ) {
        setDropdownSettingVisible(false);
      }

      if (
        dropdownAvatarRef.current &&
        !dropdownAvatarRef.current.contains(event.target) &&
        !buttonAvatarRef.current.contains(event.target)
      ) {
        setDropdownAvatarVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownSettingRef, buttonSettingRef]);

  const ButtonTab = ({ icon, styles, isActive, isRef, title, handleClick, notificationCount }) => {
    return (
      <button
        ref={isRef ? buttonSettingRef : null}
        className={`relative flex h-12 w-12 items-center justify-center rounded-md text-2xl ${
          isActive ? "bg-[#00000040]" : ""
        } text-white hover:bg-[#38383840] ${styles}`}
        onClick={handleClick}
        title={title}
      >
        <FontAwesomeIcon icon={icon} />
        {notificationCount > 0 && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
            {notificationCount}
          </div>
        )}
      </button>
    );
  };

  ButtonTab.propTypes = {
    icon: PropTypes.object.isRequired,
    styles: PropTypes.string,
    isActive: PropTypes.bool,
    handleClick: PropTypes.func,
    isRef: PropTypes.bool,
    title: PropTypes.string,
    notificationCount: PropTypes.number,
  };

  // Add state for friend requests count
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);

  // Add useEffect to fetch friend requests count
  useEffect(() => {
    const fetchFriendRequestsCount = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_BACKEND_URL}/api/pending-friend-requests`, {
          withCredentials: true,
        });
        setFriendRequestsCount(response.data.data.length);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchFriendRequestsCount();

    // Set up interval to check for new requests
    const interval = setInterval(fetchFriendRequestsCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update the ButtonTab for bookphone
  <ButtonTab
    title="Danh bạ"
    icon={faAddressBook}
    isActive={openTab === "bookphone"}
    handleClick={() => handleOpenTab("bookphone")}
    notificationCount={friendRequestsCount}
  />;
  const handleOpenTab = (tab) => {
    setOpenTab(tab);
    // Navigate to the corresponding route based on the tab
    if (tab === "bookphone") {
      navigate("/bookphone/listfriends"); // Thay đổi từ /bookphone thành /bookphone/listfriends
    } else if (tab === "chat") {
      navigate("/chat");
    }
  };

  useEffect(() => {
    const fetchSearchFriendUser = async () => {
      try {
        if (!searchFriendUserInput) {
          setSearchFriendUser([]);
          return;
        }

        setSearchLoading(true);

        setTimeout(async () => {
          const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/search-friend-user`;
          const response = await axios.post(URL, { search: searchFriendUserInput }, { withCredentials: true });

          console.log("Search results:", {
            total: response?.data?.data?.length || 0,
            users: response?.data?.data?.filter((r) => !r.isGroup)?.length || 0,
            groups: response?.data?.data?.filter((r) => r.isGroup)?.length || 0,
            results: response?.data?.data,
          });

          setSearchFriendUser(response?.data?.data || []);
          setSearchLoading(false);
        }, 600);
      } catch (error) {
        console.error("Search error:", error.response?.data || error);
        setSearchLoading(false);
      }
    };
    fetchSearchFriendUser();
  }, [searchFriendUserInput]);

  useEffect(() => {
    setTimeout(() => {
      if (socketConnection) {
        socketConnection.emit("sidebar", user?._id);

        socketConnection.on("conversation", (data) => {
          console.log("Conversation: ", data);

          if (data) {
            setAllUsers(data);
          }
        });
      }
    }, 100);
  }, [socketConnection, user?._id]);

  useEffect(() => {
    if (socketConnection) {
      // Listen for conversationDeleted events
      socketConnection.on("conversationDeleted", (response) => {
        if (response.success && response.conversationId) {
          console.log(`Conversation ${response.conversationId} deleted, refreshing sidebar`);
          // Request fresh conversation list
          socketConnection.emit("sidebar", user?._id);
        }
      });

      return () => {
        socketConnection.off("conversationDeleted");
      };
    }
  }, [socketConnection, user?._id]);

  const handleGroupCreated = (conversationId) => {
    // Pass the conversationId to the parent component
    if (onGroupCreated) {
      onGroupCreated(conversationId);
    }

    navigate(`/chat/${conversationId}`);
  };

  return (
    <nav className="flex h-full">
      {/* Main tabs */}
      <div className="h-full w-16 bg-[#005ae0]">
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="relative flex h-[100px] justify-center pt-8">
              <button onClick={toggleDropdownAvatar} ref={buttonAvatarRef}>
                <img
                  src={user?.profilePic}
                  alt="avatar"
                  className="h-12 w-12 select-none rounded-full object-cover"
                  title={user?.name}
                />
                {/* Status online */}
                {isOnline && (
                  <div className="absolute bottom-[9px] right-[9px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
                )}
              </button>

              {/* Dropdown Avatar */}
              {dropdownAvatarVisible && (
                <DropdownAvatar
                  dropdownAvatarRef={dropdownAvatarRef}
                  dataUser={user}
                  openEditUserDetails={() => setEditUserDetails(true)}
                />
              )}
            </div>

            {/* Tabs top */}
            <div className="flex flex-col items-center gap-y-2 py-1">
              <ButtonTab
                title="Tin nhắn"
                icon={faMessage}
                isActive={openTab === "chat"}
                handleClick={() => handleOpenTab("chat")}
              />
              <ButtonTab
                title="Danh bạ"
                icon={faAddressBook}
                isActive={openTab === "bookphone"}
                handleClick={() => handleOpenTab("bookphone")}
                notificationCount={friendRequestsCount}
              />
              <ButtonTab title="Todo" icon={faSquareCheck} handleClick={commingSoon} />
            </div>
          </div>

          {/* Tabs bottom */}
          <div className="relative flex flex-col items-center gap-y-[8px] pb-3">
            <ButtonTab title="Z Cloud" icon={faCloudArrowUp} handleClick={commingSoon} />
            <div className="h-[1px] w-[38px] bg-white"></div>
            <ButtonTab title="Cloud của tôi" icon={faCloud} handleClick={commingSoon} />
            <ButtonTab title="Công cụ" icon={faBriefcase} handleClick={commingSoon} />
            <ButtonTab title="Cài đặt" icon={faGear} handleClick={toggleDropdownSetting} isRef />

            {/* Dropdown Settings */}
            {dropdownSettingVisible && (
              <DropdownSetting
                dropdownSettingRef={dropdownSettingRef}
                openEditUserDetails={() => setEditUserDetails(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sidebar action */}
      <div className="flex-1">
        {/* Contact */}
        <div className="flex h-16 items-center justify-between gap-x-1 px-4">
          <div className="flex h-8 w-60 items-center overflow-hidden rounded-[5px] bg-[#ebecf0] pl-3">
            <FontAwesomeIcon icon={faMagnifyingGlass} width={15} className="text-[#a5a4a4]" />
            <input
              type="text"
              name="search"
              id="search"
              placeholder="Tìm kiếm"
              className="flex-1 bg-transparent pl-1 text-sm"
              onFocus={() => setIsSearchFocused(true)}
              value={searchFriendUserInput}
              onChange={(e) => setSearchFriendUserInput(e.target.value)}
            />
          </div>

          <div className="flex flex-1 items-center">
            {!isSearchFocused ? (
              <>
                <button
                  title="Thêm bạn"
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#ebecf0]"
                  onClick={() => setAddFriend(true)}
                >
                  <FontAwesomeIcon icon={faUserPlus} width={18} className="text-[#555454]" />
                </button>
                <button
                  title="Tạo nhóm chat"
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#ebecf0]"
                  onClick={() => setShowGroupModal(true)}
                >
                  <FontAwesomeIcon icon={faUsers} width={18} className="text-[#555454]" />
                </button>
              </>
            ) : (
              <button
                className="h-8 flex-1 rounded text-base font-medium hover:bg-[#ebecf0]"
                onClick={() => {
                  setIsSearchFocused(false), setSearchFriendUserInput("");
                }}
              >
                Đóng
              </button>
            )}
          </div>
        </div>

        {/* Conditional content based on active tab */}
        {openTab === "chat" ? (
          <div className="h-[calc(100%-4rem)] overflow-auto">
            {!isSearchFocused ? (
              <div>
                {/* Chat filter */}
                <div className="flex h-8 items-center border-b border-gray-300 px-4">
                  <div className="h-full">
                    <button
                      className="mr-3 h-full border-b-[2px] border-[#005ae0] text-[13px] font-semibold text-[#005ae0]"
                      onClick={commingSoon}
                    >
                      Tất cả
                    </button>
                    <button className="text-[13px] font-semibold text-[#5a6981]" onClick={commingSoon}>
                      Chưa đọc
                    </button>
                  </div>
                  <div className="ml-auto flex items-center gap-x-4">
                    <button className="flex items-center gap-x-2 pl-2 pr-1">
                      <span className="text-[13px]" onClick={commingSoon}>
                        Phân loại
                      </span>
                      <FontAwesomeIcon icon={faAngleDown} width={12} />
                    </button>
                    <button onClick={commingSoon}>
                      <FontAwesomeIcon icon={faEllipsis} width={12} />
                    </button>
                  </div>
                </div>

                {/* Chat list */}
                <div className="scrollbar h-full overflow-auto">
                  {allUsers.length === 0 ? (
                    <div className="flex h-[calc(100%-4rem)] items-center justify-center">
                      <p className="mt-3 text-sm text-[#5a6981]">Không có tin nhắn nào</p>
                    </div>
                  ) : (
                    allUsers.map((chatItem) => (
                      <NavLink
                        to={"/chat/" + chatItem?.userDetails?._id}
                        key={chatItem?._id}
                        className="flex h-[74px] items-center px-4 hover:bg-[#f1f2f4]"
                        onClick={() => {
                          // Immediately update the UI to show 0 unseen messages
                          setAllUsers((prev) =>
                            prev.map((item) => (item._id === chatItem._id ? { ...item, unseenMessages: 0 } : item)),
                          );
                          setSeenMessage(true);
                        }}
                      >
                        {/* User or group avatar */}
                        <div className="relative">
                          <img
                            src={chatItem?.userDetails?.profilePic}
                            alt={chatItem?.userDetails?.name}
                            className={`h-12 w-12 rounded-full object-cover`}
                            onError={(e) => {
                              // If image fails to load, use a fallback
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                chatItem?.userDetails?.name || "Chat",
                              )}&background=random`;
                            }}
                          />
                          {chatItem?.isGroup && (
                            <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#005ae0]">
                              <FontAwesomeIcon icon={faUsers} width={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <p className="text-[15px] font-semibold">{chatItem?.userDetails?.name}</p>
                          <p className="max-w-48 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#5a6981]">
                            {/* Group chat message with sender name */}
                            {chatItem?.isGroup ? (
                              <>
                                {/* If it's your message, show "Bạn: " */}
                                {chatItem?.latestMessage?.msgByUserId === user._id ? (
                                  <>Bạn: </>
                                ) : (
                                  /* Otherwise show sender's name - find the sender from members array */
                                  <>
                                    {chatItem?.members?.find((m) => m._id === chatItem?.latestMessage?.msgByUserId)
                                      ?.name !==
                                      "" + ":" || ""}
                                  </>
                                )}
                              </>
                            ) : (
                              /* For direct chats, keep existing behavior */
                              <>{chatItem?.latestMessage?.msgByUserId !== chatItem?.userDetails?._id ? "Bạn: " : ""}</>
                            )}
                            {/* The actual message content - unchanged */}
                            {chatItem?.latestMessage?.text && chatItem?.latestMessage?.text}
                            {chatItem?.latestMessage?.imageUrl && (
                              <>
                                <FontAwesomeIcon icon={faImage} width={15} className="text-[#ccc]" />
                                {chatItem?.latestMessage?.fileName
                                  ? ` ${chatItem?.latestMessage?.fileName}`
                                  : " Hình ảnh"}
                              </>
                            )}
                            {chatItem?.latestMessage?.fileUrl && (
                              <>
                                <FontAwesomeIcon icon={faFilePen} width={15} className="text-[#ccc]" />
                                {chatItem?.latestMessage?.fileName}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-y-1">
                          <p className="text-xs text-[#5a6981]">
                            {chatItem?.latestMessage?.createdAt &&
                              new Date(chatItem?.latestMessage?.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                          </p>
                          {chatItem?.unseenMessages > 0 && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-700">
                              <span className="mr-[1px] mt-[1px] text-[10px] text-white">
                                {chatItem?.unseenMessages}
                              </span>
                            </div>
                          )}
                        </div>
                      </NavLink>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Search results
              <div className="h-full overflow-y-auto">
                {searchLoading ? (
                  <div className="flex h-20 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
                  </div>
                ) : searchFriendUser.length === 0 ? (
                  <div className="flex h-20 items-center justify-center">
                    <p className="text-sm text-gray-500">Không tìm thấy kết quả phù hợp</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2">
                      <p className="text-xs font-medium text-gray-500">Kết quả tìm kiếm ({searchFriendUser.length})</p>
                    </div>
                    {searchFriendUser.map((result) => (
                      <NavLink
                        to={"/chat/" + result._id}
                        key={result._id}
                        className="flex h-[74px] items-center px-4 hover:bg-[#f1f2f4]"
                        onClick={() => {
                          console.log(`Clicked on result:`, {
                            id: result._id,
                            name: result.name,
                            isGroup: result.isGroup,
                          });
                          setSearchFriendUser([]);
                          setIsSearchFocused(false);
                          setSearchFriendUserInput("");
                        }}
                      >
                        <div className="relative">
                          <img
                            src={result.profilePic}
                            alt={result.name || (result.isGroup ? "Group" : "User")}
                            className="h-12 w-12 rounded-full object-cover"
                            onError={(e) => {
                              // If image fails to load, use a fallback
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                result.name || (result.isGroup ? "Group" : "User"),
                              )}&background=random`;
                            }}
                          />
                          {/* Show group icon or online status */}
                          {result.isGroup ? (
                            <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#005ae0]">
                              <FontAwesomeIcon icon={faUsers} width={10} className="text-white" />
                            </div>
                          ) : (
                            user?.onlineUser?.includes(result._id) && (
                              <div className="absolute bottom-[2px] right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#2dc937]"></div>
                            )
                          )}
                        </div>
                        <div className="ml-3 flex flex-col">
                          <p className="text-[15px] font-semibold">
                            {result.name || (result.isGroup ? "Group Chat" : "User")}
                          </p>
                          {!result.isGroup && <p className="text-sm text-[#5a6981]">{result.email}</p>}
                        </div>
                      </NavLink>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : openTab === "bookphone" ? (
          <div className="h-[calc(100%-4rem)]">
            <div className="flex h-8 items-center border-b border-gray-300 px-4">
              <div className="h-full">
                <button
                  className="mr-3 h-full border-b-[2px] border-[#005ae0] text-[13px] font-semibold text-[#005ae0]"
                  onClick={commingSoon}
                >
                  Tất cả
                </button>
                <button className="text-[13px] font-semibold text-[#5a6981]" onClick={commingSoon}>
                  Chưa đọc
                </button>
              </div>
              <div className="ml-auto flex items-center gap-x-4">
                <button className="flex items-center gap-x-2 pl-2 pr-1">
                  <span className="text-[13px]" onClick={commingSoon}>
                    Phân loại
                  </span>
                  <FontAwesomeIcon icon={faAngleDown} width={12} />
                </button>
                <button onClick={commingSoon}>
                  <FontAwesomeIcon icon={faEllipsis} width={12} />
                </button>
              </div>
            </div>

            {/* BookPhone content */}
            <div className="flex flex-col gap-4 p-4">
              <NavLink
                to="/bookphone/listfriends"
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`
                }
              >
                Danh sách bạn bè
              </NavLink>

              <NavLink
                to="/bookphone/listinvites"
                className={({ isActive }) =>
                  `relative rounded-lg px-4 py-2 ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`
                }
              >
                Lời mời kết bạn
                {friendRequestsCount > 0 && (
                  <span className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {friendRequestsCount}
                  </span>
                )}
              </NavLink>
            </div>
          </div>
        ) : null}
      </div>

      {/* EditUserDetails */}
      {editUserDetails && <EditUserDetails onClose={() => setEditUserDetails(false)} dataUser={user} />}

      {/* AddFriend */}
      {addFriend && <AddFriend onClose={() => setAddFriend(false)} />}

      {/* GroupChatModal */}
      {showGroupModal && (
        <GroupChatModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </nav>
  );
}

Sidebar.propTypes = {
  onGroupCreated: PropTypes.func,
};
