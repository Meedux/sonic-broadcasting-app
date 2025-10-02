import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const [pulseValue] = useState(new Animated.Value(1));

  React.useEffect(() => {
    // Pulsing animation for the main button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseValue]);

  const handleStartStreaming = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to connect screen after animation
    setTimeout(() => {
      navigation.navigate('Connect');
    }, 200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>📡</Text>
          </View>
          <Text style={styles.appTitle}>Sonic Broadcaster</Text>
          <Text style={styles.appSubtitle}>Professional Live Streaming</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Ready to Go Live?</Text>
          <Text style={styles.welcomeSubtitle}>
            Connect to your desktop and start broadcasting professional live streams
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔗</Text>
            <Text style={styles.featureText}>Connect to Desktop</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Mobile Camera Integration</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎥</Text>
            <Text style={styles.featureText}>Live Stream Preview</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Animated.View 
          style={[
            styles.startButtonContainer,
            {
              transform: [
                { scale: scaleValue },
                { scale: pulseValue }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartStreaming}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start Streaming</Text>
            <Text style={styles.startButtonIcon}>▶️</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={styles.footerText}>
          Tap to connect with your desktop streaming setup
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  logoText: {
    fontSize: 35,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#00D4FF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  welcomeContainer: {
    marginBottom: 50,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  startButtonContainer: {
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.7,
    shadowColor: '#00D4FF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A0A0A',
    marginRight: 10,
  },
  startButtonIcon: {
    fontSize: 18,
  },
  footerText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
});

export default HomeScreen;