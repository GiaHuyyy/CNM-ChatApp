import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const MinimalTest = () => {
  const [count, setCount] = useState(0);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minimal Test Component</Text>
      <Text style={styles.subtitle}>If you can see this, basic rendering is working</Text>
      
      <Text style={styles.counter}>Count: {count}</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Increment" onPress={() => setCount(count + 1)} />
        <Button title="Reset" onPress={() => setCount(0)} />
      </View>
      
      <Text style={styles.info}>Platform: {Platform.OS}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#555',
  },
  counter: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  info: {
    marginTop: 20,
    color: '#888',
  },
});

export default MinimalTest;
