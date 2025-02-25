import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Images from "../constants/images";
import { faAddressCard, faEdit } from "@fortawesome/free-regular-svg-icons";
import PropTypes from "prop-types";
import { faBan, faTriangleExclamation, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

export default function UserCard({ isUser, dataUser, setInfoUserVisible, onClose }) {
  return (
    <div className="max-h-[570px] overflow-y-auto">
      <div className="h-[171px] w-full">
        <img src={Images.BLACK} alt="" className="h-full w-full object-cover" />
      </div>
      {/* Avatar */}
      <div className="-mt-4 mb-[6px] flex items-center gap-x-3 p-4 pt-0">
        <img src={dataUser?.profilePic} alt="avatar" className="h-20 w-20 rounded-full border-white object-cover" />
        <span className="text-lg font-semibold">{dataUser?.name}</span>
        <button onClick={setInfoUserVisible}>
          <FontAwesomeIcon icon={faEdit} width={20} />
        </button>
      </div>

      {!isUser && (
        <div className="flex justify-center gap-x-2 px-4 pb-4">
          <button className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#e5e7eb] text-sm font-semibold hover:bg-[#c6cad2]">
            Kết bạn
          </button>
          <Link
            to={"/" + dataUser?._id}
            onClick={onClose}
            className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#dbebff] text-sm font-semibold text-[#0045ad] hover:bg-[#c7e0ff]"
          >
            Nhắn tin
          </Link>
        </div>
      )}

      <div className="h-[6px] w-full bg-[#ebecf0]"></div>

      <div className="px-4 py-3">
        {/* Info */}
        <div>
          <p className="text-base font-semibold">Thông tin cá nhân</p>
          <div className="mt-3">
            <div className="flex items-center">
              <span className="w-[100px] text-sm text-[#5a6981]">Giới tính</span>
              <span className="text-sm">Chưa có</span>
            </div>
            <div className="mt-2 flex items-center">
              <span className="w-[100px] text-sm text-[#5a6981]">Ngày sinh</span>
              <span className="text-sm">Chưa có</span>
            </div>
            {isUser && (
              <div className="mt-2 flex items-center">
                <span className="w-[100px] text-sm text-[#5a6981]">Điện thoại</span>
                <span className="text-sm">+84 {dataUser?.phone}</span>
              </div>
            )}
            {isUser && (
              <p className="mt-3 text-[13px] font-normal leading-[18px] text-[#5a6981]">
                Chỉ bạn bè có lưu số của bạn trong danh sách danh bạ máy xem được số này
              </p>
            )}
          </div>

          {isUser && (
            <div>
              <div className="my-3 border border-[#0000000d]"></div>

              <button
                className="flex w-full items-center justify-center gap-x-2 rounded py-1 hover:bg-[#f0f2f5]"
                onClick={setInfoUserVisible}
              >
                <FontAwesomeIcon icon={faEdit} width={20} />
                <span className="font-semibold">Cập nhật</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!isUser && (
        <div>
          <div className="mt-3 h-[6px] w-full bg-[#ebecf0]"></div>

          <div className="py-3">
            <button className="flex w-full items-center gap-x-2 px-4 py-3" disabled>
              <FontAwesomeIcon icon={faUserGroup} width={14} className="text-[#8b96a7]" />
              <span className="text-sm text-[#8b96a7]">Nhóm chung (0)</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3" disabled>
              <FontAwesomeIcon icon={faAddressCard} width={14} className="text-[#8b96a7]" />
              <span className="text-sm text-[#8b96a7]">Chia sẻ danh thiếp</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3 hover:bg-[#f1f2f4]">
              <FontAwesomeIcon icon={faBan} width={14} className="text-[#717a88]" />
              <span className="text-sm">Chặn tin nhắn và cuộc gọi</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3 hover:bg-[#f1f2f4]">
              <FontAwesomeIcon icon={faTriangleExclamation} width={14} className="text-[#717a88]" />
              <span className="text-sm">Báo xấu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

UserCard.propTypes = {
  isUser: PropTypes.bool,
  dataUser: PropTypes.object,
  setInfoUserVisible: PropTypes.func,
  onClose: PropTypes.func,
};
