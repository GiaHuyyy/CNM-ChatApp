import { useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function SelectNewAdminModal({ isOpen, onClose, members, currentAdmin, onSelectNewAdmin }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");

  // Filter out current admin and filter by search term
  const filteredMembers = members.filter(
    (member) => member._id !== currentAdmin._id && member.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (member) => {
    setSelectedMember(member);
  };

  const handleConfirm = () => {
    if (selectedMember) {
      onSelectNewAdmin(selectedMember);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[480px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold">Chọn trưởng nhóm mới trước khi rời</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Search bar */}
          <div className="mb-4 flex items-center rounded-full border border-gray-300 px-3 py-2">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-400" />
            <input
              type="text"
              className="ml-2 flex-1 bg-transparent outline-none"
              placeholder="Tìm kiếm thành viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Members list */}
          <div className="max-h-72 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="py-4 text-center text-gray-500">Không tìm thấy thành viên nào</p>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member._id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg p-2 ${
                    selectedMember?._id === member._id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleSelect(member)}
                >
                  <div className="flex items-center">
                    <img src={member.profilePic} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                    <div className="ml-3">
                      <p className="font-medium">{member.name}</p>
                    </div>
                  </div>

                  {/* Radio button */}
                  <div
                    className={`h-5 w-5 rounded-full border border-gray-300 ${
                      selectedMember?._id === member._id ? "border-4 border-blue-500" : ""
                    }`}
                  ></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-gray-200 p-4">
          <button onClick={onClose} className="mr-2 rounded px-4 py-2 text-gray-700 hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMember}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Chọn và tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}

SelectNewAdminModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  members: PropTypes.array.isRequired,
  currentAdmin: PropTypes.object.isRequired,
  onSelectNewAdmin: PropTypes.func.isRequired,
};
