import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faGear } from "@fortawesome/free-solid-svg-icons";
import { useSelector, useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { setUser } from "../redux/userSlice";
import uploadFileToCloud from "../../helpers/uploadFileToCloud";

export default function Profile() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.user.token);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState({ name: "", profilePic: "" });
  const [newAvatarUri, setNewAvatarUri] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/user-details", {
          withCredentials: true,
        });
        setUserInfo(response.data.data);
        setEditData({
          name: response.data.data.name,
          profilePic: response.data.data.profilePic,
        });
      } catch (error) {
        console.error("Error fetching user info:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const pickNewAvatar = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            return alert("Ảnh phải nhỏ hơn 5MB");
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            setNewAvatarUri({
              uri: reader.result,
              name: file.name,
              type: file.type,
              file, // giữ nguyên file object
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        return alert('Bạn cần cấp quyền truy cập thư viện ảnh');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        if (file.fileSize > 5 * 1024 * 1024) {
          return alert("Ảnh phải nhỏ hơn 5MB");
        }

        // Lưu ảnh vào trạng thái mới
        setNewAvatarUri({
          uri: file.uri,
          name: file.fileName,
          type: file.type,
          file, // Lưu nguyên đối tượng file
        });
      }
    }
  };

  const handleUpdateUser = async () => {
    if (!editData.name.trim()) return; // Kiểm tra nếu tên người dùng không rỗng

    setUpdating(true);
    try {
      let avatarUrl = editData.profilePic; // Sử dụng ảnh cũ ban đầu

      // Nếu người dùng đã chọn ảnh mới, upload lên Cloudinary
      if (newAvatarUri) {
        const filename = newAvatarUri.name || newAvatarUri.uri.split("/").pop(); // Lấy tên file từ URI
        const type = newAvatarUri.type || filename.split(".").pop(); // Lấy loại tệp từ tên file

        const file = {
          uri: newAvatarUri.uri,
          name: filename,
          type: `image/${type}`,
        };

        const uploadResult = await uploadFileToCloud(file); // Gửi file lên Cloudinary
        if (uploadResult && uploadResult.secure_url) {
          avatarUrl = uploadResult.secure_url; // Cập nhật avatarUrl bằng URL ảnh mới
        }
      }

      console.log("Avatar URL to update:", avatarUrl); // Kiểm tra avatarUrl

      // Gửi yêu cầu API để cập nhật thông tin người dùng
      const res = await axios.post(
        "http://localhost:5000/api/update-user",
        {
          name: editData.name, // Tên người dùng
          profilePic: avatarUrl, // URL ảnh mới từ Cloudinary hoặc ảnh cũ
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Gửi token nếu cần
          },
          withCredentials: true,
        }
      );

      console.log("Update successful:", res.data);

      // Cập nhật lại thông tin người dùng trong Redux và đóng modal
      setUserInfo(res.data.data);
      dispatch(setUser(res.data.data));
      setModalVisible(false); // Đóng modal sau khi thành công
    } catch (err) {
      console.error("Update failed:", err.message); // Log lỗi nếu có
    } finally {
      setUpdating(false); // Dừng loading
    }
  };



  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Không thể tải thông tin người dùng</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-blue-500 px-4 py-4 flex-row items-center justify-between">
        <TouchableOpacity>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Hồ sơ</Text>
        <TouchableOpacity>
          <FontAwesomeIcon icon={faGear} size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile row */}
      <TouchableOpacity
        className="flex-row items-center px-4 mt-4 border-b border-gray-300"
        onPress={() => setModalVisible(true)}
      >
        <Image
          source={{ uri: userInfo.profilePic }}
          className="w-[50px] h-[50px] rounded-full mr-3"
        />
        <View>
          <Text className="text-base font-semibold leading-4">{userInfo.name}</Text>
          <Text className="text-blue-500 text-xs leading-4 mb-2">Xem và chỉnh sửa thông tin</Text>
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] p-4 rounded-xl">
            <Text className="text-lg font-semibold text-center mb-4">Chỉnh sửa thông tin</Text>

            <TouchableOpacity className="items-center mb-4" onPress={pickNewAvatar}>
              <Image
                source={{
                  uri: newAvatarUri ? newAvatarUri.uri : editData.profilePic,
                }}
                className="w-24 h-24 rounded-full"
              />
              <Text className="text-blue-500 text-sm mt-2">Chọn ảnh mới</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Tên người dùng"
              className="border border-gray-300 rounded px-3 py-2 mb-4"
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              style={{ outline: "none" }}
            />

            <View className="flex-row justify-end">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 rounded bg-gray-300 mr-2"
              >
                <Text>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleUpdateUser}
                className="px-4 py-2 rounded bg-blue-500"
                disabled={updating}
              >
                <Text className="text-white font-semibold">
                  {updating ? "Đang lưu..." : "Lưu"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
