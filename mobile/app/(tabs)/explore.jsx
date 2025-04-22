import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faQrcode, faStar, faGift, faGamepad, faStore, faNewspaper, faVideo, faMusic, faCalendar } from '@fortawesome/free-solid-svg-icons';

// Dữ liệu mẫu cho các danh mục
const categories = [
  { id: '1', name: 'Zalo Pay', icon: faStar, color: '#0068FF' },
  { id: '2', name: 'Zalo Shop', icon: faStore, color: '#00B14F' },
  { id: '3', name: 'Zalo Game', icon: faGamepad, color: '#FF6B00' },
  { id: '4', name: 'Zalo News', icon: faNewspaper, color: '#FF0000' },
  { id: '5', name: 'Zalo Video', icon: faVideo, color: '#FF00FF' },
  { id: '6', name: 'Zalo Music', icon: faMusic, color: '#FF00FF' },
  { id: '7', name: 'Zalo Calendar', icon: faCalendar, color: '#FF6B00' },
  { id: '8', name: 'Zalo Gift', icon: faGift, color: '#FF0000' },
];

// Dữ liệu mẫu cho các bài viết
const posts = [
  {
    id: '1',
    title: 'Khám phá tính năng mới trên Zalo',
    description: 'Cập nhật những tính năng mới nhất giúp bạn trải nghiệm Zalo tốt hơn',
    image: 'https://via.placeholder.com/300x200',
    category: 'Tin tức',
    time: '2 giờ trước'
  },
  {
    id: '2',
    title: 'Ưu đãi đặc biệt từ Zalo Pay',
    description: 'Nhận ngay 50.000đ khi thanh toán bằng Zalo Pay',
    image: 'https://via.placeholder.com/300x200',
    category: 'Khuyến mãi',
    time: '1 ngày trước'
  },
  {
    id: '3',
    title: 'Game mới ra mắt trên Zalo',
    description: 'Trải nghiệm game mới với nhiều phần quà hấp dẫn',
    image: 'https://via.placeholder.com/300x200',
    category: 'Giải trí',
    time: '3 ngày trước'
  }
];

const ExploreScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('1');

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      className={`items-center mx-2 ${selectedCategory === item.id ? 'opacity-100' : 'opacity-70'}`}
      onPress={() => setSelectedCategory(item.id)}
    >
      <View className={`w-16 h-16 rounded-full items-center justify-center`} style={{ backgroundColor: item.color + '20' }}>
        <FontAwesomeIcon icon={item.icon} size={24} color={item.color} />
      </View>
      <Text className="text-xs mt-2 text-center" style={{ color: item.color }}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }) => (
    <TouchableOpacity className="bg-white rounded-lg overflow-hidden mb-4 mx-4 shadow-sm">
      <Image
        source={{ uri: item.image }}
        className="w-full h-40"
        resizeMode="cover"
      />
      <View className="p-3">
        <View className="flex-row items-center mb-2">
          <Text className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full mr-2">
            {item.category}
          </Text>
          <Text className="text-xs text-gray-500">{item.time}</Text>
        </View>
        <Text className="text-base font-semibold mb-1">{item.title}</Text>
        <Text className="text-sm text-gray-600">{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center">
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3 py-2">
          <FontAwesomeIcon icon={faSearch} size={16} color="#666" />
          <Text className="ml-2 text-gray-500">Tìm kiếm</Text>
        </View>
        <TouchableOpacity className="ml-3">
          <FontAwesomeIcon icon={faQrcode} size={24} color="#0068FF" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View className="bg-white py-4">
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        />
      </View>

      {/* Posts */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ExploreScreen;
