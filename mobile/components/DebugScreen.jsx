import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Platform } from 'react-native';

const DebugScreen = ({ visible, onClose }) => {
  useEffect(() => {
    console.log("Debug screen mounted");
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Information</Text>
        <Button title="Close" onPress={onClose} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
          <Text style={styles.infoText}>Version: {Platform.Version}</Text>
          <Text style={styles.infoText}>Is Expo: {true ? 'Yes' : 'No'}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Dimensions</Text>
          <Text style={styles.infoText}>Width: {Dimensions.get('window').width}</Text>
          <Text style={styles.infoText}>Height: {Dimensions.get('window').height}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Component Status</Text>
          <Text style={styles.infoText}>DebugScreen: Loaded</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#444',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
});

export default DebugScreen;
