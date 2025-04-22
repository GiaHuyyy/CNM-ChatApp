import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faSearch,
  faGear,
  faCamera,
  faCloud,
  faWrench,
  faLock,
  faShieldAlt,
  faQrcode,
  faAngleRight,
  faImage,
  faCloudArrowUp,
  faClock,
  faDatabase,
  faUserShield,
  faSignOut
} from "@fortawesome/free-solid-svg-icons";
import { useSelector, useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { setUser, setToken } from "../redux/userSlice";
import uploadFileToCloud from "../../helpers/uploadFileToCloud";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useGlobalContext } from "../context/GlobalProvider";
import ConfirmationModal from "../../components/ConfirmationModal";
import { useRouter } from "expo-router";

// Dữ liệu mẫu cho các menu items
const menuItems = [
  {
    id: 'zcloud',
    icon: faCloud,
    title: 'zCloud',
    description: 'Không gian lưu trữ dữ liệu trên đám mây',
    hasArrow: true
  },
  {
    id: 'zstyle',
    icon: faWrench,
    title: 'zStyle - Nổi bật trên Zalo',
    description: 'Hình nền và nhạc cho cuộc gọi Zalo',
    hasArrow: false
  },
  {
    id: 'mycloud',
    icon: faCloudArrowUp,
    title: 'Cloud của tôi',
    description: 'Lưu trữ các tin nhắn quan trọng',
    hasArrow: true
  },
  {
    id: 'devicedata',
    icon: faDatabase,
    title: 'Dữ liệu trên máy',
    description: 'Quản lý dữ liệu Zalo của bạn',
    hasArrow: true
  },
  {
    id: 'qr',
    icon: faQrcode,
    title: 'Ví QR',
    description: 'Lưu trữ và xuất trình các mã QR quan trọng',
    hasArrow: false
  },
  {
    id: 'security',
    icon: faUserShield,
    title: 'Tài khoản và bảo mật',
    description: '',
    hasArrow: true
  },
  {
    id: 'privacy',
    icon: faLock,
    title: 'Quyền riêng tư',
    description: '',
    hasArrow: true
  },
  // Add the logout item
  {
    id: 'logout',
    icon: faSignOut,
    title: 'Đăng xuất',
    description: 'Đăng xuất khỏi tài khoản',
    hasArrow: false,
    danger: true
  }
];

export default function Profile() {
  const dispatch = useDispatch();
  const router = useRouter(); // Use router instead of navigation
  const navigation = useNavigation(); // Keep this for other navigation needs if any
  const { socketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);
  const token = useSelector((state) => state.user.token);

  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [newAvatarUri, setNewAvatarUri] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);

      // Store user ID locally before the state gets wiped out
      const userId = user?._id;

      // Disconnect socket if connected
      if (socketConnection) {
        socketConnection.disconnect();
      }

      // Call the logout API
      await axios.get("http://localhost:5000/api/logout", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Clear local storage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("refreshToken");
      await AsyncStorage.removeItem("cachedConversations");
      await AsyncStorage.removeItem("lastSelectedChat");

      // Clear Redux state
      dispatch(setToken(null));

      // Use router.replace instead of navigation.navigate
      setTimeout(() => {
        router.replace("/(auth)/sign-in");
      }, 100);
    } catch (error) {
      console.error("Logout error:", error);
      setErrorMessage("Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.");
      setErrorModalVisible(true);
    } finally {
      setLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      className={`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}
      onPress={() => {
        if (item.id === 'logout') {
          handleLogout();
        }
      }}
    >
      <View className={`w-10 h-10 rounded-full ${item.danger ? 'bg-red-100' : 'bg-blue-100'} items-center justify-center`}>
        <FontAwesomeIcon icon={item.icon} size={20} color={item.danger ? "#FF3B30" : "#0068FF"} />
      </View>
      <View className="flex-1 ml-3">
        <Text className={`text-[15px] font-medium ${item.danger ? 'text-red-600' : ''}`}>{item.title}</Text>
        {item.description && (
          <Text className="text-gray-500 text-sm mt-0.5">{item.description}</Text>
        )}
      </View>
      {item.hasArrow && (
        <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  if (!user._id) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4">Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-[#0068FF] px-4 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center bg-[#1976F0] rounded-full px-3 py-2">
              <FontAwesomeIcon icon={faSearch} size={16} color="#fff" />
              <Text className="ml-2 text-white/80">Tìm kiếm</Text>
            </View>
          </View>
          <TouchableOpacity className="ml-3">
            <FontAwesomeIcon icon={faGear} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView>
        {/* Profile Section */}
        <TouchableOpacity
          className="flex-row items-center px-4 py-4 bg-white mb-2"
          onPress={() => setModalVisible(true)}
        >
          <Image
            source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }}
            className="w-16 h-16 rounded-full"
          />
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold">{user.name}</Text>
            <Text className="text-gray-500 mt-1">Xem trang cá nhân</Text>
          </View>
          <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
        </TouchableOpacity>

        {/* New Feature Banner */}
        <TouchableOpacity className="bg-white px-4 py-3 mb-2 flex-row items-center">
          <Image
            source={{ uri: 'https://via.placeholder.com/50' }}
            className="w-12 h-12 rounded-lg"
          />
          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold">Trang trí ảnh đại diện</Text>
              <View className="bg-green-500 rounded px-2 py-0.5 ml-2">
                <Text className="text-white text-xs">Mới</Text>
              </View>
            </View>
            <Text className="text-blue-500">Kho khung ảnh zStyle đa dạng</Text>
          </View>
          <FontAwesomeIcon icon={faAngleRight} size={20} color="#666" />
        </TouchableOpacity>

        {/* Menu Items */}
        <View className="mb-2">
          {menuItems.map(renderMenuItem)}
        </View>

        {/* Version Info */}
        <View className="items-center py-4">
          <Text className="text-gray-500 text-sm">Phiên bản 23.12.01</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] p-4 rounded-xl">
            <Text className="text-lg font-semibold text-center mb-4">
              Chỉnh sửa thông tin
            </Text>

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

      {/* Loading indicator for logout */}
      {loggingOut && (
        <View className="absolute inset-0 flex-1 bg-black/30 justify-center items-center">
          <View className="bg-white p-4 rounded-xl items-center">
            <ActivityIndicator size="large" color="#0068FF" />
            <Text className="mt-2 font-medium">Đang đăng xuất...</Text>
          </View>
        </View>
      )}

      {/* Add the ConfirmationModal for logout */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="Đăng xuất"
        message="Bạn có chắc muốn đăng xuất khỏi tài khoản?"
        onConfirm={performLogout}
        onCancel={() => setLogoutModalVisible(false)}
        type="warning"
      />

      {/* Add Error Modal */}
      <ConfirmationModal
        visible={errorModalVisible}
        title="Lỗi đăng xuất"
        message={errorMessage}
        onConfirm={() => setErrorModalVisible(false)}
        onCancel={() => setErrorModalVisible(false)}
        type="danger"
      />
    </View>
  );
}
