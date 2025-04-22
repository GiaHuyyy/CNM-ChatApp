import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faSearch, 
  faQrcode, 
  faGamepad, 
  faStore, 
  faNewspaper, 
  faVideo, 
  faMusic, 
  faCalendar,
  faAngleRight,
  faWallet,
  faGift,
  faShoppingBag,
  faTicket,
  faPlane,
  faHotel,
  faBus,
  faTaxi,
  faUtensils,
  faFilm,
  faMoneyBill
} from '@fortawesome/free-solid-svg-icons';

// Dữ liệu mẫu cho các danh mục chính
const mainCategories = [
  {
    id: '1',
    name: 'Ví QR',
    icon: faWallet,
    color: '#1976F0',
    description: 'Thanh toán QR nhanh chóng'
  },
  {
    id: '2',
    name: 'Quà tặng',
    icon: faGift,
    color: '#FF2D55',
    description: 'Tặng quà cho bạn bè'
  },
  {
    id: '3',
    name: 'Mua sắm',
    icon: faShoppingBag,
    color: '#FF9500',
    description: 'Khám phá deal hot'
  },
  {
    id: '4',
    name: 'Vé & Dịch vụ',
    icon: faTicket,
    color: '#00B14F',
    description: 'Đặt vé và dịch vụ'
  }
];

// Dữ liệu mẫu cho các dịch vụ
const services = [
  { id: '1', name: 'Máy bay', icon: faPlane, color: '#1976F0' },
  { id: '2', name: 'Khách sạn', icon: faHotel, color: '#FF9500' },
  { id: '3', name: 'Xe khách', icon: faBus, color: '#00B14F' },
  { id: '4', name: 'Taxi', icon: faTaxi, color: '#FF2D55' },
  { id: '5', name: 'Đồ ăn', icon: faUtensils, color: '#FF9500' },
  { id: '6', name: 'Rạp phim', icon: faFilm, color: '#1976F0' },
  { id: '7', name: 'Nạp tiền', icon: faMoneyBill, color: '#00B14F' },
  { id: '8', name: 'Game', icon: faGamepad, color: '#FF2D55' }
];

// Dữ liệu mẫu cho các tin tức
const news = [
  {
    id: '1',
    title: 'Ưu đãi thanh toán QR',
    description: 'Giảm ngay 50% tối đa 100k khi thanh toán QR lần đầu',
    image: 'https://via.placeholder.com/300x200',
    time: '2 giờ trước'
  },
  {
    id: '2',
    title: 'Deal hot cuối tuần',
    description: 'Săn deal giảm giá cùng ZaloPay',
    image: 'https://via.placeholder.com/300x200',
    time: '1 ngày trước'
  }
];

const ExploreScreen = () => {
  const renderMainCategory = ({ item }) => (
    <TouchableOpacity className="flex-1 bg-white p-4 rounded-xl mr-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className={`w-12 h-12 rounded-xl items-center justify-center`} style={{ backgroundColor: `${item.color}20` }}>
          <FontAwesomeIcon icon={item.icon} size={24} color={item.color} />
        </View>
        <FontAwesomeIcon icon={faAngleRight} size={16} color="#666" />
      </View>
      <Text className="text-base font-semibold mt-2">{item.name}</Text>
      <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>
    </TouchableOpacity>
  );

  const renderService = ({ item }) => (
    <TouchableOpacity className="items-center w-1/4 mb-6">
      <View className={`w-14 h-14 rounded-xl items-center justify-center mb-2`} style={{ backgroundColor: `${item.color}15` }}>
        <FontAwesomeIcon icon={item.icon} size={24} color={item.color} />
      </View>
      <Text className="text-xs text-center">{item.name}</Text>
    </TouchableOpacity>
  );

  const renderNews = ({ item }) => (
    <TouchableOpacity className="bg-white rounded-xl overflow-hidden mb-4">
      <Image
        source={{ uri: item.image }}
        className="w-full h-40"
        resizeMode="cover"
      />
      <View className="p-3">
        <Text className="text-base font-semibold mb-1">{item.title}</Text>
        <Text className="text-sm text-gray-600 mb-2">{item.description}</Text>
        <Text className="text-xs text-gray-500">{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

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
            <FontAwesomeIcon icon={faQrcode} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Categories */}
        <View className="px-4 py-4">
          <View className="flex-row">
            <FlatList
              data={mainCategories.slice(0, 2)}
              renderItem={renderMainCategory}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
          <View className="flex-row mt-3">
            <FlatList
              data={mainCategories.slice(2, 4)}
              renderItem={renderMainCategory}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </View>

        {/* Services */}
        <View className="bg-white px-4 py-6 mb-2">
          <Text className="text-lg font-bold mb-4">Dịch vụ</Text>
          <View className="flex-row flex-wrap">
            {services.map((item) => (
              <View key={item.id} style={{ width: '25%' }}>
                {renderService({ item })}
              </View>
            ))}
          </View>
        </View>

        {/* News */}
        <View className="px-4 py-4">
          <Text className="text-lg font-bold mb-4">Khám phá</Text>
          <FlatList
            data={news}
            renderItem={renderNews}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default ExploreScreen;
