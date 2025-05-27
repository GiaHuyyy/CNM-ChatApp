import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import MinimalTest from '../components/MinimalTest';

export default function DebugScreen() {
  return (
    <View style={styles.container}>
      <MinimalTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
