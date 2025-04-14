import React, { useEffect, useState } from "react";
import { View, TextInput, TouchableOpacity, FlatList, Text, Image } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass, faPlus, faQrcode, faTimes, faHistory, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useGlobalContext } from "../context/GlobalProvider";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnlineUser } from "../redux/userSlice";
import axios from "axios";

export default function Chat() {
  const dispatch = useDispatch();
  const { setSocketConnection } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const socketConnection = io('http://localhost:5000', {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketConnection.on("connect", () => {
          console.log("🔌 Socket connected: ", socketConnection.id);
        });

        socketConnection.on("onlineUser", (data) => {
          console.log("🟢 Online users: ", data);
          dispatch(setOnlineUser(data));
        });

        setSocketConnection(socketConnection);

        return () => {
          console.log("❌ Disconnecting socket");
          socketConnection.disconnect();
        };
      } catch (err) {
        console.log("Socket connection error:", err);
      }
    };

    connectSocket();
  }, [dispatch, setSocketConnection]);

  useEffect(() => {
    const fetchFriendRequestsCount = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/pending-friend-requests`,
          { withCredentials: true }
        );
        setFriendRequestsCount(response.data.data.length);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchFriendRequestsCount();
    
    const interval = setInterval(fetchFriendRequestsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const savedSearches = await AsyncStorage.getItem('recentSearches');
        if (savedSearches) {
          setRecentSearches(JSON.parse(savedSearches));
        }
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    };
    
    loadRecentSearches();
  }, []);

  const saveToRecentSearches = async (query, result = null) => {
    try {
      if (!query.trim()) return;
      
      const searchItem = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        firstResult: result ? {
          id: result._id || result.id,
          name: result.name,
          profilePic: result.profilePic || result.avatar,
          isGroup: !!result.isGroup
        } : null
      };
      
      const updatedSearches = [searchItem, ...recentSearches.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase()
      )].slice(0, 10);
      
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const clearAllRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem('recentSearches');
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  const removeSearchItem = async (id) => {
    try {
      const updatedSearches = recentSearches.filter(item => item.id !== id);
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error("Error removing search item:", error);
    }
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        if (!searchQuery.trim()) {
          setSearchResults([]);
          return;
        }

        setSearchLoading(true);
        setIsSearching(true);

        setTimeout(async () => {
          try {
            const response = await axios.post(
              "http://localhost:5000/api/search-friend-user",
              { search: searchQuery },
              { withCredentials: true }
            );

            console.log("Search results:", {
              total: response?.data?.data?.length || 0,
              users: response?.data?.data?.filter((r) => !r.isGroup)?.length || 0,
              groups: response?.data?.data?.filter((r) => r.isGroup)?.length || 0,
              results: response?.data?.data,
            });

            const results = response?.data?.data || [];
            setSearchResults(results);
            
            if (results.length > 0) {
              saveToRecentSearches(searchQuery, results[0]);
            }
          } catch (error) {
            console.error("Search error:", error.response?.data || error);
            setSearchResults([]);
          } finally {
            setSearchLoading(false);
            setIsSearching(false);
          }
        }, 600);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setSearchLoading(false);
        setIsSearching(false);
      }
    };
    
    fetchSearchResults();
  }, [searchQuery]);

  const searchFromHistory = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      className="flex-row items-center p-3 border-b border-gray-100"
      onPress={() => {
        console.log("Selected:", item);
        clearSearch();
      }}
    >
      {item.profilePic || item.avatar ? (
        <Image source={{ uri: item.profilePic || item.avatar }} className="w-10 h-10 rounded-full" />
      ) : (
        <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
          <Text className="text-white font-bold">{(item.name || "")?.charAt(0)?.toUpperCase()}</Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="font-medium">{item.name}</Text>
        <Text className="text-gray-500 text-sm">
          {item.isGroup ? "Nhóm" : (item.email || item.status || "Offline")}
        </Text>
      </View>
      {item.isGroup && (
        <View className="bg-blue-500 h-5 w-5 rounded-full items-center justify-center">
          <Text className="text-white text-xs">G</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-10 pb-3 bg-blue-500">
        <View className="flex-row items-center bg-white rounded-full px-3 py-1 flex-1 mr-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#888" />
          <TextInput
            placeholder="Tìm kiếm"
            className="ml-2 flex-1 text-sm"
            placeholderTextColor="#888"
            style={{ outline: "none" }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <FontAwesomeIcon icon={faTimes} size={16} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity className="mx-1">
          <FontAwesomeIcon icon={faQrcode} size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="ml-1">
          <FontAwesomeIcon icon={faPlus} size={18} color="white" />
          {friendRequestsCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
              <Text className="text-white text-xs font-bold">{friendRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isSearchFocused && searchQuery.length === 0 && recentSearches.length > 0 && (
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center py-2 px-4 bg-gray-100">
            <Text className="text-gray-600 font-medium">Liên hệ đã tìm</Text>
            <TouchableOpacity onPress={clearAllRecentSearches}>
              <FontAwesomeIcon icon={faTrash} size={16} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="flex-row items-center p-3 border-b border-gray-100 justify-between"
                onPress={() => searchFromHistory(item.query)}
              >
                <View className="flex-row items-center flex-1">
                  <FontAwesomeIcon icon={faHistory} size={16} color="#888" className="mr-3" />
                  
                  {item.firstResult ? (
                    <View className="flex-row items-center flex-1">
                      {item.firstResult.profilePic ? (
                        <Image source={{ uri: item.firstResult.profilePic }} className="w-8 h-8 rounded-full mr-3" />
                      ) : (
                        <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-3">
                          <Text className="text-white font-bold">{(item.firstResult.name || "")?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-gray-700">{item.query}</Text>
                        <Text className="text-sm text-gray-500">{item.firstResult.name}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-gray-700">{item.query}</Text>
                  )}
                </View>
                
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    removeSearchItem(item.id);
                  }}
                  className="px-2"
                >
                  <FontAwesomeIcon icon={faTimes} size={14} color="#888" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {searchResults.length > 0 && (
        <View className="flex-1 bg-white">
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
            ListHeaderComponent={() => (
              <View className="p-2 bg-gray-100">
                <Text className="text-gray-600">Kết quả tìm kiếm ({searchResults.length})</Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View className="p-4 items-center justify-center">
                <Text className="text-gray-500">
                  {searchLoading ? "Đang tìm kiếm..." : "Không tìm thấy kết quả"}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {searchLoading && !searchResults.length && (
        <View className="p-4 items-center justify-center">
          <Text className="text-gray-500">Đang tìm kiếm...</Text>
        </View>
      )}

      {!searchResults.length && !searchLoading && !isSearchFocused && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Danh sách chat sẽ hiển thị ở đây</Text>
        </View>
      )}
    </View>
  );
}