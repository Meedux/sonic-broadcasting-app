import React from 'react'
import { StatusBar, StyleSheet } from 'react-native'
import { MainScreen } from './src/screens/MainScreen'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <MainScreen />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0f',
  },
});
