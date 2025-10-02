import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { io } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

const ConnectScreen = ({ navigation }) => {
  const [roomId, setRoomId] = useState('');
  const [serverIP, setServerIP] = useState('192.168.100.6'); // Your computer's IP address
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [socket, setSocket] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fadeAnim, slideAnim, socket]);

  const connectToDesktop = async () => {
    if (!roomId.trim()) {
      Alert.alert('Error', 'Please enter a Room ID');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Get the local IP address - you'll need to replace this with your computer's IP
      // Find your IP by running 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
      const serverUrl = `http://${serverIP}:3000`;
      
      // Connect to the web app's socket server
      const newSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('waiting');
        
        // Join room as mobile client
        newSocket.emit('mobile-connect', { roomId: roomId.trim() });
      });

      newSocket.on('mobile-connected', () => {
        console.log('Mobile successfully joined room, waiting for web app...');
        setConnectionStatus('waiting');
      });

      newSocket.on('connection-established', (data) => {
        console.log('Connection established with web app:', data);
        setConnectionStatus('connected');
        setIsConnecting(false);
        
        // Store socket for later use
        setSocket(newSocket);
        
        Alert.alert(
          'Connected Successfully!', 
          'You are now connected to the desktop streaming app.',
          [
            {
              text: 'Continue to Setup',
              onPress: () => {
                navigation.navigate('Setup', { 
                  serverIP: serverIP,
                  roomId: roomId.trim(),
                  webId: data.webId 
                });
              }
            }
          ]
        );
      });

      newSocket.on('peer-disconnected', () => {
        setConnectionStatus('disconnected');
        setIsConnecting(false);
        Alert.alert('Disconnected', 'Lost connection to desktop app');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnecting(false);
        setConnectionStatus('error');
        Alert.alert(
          'Connection Failed', 
          'Could not connect to desktop app. Make sure:\n• The desktop app is running\n• You are on the same WiFi network\n• The server IP address is correct',
          [
            { text: 'Retry', onPress: () => setConnectionStatus('disconnected') },
            { text: 'OK' }
          ]
        );
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        setConnectionStatus('disconnected');
        setIsConnecting(false);
      });

    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setConnectionStatus('disconnected');
      Alert.alert('Error', 'Failed to connect to desktop app');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'waiting': return '#2196F3';
      default: return '#F44336';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected to Desktop';
      case 'connecting': return 'Connecting...';
      case 'waiting': return 'Waiting for Desktop App';
      default: return 'Not Connected';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Connect to Desktop</Text>
          <Text style={styles.subtitle}>
            Pair your mobile app with the desktop streaming software
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <View style={styles.connectionContainer}>
          <Text style={styles.label}>Server IP Address</Text>
          <Text style={styles.description}>
            Enter your computer&apos;s IP address (use &apos;ipconfig&apos; on Windows)
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={serverIP}
              onChangeText={setServerIP}
              placeholder="192.168.1.100"
              placeholderTextColor="#666666"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.label}>Room ID</Text>
          <Text style={styles.description}>
            Copy the Room ID from your desktop streaming app
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={roomId}
              onChangeText={setRoomId}
              placeholder="Enter Room ID from Desktop"
              placeholderTextColor="#666666"
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instruction}>1. Open the desktop streaming app</Text>
            <Text style={styles.instruction}>2. Copy the Room ID from the desktop app</Text>
            <Text style={styles.instruction}>3. Enter the Room ID above</Text>
            <Text style={styles.instruction}>4. Tap Connect to Desktop below</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectingButton]}
            onPress={connectToDesktop}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#0A0A0A" size="small" />
            ) : (
              <>
                <Text style={styles.connectButtonText}>Connect to Desktop</Text>
                <Text style={styles.connectButtonIcon}>🔗</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  connectionContainer: {
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  generateButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  generateButtonText: {
    fontSize: 20,
  },
  instructionsContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
    marginBottom: 15,
  },
  instruction: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    lineHeight: 20,
  },
  roomIdHighlight: {
    color: '#00D4FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.7,
    marginBottom: 20,
    shadowColor: '#00D4FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  connectingButton: {
    backgroundColor: '#666666',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A0A0A',
    marginRight: 10,
  },
  connectButtonIcon: {
    fontSize: 16,
  },
  backButton: {
    padding: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '500',
  },
});

export default ConnectScreen;