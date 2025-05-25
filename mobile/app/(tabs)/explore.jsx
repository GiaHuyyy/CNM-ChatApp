import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOPICS = [
  { key: 'techcrunch', label: 'TechCrunch', url: 'https://newsapi.org/v2/top-headlines?sources=techcrunch&apiKey=4a969bca8e3d42ccad71c8f3531d32a0' },
  { key: 'business', label: 'Kinh doanh', url: 'https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=4a969bca8e3d42ccad71c8f3531d32a0' },
  { key: 'technology', label: 'Công nghệ', url: 'https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=4a969bca8e3d42ccad71c8f3531d32a0' },
  { key: 'tesla', label: 'Tesla', url: 'https://newsapi.org/v2/everything?q=tesla&from=2025-04-25&sortBy=publishedAt&apiKey=4a969bca8e3d42ccad71c8f3531d32a0' },
];

const ExploreScreen = () => {
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0].key);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async (topicKey) => {
    const topic = TOPICS.find(t => t.key === topicKey);
    if (!topic) return;
    try {
      setLoading(true);
      setError(null);
      setArticles([]);
      const response = await fetch(topic.url);
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

  useEffect(() => {
    fetchNews(selectedTopic);
  }, [selectedTopic]);

  const openArticle = (url) => {
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0068FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      <View className="flex-1 bg-gray-100">
        <View className="bg-[#0068FF] px-4 py-4">
          <Text className="text-2xl font-bold text-white mb-2">Tin Tức</Text>
          <View className="flex-row mt-2">
            {TOPICS.map(topic => (
              <TouchableOpacity
                key={topic.key}
                className={`px-4 py-2 mr-2 rounded-full ${selectedTopic === topic.key ? 'bg-white' : 'bg-[#1976F0]'}`}
                style={{ borderWidth: selectedTopic === topic.key ? 1 : 0, borderColor: '#1976F0' }}
                onPress={() => setSelectedTopic(topic.key)}
              >
                <Text className={`font-semibold ${selectedTopic === topic.key ? 'text-[#1976F0]' : 'text-white'}`}>{topic.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
                <Text className="text-xs text-gray-400">{item.publishedAt ? new Date(item.publishedAt).toLocaleString('vi-VN') : ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ExploreScreen;
