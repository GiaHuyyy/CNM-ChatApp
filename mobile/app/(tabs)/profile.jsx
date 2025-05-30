import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Pressable, ActivityIndicator, Platform, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
import { useGlobalContext } from "../context/GlobalProvider";
import ConfirmationModal from "../../components/ConfirmationModal";
import { router } from "expo-router";
import { REACT_APP_BACKEND_URL } from "@env";

// Dữ liệu mẫu cho các menu items
const menuItems = [
  // Bỏ các mục: zcloud, zstyle, mycloud, privacy, qr
  {
    id: 'devicedata',
    icon: faDatabase,
    title: 'Dữ liệu trên máy',
    description: 'Quản lý dữ liệu Zalo của bạn',
    hasArrow: true
  },
  {
    id: 'security',
    icon: faUserShield,
    title: 'Tài khoản và bảo mật',
    description: '',
    hasArrow: true
  },
  // Logout item giữ nguyên
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
  const [deviceFiles, setDeviceFiles] = useState([]);
  const [deviceFilesModal, setDeviceFilesModal] = useState(false);
  const [deviceFilesLoading, setDeviceFilesLoading] = useState(false);

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

        console.log("Uploading avatar to cloud...");
        const uploadResult = await uploadFileToCloud(file);
        if (uploadResult && uploadResult.secure_url) {
          avatarUrl = uploadResult.secure_url;
          console.log("Avatar uploaded successfully:", avatarUrl);
        }
      }

      console.log("Sending update request to server");
      console.log("Current user state:", user);
      console.log("Token:", token ? token.substring(0, 15) + "..." : "Missing");
      console.log("New name:", editName);
      
      // Update user via API with explicit JSON content type
      const updateUserResponse = await axios({
        method: 'post',
        url: `${REACT_APP_BACKEND_URL}/api/update-user`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          name: editName,
          profilePic: avatarUrl,
        })
      });

      console.log("Server response:", updateUserResponse.data);

      if (updateUserResponse.data && updateUserResponse.data.success) {
        const serverUpdatedUser = updateUserResponse.data.data;
        console.log("User updated on server:", serverUpdatedUser);
        
        // Force the new name to be included in the updated user data
        const updatedUserData = {
          ...user,
          ...serverUpdatedUser,
          name: editName // Ensure name is explicitly set
        };
        
        console.log("Final Redux update payload:", updatedUserData);
        
        // Update Redux store
        dispatch(setUser(updatedUserData));
        
        // Update AsyncStorage
        try {
          // Get current stored user data first
          const storedUserData = await AsyncStorage.getItem("user");
          let userData = storedUserData ? JSON.parse(storedUserData) : {};
          
          // Update with new values
          userData = {
            ...userData,
            ...updatedUserData
          };
          
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          console.log("Updated AsyncStorage user data");
        } catch (storageError) {
          console.error("AsyncStorage update failed:", storageError);
        }

        alert("Thông tin đã được cập nhật thành công");
        
        // Reset state and close modal
        setNewAvatarUri(null);
        setModalVisible(false);
        
        // Force a re-render by updating a dummy state
        setUpdating(true);
        setTimeout(() => setUpdating(false), 50);
      } else {
        console.error("Update failed with response:", updateUserResponse.data);
        alert(updateUserResponse.data?.message || "Không thể cập nhật thông tin. Vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      
      // Show more detailed error information
      let errorMessage = "Không thể cập nhật thông tin. ";
      
      if (err.response) {
        errorMessage += err.response.data?.message || `Error ${err.response.status}: ${err.response.statusText}`;
      } else if (err.request) {
        errorMessage += "Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối mạng.";
      } else {
        errorMessage += err.message;
      }
      
      alert(errorMessage);
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
      await axios.get(`${REACT_APP_BACKEND_URL}/api/logout`, {
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

  const openDeviceData = async () => {
    setDeviceFilesModal(true);
    setDeviceFilesLoading(true);
    try {
      const folderName = 'ChatNowData';
      const folderPath = FileSystem.documentDirectory + folderName + '/';
      // Kiểm tra và tạo thư mục nếu chưa tồn tại
      const folderInfo = await FileSystem.getInfoAsync(folderPath);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      }
      // Đọc file trong thư mục ChatNowData
      const files = await FileSystem.readDirectoryAsync(folderPath);
      setDeviceFiles(files.length > 0 ? files : ['Không có tệp nào trong ChatNowData.']);
    } catch (err) {
      setDeviceFiles(['Không thể truy cập hoặc tạo thư mục ChatNowData.']);
    } finally {
      setDeviceFilesLoading(false);
    }
  };

  const handleShareFile = async (fileName) => {
    try {
      const folderName = 'ChatNowData';
      const folderPath = FileSystem.documentDirectory + folderName + '/';
      const fileUri = folderPath + fileName;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert('Không thể chia sẻ file này trên thiết bị của bạn.');
      }
    } catch (err) {
      alert('Có lỗi khi chia sẻ file.');
    }
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      className={`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}
      onPress={() => {
        if (item.id === 'logout') {
          handleLogout();
        } else if (item.id === 'devicedata') {
          openDeviceData();
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

  // if (!user._id) {
  //   return (
  //     <View className="flex-1 justify-center items-center">
  //       <ActivityIndicator size="large" color="#0000ff" />
  //       <Text className="mt-4">Đang tải thông tin...</Text>
  //     </View>
  //   );
  // }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0068FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      <View className="flex-1 bg-gray-100">
        {/* Header */}
        <View className="bg-[#0068FF] px-4 pb-4">
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

        {/* Device Files Modal */}
        <Modal visible={deviceFilesModal} animationType="slide" transparent onRequestClose={() => setDeviceFilesModal(false)}>
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white w-[90%] max-h-[70%] p-4 rounded-xl">
              <Text className="text-lg font-semibold text-center mb-4">Dữ liệu trong ChatNowData</Text>
              {deviceFilesLoading ? (
                <ActivityIndicator size="large" color="#1976F0" />
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  {deviceFiles.length === 0 ? (
                    <Text className="text-gray-500 text-center">Không có tệp nào.</Text>
                  ) : (
                    deviceFiles.map((file, idx) => (
                      file.startsWith('Không') ? (
                        <Text key={idx} className="text-base mb-2 text-red-500">{file}</Text>
                      ) : (
                        <Pressable key={idx} onPress={() => handleShareFile(file)}>
                          <Text className="text-base mb-2 text-blue-700 underline">{file}</Text>
                        </Pressable>
                      )
                    ))
                  )}
                </ScrollView>
              )}
              <Pressable onPress={() => setDeviceFilesModal(false)} className="mt-4 px-4 py-2 rounded bg-blue-500 self-center">
                <Text className="text-white font-semibold">Đóng</Text>
              </Pressable>
              <Text className="text-xs text-gray-400 mt-2 text-center">Chạm vào tên file để chia sẻ hoặc lưu ra ngoài (hỗ trợ cả iOS & Android)</Text>
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
    </SafeAreaView>
  );
}
