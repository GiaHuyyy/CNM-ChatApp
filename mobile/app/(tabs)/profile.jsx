import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faGear, faCamera } from "@fortawesome/free-solid-svg-icons";
import { useSelector, useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { setUser } from "../redux/userSlice";
import uploadFileToCloud from "../../helpers/uploadFileToCloud";

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user); // Correctly access user from Redux
  const token = useSelector((state) => state.user.token);

  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [newAvatarUri, setNewAvatarUri] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Set initial edit name when modal opens
  useEffect(() => {
    if (modalVisible) {
      setEditName(user.name || "");
    }
  }, [modalVisible, user.name]);

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
              file,
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

        setNewAvatarUri({
          uri: file.uri,
          name: file.fileName,
          type: file.type,
          file,
        });
      }
    }
  };

  const handleUpdateUser = async () => {
    if (!editName.trim()) {
      alert("Tên người dùng không được để trống");
      return;
    }

    setUpdating(true);
    try {
      let avatarUrl = user.profilePic; // Use existing profile pic by default

      // If user selected a new avatar, upload it
      if (newAvatarUri) {
        const filename = newAvatarUri.name || newAvatarUri.uri.split("/").pop();
        const type = newAvatarUri.type || filename.split(".").pop();

        const file = {
          uri: newAvatarUri.uri,
          name: filename,
          type: `image/${type}`,
        };

        const uploadResult = await uploadFileToCloud(file);
        if (uploadResult && uploadResult.secure_url) {
          avatarUrl = uploadResult.secure_url;
        }
      }

      // Update user via API
      const res = await axios.post(
        "http://localhost:5000/api/update-user",
        {
          name: editName,
          profilePic: avatarUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      // Update Redux store with new user data
      dispatch(setUser(res.data.data));

      // Reset state and close modal
      setNewAvatarUri(null);
      setModalVisible(false);
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      alert("Không thể cập nhật thông tin. Vui lòng thử lại sau.");
    } finally {
      setUpdating(false);
    }
  };

  // Show loading if we don't have user data yet
  if (!user._id) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4">Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-blue-500 px-4 py-4 pt-10 flex-row items-center justify-between">
        <TouchableOpacity>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Hồ sơ</Text>
        <TouchableOpacity>
          <FontAwesomeIcon icon={faGear} size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile content */}
      <View className="items-center mt-6">
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <View className="relative">
            <Image
              source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }}
              className="w-24 h-24 rounded-full"
            />
            <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full">
              <FontAwesomeIcon icon={faCamera} size={14} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        <Text className="text-xl font-bold mt-4">{user.name}</Text>
        <Text className="text-gray-600 mt-1">{user.email || user.phone}</Text>

        <TouchableOpacity
          className="mt-6 bg-blue-500 px-6 py-2 rounded-full"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white font-medium">Chỉnh sửa thông tin</Text>
        </TouchableOpacity>
      </View>


      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] p-4 rounded-xl">
            <Text className="text-lg font-semibold text-center mb-4">Chỉnh sửa thông tin</Text>

            <TouchableOpacity className="items-center mb-4" onPress={pickNewAvatar}>
              <Image
                source={{
                  uri: newAvatarUri ? newAvatarUri.uri : (user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`)
                }}
                className="w-24 h-24 rounded-full"
              />
              <Text className="text-blue-500 text-sm mt-2">Chọn ảnh mới</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Tên người dùng"
              className="border border-gray-300 rounded px-3 py-2 mb-4"
              value={editName}
              onChangeText={setEditName}
              style={{ outline: "none" }}
            />

            <View className="flex-row justify-end">
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  setNewAvatarUri(null);
                }}
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
