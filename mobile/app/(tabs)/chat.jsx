import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faInfoCircle, faMagnifyingGlass, faPlus, faQrcode} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import RightSidebar from "../../components/RightSidebar";

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState("Thông tin hội thoại");
  const [photoVideoMessages, setPhotoVideoMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [linkMessages, setLinkMessages] = useState([]);
  
  const user = useSelector((state) => state.user);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/api/conversations", {
        withCredentials: true,
      });
      setConversations(response.data.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    // Fetch media, files, and links for the selected conversation
    try {
      // This is a placeholder - you would need to implement these API endpoints
      const mediaResponse = await axios.get(`http://localhost:5000/api/conversations/${conversation._id}/media`, {
        withCredentials: true,
      });
      setPhotoVideoMessages(mediaResponse.data.data || []);
      
      const filesResponse = await axios.get(`http://localhost:5000/api/conversations/${conversation._id}/files`, {
        withCredentials: true,
      });
      setFileMessages(filesResponse.data.data || []);
      
      const linksResponse = await axios.get(`http://localhost:5000/api/conversations/${conversation._id}/links`, {
        withCredentials: true,
      });
      setLinkMessages(linksResponse.data.data || []);
    } catch (error) {
      console.error("Error fetching conversation media:", error);
      // Set empty arrays as fallback
      setPhotoVideoMessages([]);
      setFileMessages([]);
      setLinkMessages([]);
    }
  };

  const handleAddMember = () => {
    // Implement add member functionality
    console.log("Add member to group:", selectedConversation?._id);
  };

  const handleLeaveGroup = async () => {
    try {
      await axios.post(`http://localhost:5000/api/conversations/${selectedConversation._id}/leave`, {}, {
        withCredentials: true,
      });
      // Refresh conversations after leaving
      fetchConversations();
      setSelectedConversation(null);
      setShowSidebar(false);
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const handleDeleteConversation = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/conversations/${selectedConversation._id}`, {
        withCredentials: true,
      });
      // Refresh conversations after deletion
      fetchConversations();
      setSelectedConversation(null);
      setShowSidebar(false);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    try {
      await axios.post(`http://localhost:5000/api/conversations/${selectedConversation._id}/remove-member`, {
        memberId
      }, {
        withCredentials: true,
      });
      // Update the selected conversation to reflect member removal
      setSelectedConversation(prev => ({
        ...prev,
        members: prev.members.filter(member => member._id !== memberId)
      }));
    } catch (error) {
      console.error(`Error removing member ${memberName}:`, error);
    }
  };

  const renderConversationItem = ({ item }) => {
    return (
      <TouchableOpacity 
        className="flex-row items-center p-4 border-b border-gray-200"
        onPress={() => handleSelectConversation(item)}
      >
        <View className="h-12 w-12 rounded-full bg-gray-300 mr-3 overflow-hidden">
          {item.profilePic && (
            <Image source={{ uri: item.profilePic }} className="h-full w-full" />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-base">{item.name}</Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {item.latestMessage?.text || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
        <View className="flex-row items-center bg-white rounded-full px-3 py-1 flex-1 mr-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
          <TextInput
            placeholder="Tìm kiếm"
            className="ml-2 flex-1 text-sm"
            placeholderTextColor="#888"
            style={{ outline: "none" }}
          />
        </View>
        <TouchableOpacity className="mx-1">
          <FontAwesomeIcon icon={faQrcode} size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="ml-1">
          <FontAwesomeIcon icon={faPlus} size={18} color="white" />
        </TouchableOpacity>
      </View>
      {selectedConversation ? (
        <View className="flex-1 flex-row">
          {/* Chat area */}
          <View className="flex-1">
            <View className="h-16 flex-row items-center justify-between px-4 border-b border-gray-200">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => setSelectedConversation(null)}>
                  <Text className="text-blue-500 mr-3">Back</Text>
                </TouchableOpacity>
                <Text className="font-semibold text-lg">{selectedConversation.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)}>
                <FontAwesomeIcon icon={faInfoCircle} size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-1 p-4">
              <Text>Chat messages will appear here</Text>
            </View>
          </View>
          
          {/* Right sidebar */}
          {showSidebar && (
            <RightSidebar
              isVisible={showSidebar}
              dataUser={selectedConversation}
              user={user}
              photoVideoMessages={photoVideoMessages}
              fileMessages={fileMessages}
              linkMessages={linkMessages}
              onAddMember={handleAddMember}
              onLeaveGroup={handleLeaveGroup}
              onDeleteConversation={handleDeleteConversation}
              onRemoveMember={handleRemoveMember}
              showContextMenu={showContextMenu}
              setShowContextMenu={setShowContextMenu}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-4">
              <Text className="text-gray-500">
                {loading ? "Loading conversations..." : "No conversations found"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
