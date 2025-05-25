import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines?sources=techcrunch&apiKey=4a969bca8e3d42ccad71c8f3531d32a0';

const ExploreScreen = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch(NEWS_API_URL);
        const data = await response.json();
        if (data.status === 'ok') {
          setArticles(data.articles);
        } else {
          setError('Không thể tải dữ liệu.');
        }
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const openArticle = (url) => {
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0068FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      <View className="flex-1 bg-gray-100">
        <View className="bg-[#0068FF] px-4 py-4">
          <Text className="text-2xl font-bold text-white">Tin Công Nghệ</Text>
        </View>
        <ScrollView className="flex-1 px-4 py-4">
          {loading && (
            <View className="items-center justify-center mt-10">
              <ActivityIndicator size="large" color="#1976F0" />
              <Text className="mt-2 text-gray-500">Đang tải tin tức...</Text>
            </View>
          )}
          {error && (
            <View className="items-center justify-center mt-10">
              <Text className="text-red-500">{error}</Text>
            </View>
          )}
          {!loading && !error && articles.length === 0 && (
            <View className="items-center justify-center mt-10">
              <Text className="text-gray-500">Không có bài báo nào.</Text>
            </View>
          )}
          {!loading && !error && articles.map((item, idx) => (
            <TouchableOpacity
              key={item.url || idx}
              className="bg-white rounded-xl overflow-hidden mb-4 shadow"
              activeOpacity={0.8}
              onPress={() => openArticle(item.url)}
            >
              {item.urlToImage && (
                <Image
                  source={{ uri: item.urlToImage }}
                  className="w-full h-44"
                  resizeMode="cover"
                />
              )}
              <View className="p-3">
                <Text className="text-base font-bold mb-1">{item.title}</Text>
                <Text className="text-sm text-gray-600 mb-2" numberOfLines={3}>{item.description}</Text>
                <Text className="text-xs text-gray-400">{new Date(item.publishedAt).toLocaleString('vi-VN')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ExploreScreen;
