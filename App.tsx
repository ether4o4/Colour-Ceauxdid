import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Navigation from './src/navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [showBootSplash, setShowBootSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBootSplash(false);
      SplashScreen.hideAsync().catch(() => {});
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <Navigation />
      {showBootSplash && (
        <View style={styles.bootSplash} pointerEvents="none">
          <Image
            source={require('./assets/splash.png')}
            style={styles.bootSplashImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  bootSplash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000',
  },
  bootSplashImage: {
    width: '100%',
    height: '100%',
  },
});
