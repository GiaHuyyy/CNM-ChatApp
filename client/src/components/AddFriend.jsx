import { faAngleLeft, faCaretDown, faClose, faHeadset } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Images from "../constants/images";
import UserCard from "./UserCard";

export default function AddFriend({ onClose, preloadedUser = null, isFriend = false }) {
  const [search, setSearch] = useState("");
  const [searchUser, setSearchUser] = useState(null);

  // If a preloadedUser is provided, set it as the searchUser immediately
  useEffect(() => {
    if (preloadedUser) {
      setSearchUser(preloadedUser);
    }
  }, [preloadedUser]);

  const handleSearchUser = async () => {
    try {
      const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/search-user`;
      const response = await axios.post(URL, { email: search });

      toast.success(response.data.message);
      setSearchUser(response.data.data);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-10 bg-gray-700 bg-opacity-40">
      <div className="relative top-[64px] mx-auto w-[400px] rounded bg-white">
        {/* Head */}
        <div className="flex h-12 items-center justify-between border-b border-[#00000026] pl-4 pr-2">
          {/* Modified header based on whether it's a friend and if there's a search user */}
          {searchUser ? (
            isFriend ? (
              // If it's a friend, just show the close button
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-semibold">Thông tin người dùng</span>
                <button onClick={onClose}>
                  <FontAwesomeIcon icon={faClose} width={20} />
                </button>
              </div>
            ) : (
              // If not a friend, show the back button, "Kết bạn" text, and close button
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <button className="rounded-full px-2" onClick={() => setSearchUser(null)}>
                    <FontAwesomeIcon icon={faAngleLeft} fontSize={18} />
                  </button>
                  <span className="text-base font-semibold">Kết bạn</span>
                </div>
                <button onClick={onClose}>
                  <FontAwesomeIcon icon={faClose} width={20} />
                </button>
              </div>
            )
          ) : (
            // Original header for initial state
            <div className="flex w-full items-center justify-between">
              <span className="text-base font-semibold">Thêm bạn</span>
              <button onClick={onClose}>
                <FontAwesomeIcon icon={faClose} width={20} />
              </button>
            </div>
          )}
        </div>

        <div>
          {!searchUser ? (
            <div>
              <div className="p-4">
                {/* Search */}
                <div className="mb-[20px] flex h-10 items-center">
                  <div className="mr-4 flex h-full items-center gap-x-2 border-b border-[#00000026]">
                    <img src={Images.VI} alt="" className="h-[26px] w-[26px]" />
                    <span className="text-sm font-semibold">(+84)</span>
                    <FontAwesomeIcon icon={faCaretDown} width={20} className="mb-1 text-lg text-[#8f8d8d]" />
                  </div>
                  <input
                    type="tel"
                    id="search"
                    placeholder="Số điện thoại"
                    className="h-full flex-1 border-b border-[#00000026] bg-transparent pl-1 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="py-2">
                  <span className="text-[13px] text-[#5a6981]">Kêt quả gần nhất</span>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faHeadset} width={12} className="mr-1 text-[#5a6981]" />
                    <span className="text-[13px] text-[#5a6981]">Có thể bạn quen</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-x-2 border-t border-[#00000026] px-4 py-3">
                <button
                  className="h-10 rounded bg-[#e5e7eb] px-4 text-sm font-semibold text-[#081b3a] hover:bg-[#c6cad2]"
                  onClick={onClose}
                >
                  Hủy
                </button>
                <button
                  className="h-10 rounded bg-[#0068ff] px-4 text-sm font-semibold text-white hover:bg-[#0045ad]"
                  onClick={handleSearchUser}
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          ) : (
            <UserCard dataUser={searchUser} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

AddFriend.propTypes = {
  onClose: PropTypes.func.isRequired,
  preloadedUser: PropTypes.object, // New prop for the pre-loaded user
  isFriend: PropTypes.bool, // New prop to indicate if the user is already a friend
};
