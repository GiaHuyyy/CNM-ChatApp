import { faAngleLeft, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import UserCard from "./UserCard";
import uploadFileToCloud from "../helpers/uploadFileToClound";

export default function EditUserDetails({ onClose, dataUser }) {
  const [infoUserVisible, setInfoUserVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(dataUser.profilePic || "");
  const [data, setData] = useState({
    name: dataUser?.name,
    gender: dataUser?.gender || "male", // Default to male if not set
    birthDay: dataUser?.dateOfBirth ? new Date(dataUser.dateOfBirth).getDate().toString() : "03",
    birthMonth: dataUser?.dateOfBirth ? (new Date(dataUser.dateOfBirth).getMonth() + 1).toString() : "02",
    birthYear: dataUser?.dateOfBirth ? new Date(dataUser.dateOfBirth).getFullYear().toString() : "2003",
    phone: dataUser?.phone || "",
  });
console.log("dataUser", dataUser);
  const dispatch = useDispatch();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      return toast.error("Chọn ảnh (≤5MB)");
    }
    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // validations
    if (!data.name.trim()) return toast.error("Tên không được để trống");
    if (data.phone && !/^\d{9,15}$/.test(data.phone)) return toast.error("SĐT không hợp lệ");

    // Format date from separate fields
    const dateOfBirth = `${data.birthYear}-${String(data.birthMonth).padStart(2, "0")}-${String(data.birthDay).padStart(2, "0")}`;

    let profilePicUrl = dataUser.profilePic;
    if (selectedImage) {
      const uploadResult = await uploadFileToCloud(selectedImage);
      if (!uploadResult?.secure_url) return toast.error("Upload ảnh thất bại");
      profilePicUrl = uploadResult.secure_url;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/update-user`,
        {
          name: data.name,
          gender: data.gender,
          dateOfBirth,
          phone: data.phone,
          profilePic: profilePicUrl,
        },
        { withCredentials: true },
      );
      toast.success(res.data.message);
      dispatch(setUser(res.data.data));
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi");
    }
  };

  // Generate options for day, month, year dropdowns
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  return (
    <div className="fixed inset-0 z-30 bg-gray-700 bg-opacity-40">
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
            {/* Avatar picker */}
            <div className="p-4">
              <img src={previewImage} className="h-24 w-24 rounded-full object-cover" alt="preview" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="mt-2" />
            </div>

            {/* Name */}
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

            {/* Personal Information Section - Changed to white background */}
            <div className="px-4 py-3">
              <p className="mb-2 text-sm font-semibold">Thông tin cá nhân</p>

              {/* Gender Radio Buttons */}
              <div className="mt-2">
                <div className="flex items-center gap-x-10">
                  <label className="flex items-center gap-x-2 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={data.gender === "male"}
                      onChange={handleOnChange}
                      className="accent-blue-500"
                    />
                    Nam
                  </label>
                  <label className="flex items-center gap-x-2 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={data.gender === "female"}
                      onChange={handleOnChange}
                      className="accent-blue-500"
                    />
                    Nữ
                  </label>
                </div>
              </div>

              {/* Date of Birth Dropdowns */}
              <div className="mt-4">
                <p className="mb-1 text-sm">Ngày sinh</p>
                <div className="flex gap-x-2">
                  {/* Day dropdown */}
                  <div className="relative w-1/3">
                    <select
                      name="birthDay"
                      value={data.birthDay}
                      onChange={handleOnChange}
                      className="h-10 w-full appearance-none rounded border border-gray-300 bg-white px-2 py-1 pr-8 text-gray-800"
                    >
                      {days.map((day) => (
                        <option key={`day-${day}`} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>

                  {/* Month dropdown */}
                  <div className="relative w-1/3">
                    <select
                      name="birthMonth"
                      value={data.birthMonth}
                      onChange={handleOnChange}
                      className="h-10 w-full appearance-none rounded border border-gray-300 bg-white px-2 py-1 pr-8 text-gray-800"
                    >
                      {months.map((month) => (
                        <option key={`month-${month}`} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>

                  {/* Year dropdown */}
                  <div className="relative w-1/3">
                    <select
                      name="birthYear"
                      value={data.birthYear}
                      onChange={handleOnChange}
                      className="h-10 w-full appearance-none rounded border border-gray-300 bg-white px-2 py-1 pr-8 text-gray-800"
                    >
                      {years.map((year) => (
                        <option key={`year-${year}`} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="mt-4">
                <label className="text-sm">Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={data.phone}
                  onChange={handleOnChange}
                  placeholder="Chỉ số và không dấu"
                  className="mt-1 h-[38px] w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800"
                />
              </div>
            </div>

            {/* Action buttons - white background */}
            <div className="flex justify-end border-t border-gray-200 p-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 rounded bg-gray-200 px-8 py-2 text-gray-800 hover:bg-gray-300"
              >
                Hủy
              </button>
              <button type="submit" className="rounded bg-blue-600 px-8 py-2 text-white hover:bg-blue-700">
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
