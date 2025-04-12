import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faGear } from "@fortawesome/free-solid-svg-icons";
import { useSelector, useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { setUser } from "../redux/userSlice";

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setNewAvatarUri(result.assets[0].uri);
    }
  };

  const handleUpdateUser = async () => {
    if (!editData.name.trim()) return;

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("name", editData.name);

      if (newAvatarUri) {
        const filename = newAvatarUri.split("/").pop();
        const type = filename.split(".").pop();
        formData.append("avatar", {
          uri: newAvatarUri,
          name: filename,
          type: `image/${type}`,
        });
      }

      const res = await axios.post("http://localhost:5000/api/update-user", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setUserInfo(res.data.data);
      dispatch(setUser(res.data.data));
      setModalVisible(false);
    } catch (err) {
      console.error("Update failed:", err.message);
    } finally {
      setUpdating(false);
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
                  uri: newAvatarUri || editData.profilePic,
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
