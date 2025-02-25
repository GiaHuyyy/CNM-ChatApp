import { faAngleLeft, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import UserCard from "./UserCard";

export default function EditUserDetails({ onClose, dataUser }) {
  const [infoUserVisible, setInfoUserVisible] = useState(false);
  const [data, setData] = useState({
    name: dataUser?.name,
  });

  const dispatch = useDispatch();

  const handleOnChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const URL = `${import.meta.env.VITE_APP_BACKEND_URL}/api/update-user`;
      const response = await axios.post(URL, data, { withCredentials: true });

      toast.success(response.data.message);
      dispatch(setUser(response.data.data));
      setInfoUserVisible(false);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 bg-gray-700 bg-opacity-40 z-30">
      <div className="relative top-[92px] mx-auto w-[400px] rounded bg-white">
        {/* Head */}
        <div className="flex h-12 items-center justify-between border-b border-[#00000026] pl-4 pr-2">
          {/* Title */}
          {infoUserVisible ? (
            <div className="flex items-center gap-x-2">
              <button className="rounded-full px-2" onClick={() => setInfoUserVisible(false)}>
                <FontAwesomeIcon icon={faAngleLeft} fontSize={18} />
              </button>
              <span className="text-base font-semibold">Cập nhật thông tin cá nhân</span>
            </div>
          ) : (
            <span className="text-base font-semibold">Thông tin cá nhân</span>
          )}
          <button onClick={onClose}>
            <FontAwesomeIcon icon={faClose} width={20} />
          </button>
        </div>

        {!infoUserVisible ? (
          <UserCard isUser dataUser={dataUser} setInfoUserVisible={() => setInfoUserVisible(true)} />
        ) : (
          <form onSubmit={handleUpdateUser}>
            <div className="px-4 py-3">
              <label htmlFor="name" className="text-sm">
                Tên hiển thị
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={data.name}
                onChange={handleOnChange}
                className="mt-1 h-[38px] w-full rounded border border-[#00000026] px-3 text-sm font-normal text-[#081b3a] focus:outline-[#4b4eff]"
              />
            </div>
            <div className="px-4 py-3">
              <span className="text-sm font-semibold">Thông tin cá nhân</span>
              <div className="mt-3 flex items-center gap-x-10">
                <label htmlFor="nam" className="flex items-center gap-x-2 text-sm">
                  <input type="radio" name="gender" id="nam" />
                  Nam
                </label>
                <label htmlFor="nu" className="flex items-center gap-x-2 text-sm">
                  <input type="radio" name="gender" id="nu" />
                  Nữ
                </label>
              </div>
              <div className="mt-3">
                <span className="text-sm">Ngày sinh</span>
                <div>
                  <input
                    type="date"
                    className="mt-1 h-[38px] w-full rounded border border-[#00000026] px-3 text-sm font-normal text-[#081b3a] focus:outline-[#ccc]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-2 border-t border-[#00000026] px-4 py-3">
              <button
                className="h-10 rounded bg-[#e5e7eb] px-4 text-sm font-semibold text-[#081b3a] hover:bg-[#c6cad2]"
                onClick={() => setInfoUserVisible(false)}
              >
                Hủy
              </button>
              <button className="h-10 rounded bg-[#0068ff] px-4 text-sm font-semibold text-white hover:bg-[#0045ad]">
                Cập nhật
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

EditUserDetails.propTypes = {
  onClose: PropTypes.func.isRequired,
  dataUser: PropTypes.object.isRequired,
};
