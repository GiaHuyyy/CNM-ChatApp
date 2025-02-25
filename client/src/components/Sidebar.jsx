import { useEffect, useRef, useState } from "react";

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
  faPlus,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import EditUserDetails from "./EditUserDetails";
import DropdownAvatar from "./DropdownAvatar";
import DropdownSetting from "./DropdownSetting";
import AddFriend from "./AddFriend";
import axios from "axios";
import { NavLink } from "react-router-dom";
import commingSoon from "../helpers/commingSoon";
import { useGlobalContext } from "../context/GlobalProvider";

export default function Sidebar() {
  const user = useSelector((state) => state.user);
  const isOnline = user?.onlineUser?.includes(user?._id);
  const { socketConnection, setSeenMessage } = useGlobalContext();

  const [allUsers, setAllUsers] = useState([]);

  const [dropdownSettingVisible, setDropdownSettingVisible] = useState(false);
  const dropdownSettingRef = useRef(null);
  const buttonSettingRef = useRef(null);

  const [dropdownAvatarVisible, setDropdownAvatarVisible] = useState(false);
  const dropdownAvatarRef = useRef(null);
  const buttonAvatarRef = useRef(null);

  const [editUserDetails, setEditUserDetails] = useState(false);
  const [addFriend, setAddFriend] = useState(false);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchFriendUserInput, setSearchFriendUserInput] = useState("");
  const [searchFriendUser, setSearchFriendUser] = useState([]);

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

  const ButtonTab = ({ icon, styles, isActive, isRef, title, handleClick }) => {
    return (
      <button
        ref={isRef ? buttonSettingRef : null}
        className={`flex h-12 w-12 items-center justify-center rounded-md text-2xl ${
          isActive ? "bg-[#00000040]" : ""
        } text-white hover:bg-[#38383840] ${styles}`}
        onClick={handleClick}
        title={title}
      >
        <FontAwesomeIcon icon={icon} />
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
  };

  useEffect(() => {
    const fetchSearchFriendUser = async () => {
      try {
        setTimeout(async () => {
          if (!searchFriendUserInput) {
            return setSearchFriendUser([]);
          }
          const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/search-friend-user`;
          const response = await axios.post(URL, { search: searchFriendUserInput }, { withCredentials: true });
          setSearchFriendUser(response?.data?.data);
        }, 1200);
      } catch (error) {
        console.log(error);
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
            const conversationUserData = data.map((conversationUser) => {
              if (conversationUser?.sender?._id === conversationUser?.receiver?._id) {
                return { ...conversationUser, userDetails: conversationUser?.sender };
              } else if (conversationUser?.receiver?._id !== user?._id) {
                return { ...conversationUser, userDetails: conversationUser?.receiver };
              } else {
                return { ...conversationUser, userDetails: conversationUser?.sender };
              }
            });
            setAllUsers(conversationUserData);
          }
        });
      }
    }, 100);
  }, [socketConnection, user?._id]);

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
              <ButtonTab title="Tin nhắn" icon={faMessage} isActive={true} />
              <ButtonTab title="Danh bạ" icon={faAddressBook} handleClick={commingSoon} />
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
                  onClick={commingSoon}
                >
                  <FontAwesomeIcon icon={faPlus} width={18} className="text-[#555454]" />
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

        {/* Chat */}
        <div className="h-[calc(100%-4rem)]">
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
              <div className="scrollbar h-[calc(100%-2rem)] overflow-y-auto">
                {allUsers.length === 0 ? (
                  <div className="flex h-[calc(100%-4rem)] items-center justify-center">
                    <p className="mt-3 text-sm text-[#5a6981]">Không có tin nhắn nào</p>
                  </div>
                ) : (
                  allUsers.map((user) => (
                    <NavLink
                      to={"/" + user?.userDetails?._id}
                      key={user?._id}
                      className="flex h-[74px] items-center px-4 hover:bg-[#f1f2f4]"
                      onClick={() => user?.unseenMessages > 0 && setSeenMessage(true)}
                    >
                      <img
                        src={user?.userDetails?.profilePic}
                        alt={user?.userDetails?.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="ml-3 flex-1 overflow-hidden">
                        <p className="text-[15px] font-semibold">{user?.userDetails?.name}</p>
                        <p className="max-w-48 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#5a6981]">
                          {user?.latestMessage?.msgByUserId !== user?.userDetails?._id ? "Bạn: " : ""}
                          {user?.latestMessage?.text && user?.latestMessage?.text}
                          {user?.latestMessage?.imageUrl && (
                            <>
                              <FontAwesomeIcon icon={faImage} width={15} className="text-[#ccc]" />
                              {user?.latestMessage?.fileName}
                            </>
                          )}
                          {user?.latestMessage?.fileUrl && (
                            <>
                              <FontAwesomeIcon icon={faFilePen} width={15} className="text-[#ccc]" />
                              {user?.latestMessage?.fileName}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-y-1">
                        <p className="text-xs text-[#5a6981]">
                          {new Date(user?.latestMessage?.createdAt).toLocaleTimeString()}
                        </p>
                        {user?.unseenMessages > 0 && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-700">
                            <span className="mr-[1px] mt-[1px] text-[10px] text-white">{user?.unseenMessages}</span>
                          </div>
                        )}
                      </div>
                    </NavLink>
                  ))
                )}
              </div>
            </div>
          ) : (
            // List search
            <div className="h-full overflow-y-auto">
              {searchFriendUser.map((user) => (
                <NavLink
                  to={"/" + user._id}
                  key={user._id}
                  className="flex items-center gap-x-4 border-b border-gray-300 p-4"
                  onClick={() => {
                    setSearchFriendUser([]), setIsSearchFocused(false), setSearchFriendUserInput("");
                  }}
                >
                  <img src={user.profilePic} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-base font-semibold">{user.name}</p>
                    <p className="text-sm text-[#5a6981]">{user.phone}</p>
                  </div>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EditUserDetails */}
      {editUserDetails && <EditUserDetails onClose={() => setEditUserDetails(false)} dataUser={user} />}

      {/* AddFriend */}
      {addFriend && <AddFriend onClose={() => setAddFriend(false)} />}
    </nav>
  );
}
