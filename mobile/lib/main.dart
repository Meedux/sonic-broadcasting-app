import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:flutter_vlc_player/flutter_vlc_player.dart';
import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import 'dart:convert';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sonic Broadcasting - Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.red,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const MobileHomePage(),
    );
  }
}

class MobileHomePage extends StatefulWidget {
  const MobileHomePage({super.key});

  @override
  State<MobileHomePage> createState() => _MobileHomePageState();
}

class _MobileHomePageState extends State<MobileHomePage> {
  late List<CameraDescription> cameras;
  CameraController? controller;
  bool isInitialized = false;
  String pairingCode = '';
  String desktopIP = '10.0.2.2'; // Default for Android emulator, can be changed
  bool isConnected = false;
  bool isStreaming = false;
  bool isConnecting = false; // Loading state for connection

  // Text controllers for input fields
  final TextEditingController ipController = TextEditingController();
  final TextEditingController pairingCodeController = TextEditingController();

  // Screen sharing variables
  RTCPeerConnection? peerConnection;
  RTCVideoRenderer screenRenderer = RTCVideoRenderer();
  bool isScreenSharingActive = false;
  // HLS/RTMP playback controller (for low-latency local playback via HLS)
  VlcPlayerController? _vlcController;
  bool isHlsPlaying = false;
  MemoryImage? screenImage;

  io.Socket? socket;
  String rtspUrl = ''; // Not used anymore

  // Chat mock data
  List<Map<String, String>> chatMessages = [];
  Timer? chatTimer;

  @override
  void initState() {
    super.initState();
    initCamera();
    // Initialize text controllers
    ipController.text = desktopIP;

    // Initialize mock chat messages
    _initMockChat();

    // Initialize WebRTC renderer
    initWebRTC();

    // Start heartbeat timer to keep connection alive
    Timer.periodic(const Duration(seconds: 30), (timer) {
      if (socket != null && isConnected) {
        socket!.emit('ping');
      }
    });
  }



  Future<void> initCamera() async {
    cameras = await availableCameras();
    if (cameras.isNotEmpty) {
      controller = CameraController(cameras[0], ResolutionPreset.medium);
      await controller!.initialize();
      setState(() {
        isInitialized = true;
      });
    }
  }

  void connectToDesktop() async {
    final ip = ipController.text.trim();
    final code = pairingCodeController.text.trim();

    if (code.isEmpty || ip.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both IP address and pairing code')),
      );
      return;
    }

    // Set loading state
    setState(() {
      isConnecting = true;
      isConnected = false;
    });

    try {
      // Disconnect existing socket if any
      socket?.dispose();

      // Create new socket connection
      socket = io.io('ws://$ip:8080', <String, dynamic>{
        'transports': ['websocket'],
        'timeout': 5000,
        'forceNew': true,
        'reconnection': false,
      });

      // Set up event handlers
      socket!.onConnect((_) {
        setState(() {
          isConnecting = false;
        });

        // Send pairing request
        socket!.emit('pair', {
          'type': 'pair',
          'code': code,
        });
      });

      socket!.onConnectError((error) {
        setState(() {
          isConnecting = false;
          isConnected = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connection failed: $error')),
        );
      });

      socket!.on('welcome', (data) {
        // Welcome message received
      });

      socket!.on('paired', (data) async {
        setState(() {
          isConnected = true;
        });
        print('Successfully paired with desktop');

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Successfully paired with desktop!')),
        );
      });

      // Listen for screen sharing offer from desktop
      socket!.on('screen-offer', (data) async {
        print('Received screen offer from desktop');
        try {
          await setupWebRTC();
          if (peerConnection != null) {
            await peerConnection!.setRemoteDescription(
              RTCSessionDescription(data['offer']['sdp'], data['offer']['type'])
            );

            RTCSessionDescription answer = await peerConnection!.createAnswer();
            await peerConnection!.setLocalDescription(answer);

            socket!.emit('screen-answer', {
              'answer': {
                'sdp': answer.sdp,
                'type': answer.type
              }
            });

            setState(() {
              isStreaming = true;
            });
          }
        } catch (error) {
          print('Error handling screen offer: $error');
        }
      });

      // Listen for ICE candidates from desktop
      socket!.on('screen-ice-candidate', (data) async {
        print('Received ICE candidate from desktop');
        try {
          if (peerConnection != null && data['candidate'] != null) {
            await peerConnection!.addCandidate(
              RTCIceCandidate(
                data['candidate']['candidate'],
                data['candidate']['sdpMid'],
                data['candidate']['sdpMLineIndex']
              )
            );
          }
        } catch (error) {
          print('Error adding ICE candidate: $error');
        }
      });

      socket!.on('screen-sharing-started', (_) {
        setState(() {
          isStreaming = true;
          isConnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Screen sharing started!')),
        );
        // Auto-play HLS stream served by desktop at http://<desktop-ip>:8081/hls/stream.m3u8
        try {
          final ip = ipController.text.trim().isNotEmpty ? ipController.text.trim() : desktopIP;
          final hlsUrl = 'http://$ip:8081/hls/stream.m3u8';
          // Start VLC player
          _vlcController?.stop();
          _vlcController?.dispose();
          // Try to explicitly request full hardware acceleration if the enum is available
          // Note: some versions of flutter_vlc_player expose enum values in lowercase (e.g. HwAcc.full)
          // while others use uppercase. We choose the lowercase form which is the most common Dart style.
          try {
            _vlcController = VlcPlayerController.network(
              hlsUrl,
              hwAcc: HwAcc.full,
              autoPlay: true,
            );
          } catch (e) {
            // Fallback to default if the enum member isn't available in this plugin version
            _vlcController = VlcPlayerController.network(
              hlsUrl,
              autoPlay: true,
            );
          }
          setState(() {
            isHlsPlaying = true;
          });
        } catch (e) {
          print('Error starting HLS playback: $e');
        }
      });

      socket!.on('screen-sharing-stopped', (_) {
        setState(() {
          isStreaming = false;
        });
        // Stop HLS playback
        try {
          _vlcController?.stop();
          _vlcController?.dispose();
          _vlcController = null;
        } catch (e) {
          print('Error stopping HLS playback: $e');
        }
      });

      socket!.on('screen-sharing-error', (error) {
        print('Screen sharing error: $error');
        setState(() {
          isConnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Screen sharing error: $error')),
        );
      });

      socket!.on('error', (data) {
        setState(() {
          isConnected = false;
        });
        final errorMessage = data['message'] ?? 'Unknown error';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $errorMessage')),
        );
      });







      socket!.on('pong', (_) {
        // Pong received from server
      });

      socket!.onDisconnect((_) {
        setState(() {
          isConnecting = false;
          isConnected = false;
          isStreaming = false;
        });
      });

    } catch (error) {
      setState(() {
        isConnecting = false;
        isConnected = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create connection: $error')),
      );
    }
  }



  void startScreenSharing() async {
    if (socket != null && isConnected) {
      print('Requesting screen sharing start');
      socket!.emit('start-screen-sharing');
    }
  }

  void stopScreenSharing() {
    if (socket != null && isConnected) {
      print('Stopping screen sharing');
      socket!.emit('stop-screen-sharing');
      cleanupWebRTC();
      setState(() {
        isStreaming = false;
        isScreenSharingActive = false;
      });
    }
  }

  Future<void> initWebRTC() async {
    await screenRenderer.initialize();
  }

  Future<void> setupWebRTC() async {
    peerConnection = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'}
      ]
    });

    // Add connection state monitoring
    peerConnection!.onConnectionState = (state) {
      print('WebRTC connection state: $state');
    };

    peerConnection!.onIceConnectionState = (state) {
      print('ICE connection state: $state');
    };

    peerConnection!.onTrack = (event) {
      print('Received remote track');
      if (event.track.kind == 'video') {
        screenRenderer.srcObject = event.streams[0];
        setState(() {
          isScreenSharingActive = true;
        });
      }
    };

    peerConnection!.onIceCandidate = (candidate) {
      if (candidate != null && socket != null && isConnected) {
        socket!.emit('mobile-ice-candidate', {
          'candidate': candidate.toMap()
        });
      }
    };
  }

  void cleanupWebRTC() {
    if (peerConnection != null) {
      peerConnection!.close();
      peerConnection = null;
    }
    screenRenderer.srcObject = null;
    screenRenderer.dispose();
  }



  void handleFrameData(Uint8List data) {
    try {
      // The data is the JPEG image bytes directly
      setState(() {
        screenImage = MemoryImage(data);
      });
    } catch (error) {
      print('Error handling frame data: $error');
    }
  }

  void handleScreenFrame(dynamic data) {
    try {
      // Data contains base64 encoded JPEG frame
      final base64Data = data['frame'] as String;
      // Remove the data URL prefix if present (data:image/jpeg;base64,)
      final cleanBase64 = base64Data.replaceFirst(RegExp(r'data:image/[^;]+;base64,'), '');
      final imageBytes = base64.decode(cleanBase64);

      setState(() {
        screenImage = MemoryImage(Uint8List.fromList(imageBytes));
      });
    } catch (error) {
      print('Error handling screen frame: $error');
    }
  }

  void startCameraStreaming() {
    // TODO: Implement RTMP camera streaming using platform channels
    // For now, this is a placeholder that would use native Android/iOS RTMP libraries
    print('Starting camera streaming to desktop RTMP server');
    // Platform channel implementation would go here:
    // const platform = MethodChannel('com.example.mobile/rtmp');
    // await platform.invokeMethod('startRTMPStreaming', {
    //   'rtmpUrl': 'rtmp://desktop-ip:1935/stream',
    //   'cameraId': '0'
    // });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Camera streaming not yet implemented - requires native RTMP library')),
    );
  }

  void stopCameraStreaming() {
    // TODO: Stop RTMP camera streaming
    print('Stopping camera streaming');
    // Platform channel implementation would go here:
    // const platform = MethodChannel('com.example.mobile/rtmp');
    // await platform.invokeMethod('stopRTMPStreaming');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Camera streaming stopped')),
    );
  }

  void disconnectFromDesktop() {
    if (socket != null && isConnected) {
      socket!.emit('disconnect');
    }
    socket?.dispose();

    // Clean up WebRTC connection
    peerConnection?.close();
    screenRenderer?.dispose();

    setState(() {
      isConnected = false;
      isStreaming = false;
      screenImage = null; // Clear the screen image
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Disconnected from desktop')),
    );
  }

  @override
  void dispose() {
    controller?.dispose();
    socket?.dispose();
    chatTimer?.cancel();
    ipController.dispose();
    pairingCodeController.dispose();
    super.dispose();
  }

  void showConnectionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a1a),
        title: const Text(
          'Connect to Desktop',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: const InputDecoration(
                labelText: 'Desktop IP Address',
                labelStyle: TextStyle(color: Color(0xFFff4757)),
                border: OutlineInputBorder(),
                hintText: '10.0.2.2 or actual IP',
                hintStyle: TextStyle(color: Color(0xFF666666)),
              ),
              style: const TextStyle(color: Colors.white),
              controller: ipController,
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Pairing Code',
                labelStyle: TextStyle(color: Color(0xFFff4757)),
                border: OutlineInputBorder(),
                hintStyle: TextStyle(color: Color(0xFF666666)),
              ),
              style: const TextStyle(color: Colors.white),
              controller: pairingCodeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF888888))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              connectToDesktop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFdc143c),
            ),
            child: const Text('Connect'),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionPrompt() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.cast,
                  size: 64,
                  color: Colors.white.withOpacity(0.7),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Sonic Broadcasting Controller',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Connect to your desktop to start screen sharing and control your broadcast',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 16,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => showConnectionDialog(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFdc143c),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(25),
                    ),
                  ),
                  child: const Text(
                    'Connect to Desktop',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControllerInterface() {
    return Column(
      children: [
        // Screen sharing preview (top section - largest)
        Expanded(
          flex: 4,
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isStreaming ? const Color(0xFFdc143c).withOpacity(0.6) : const Color(0xFF333333),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: isStreaming ? const Color(0xFFdc143c).withOpacity(0.2) : Colors.black.withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Stack(
                children: [
                  // Screen preview from WebRTC stream OR HLS playback via VLC
                  if (isHlsPlaying && _vlcController != null)
                    VlcPlayer(
                      controller: _vlcController!,
                      aspectRatio: 16 / 9,
                      placeholder: const Center(child: CircularProgressIndicator()),
                    )
                  else if (isScreenSharingActive && screenRenderer.srcObject != null)
                    RTCVideoView(screenRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain)
                  else
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.desktop_windows,
                            size: 48,
                            color: Colors.white.withOpacity(0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            isStreaming ? 'Connecting...' : 'Screen sharing not active',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Live indicator overlay
                  if (isStreaming)
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFdc143c).withOpacity(0.9),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'LIVE',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Control buttons overlay
                  Positioned(
                    bottom: 12,
                    left: 12,
                    right: 12,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        ElevatedButton.icon(
                          onPressed: isStreaming ? stopScreenSharing : startScreenSharing,
                          icon: Icon(isStreaming ? Icons.stop : Icons.play_arrow, size: 16),
                          label: Text(isStreaming ? 'Stop' : 'Start', style: const TextStyle(fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isStreaming ? const Color(0xFFdc143c) : Colors.green,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: () {},
                              icon: const Icon(Icons.fullscreen, size: 16),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black.withOpacity(0.5),
                                foregroundColor: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              onPressed: () {},
                              icon: const Icon(Icons.settings, size: 16),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black.withOpacity(0.5),
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Camera preview with controls (middle section)
        Expanded(
          flex: 2,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: const Color(0xFF333333),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Stack(
                children: [
                  if (isInitialized)
                    CameraPreview(controller!)
                  else
                    const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFFff6b6b),
                      ),
                    ),
                  // Camera controls overlay (use Wrap to avoid overflow on narrow screens)
                  Positioned(
                    bottom: 8,
                    left: 8,
                    right: 8,
                    child: Center(
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        alignment: WrapAlignment.center,
                        children: [
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.camera_alt, size: 18),
                            style: IconButton.styleFrom(
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(36, 36),
                              backgroundColor: Colors.black.withOpacity(0.5),
                              foregroundColor: Colors.white,
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.mic, size: 18),
                            style: IconButton.styleFrom(
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(36, 36),
                              backgroundColor: Colors.black.withOpacity(0.5),
                              foregroundColor: Colors.white,
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.switch_camera, size: 18),
                            style: IconButton.styleFrom(
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(36, 36),
                              backgroundColor: Colors.black.withOpacity(0.5),
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Live Chat (bottom section)
        Expanded(
          flex: 2,
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a1a),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFF333333),
              ),
            ),
            child: Column(
              children: [
                // Chat header
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2a2a2a),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.chat,
                        color: const Color(0xFFff4757),
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'Live Chat',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFdc143c).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          '1.2K viewers',
                          style: TextStyle(
                            color: Color(0xFFff4757),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Chat messages
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: _buildMockChatMessages(),
                  ),
                ),

                // Chat input
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: const Color(0xFF333333),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(15),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: const Color(0xFF2a2a2a),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.send, size: 16),
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFdc143c),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _initMockChat() {
    // Initial mock messages
    chatMessages = [
      {'user': 'Alex_123', 'message': 'Amazing stream! 🔥', 'time': '2m ago'},
      {'user': 'GamingPro', 'message': 'Love the new setup!', 'time': '1m ago'},
      {'user': 'StreamFan', 'message': 'Can you show the character select?', 'time': '45s ago'},
      {'user': 'CoolViewer', 'message': 'GG on that last match', 'time': '30s ago'},
      {'user': 'ChatMaster', 'message': 'Stream quality is perfect!', 'time': '15s ago'},
    ];

    // Simulate new messages every 10-30 seconds
    chatTimer = Timer.periodic(Duration(seconds: Random().nextInt(20) + 10), (timer) {
      if (isConnected && mounted) {
        _addMockChatMessage();
      }
    });
  }

  void _addMockChatMessage() {
    final users = ['Alex_123', 'GamingPro', 'StreamFan', 'CoolViewer', 'ChatMaster', 'ViewerX', 'StreamLover', 'GameMaster', 'ProPlayer'];
    final messages = [
      'Great stream!',
      'Love this game!',
      'What\'s your setup?',
      'Amazing gameplay!',
      'Keep it up! 💪',
      'GG!',
      'Nice moves!',
      'Can you explain that strategy?',
      'Stream quality is perfect!',
      'How long have you been playing?',
      'This is so entertaining!',
      'Best stream ever! 🔥',
      'Teach me that combo!',
      'You\'re so good at this!',
      'What level are you on?',
    ];

    final user = users[Random().nextInt(users.length)];
    final message = messages[Random().nextInt(messages.length)];

    setState(() {
      chatMessages.insert(0, {
        'user': user,
        'message': message,
        'time': 'now'
      });

      // Keep only last 20 messages
      if (chatMessages.length > 20) {
        chatMessages = chatMessages.sublist(0, 20);
      }
    });
  }

  List<Widget> _buildMockChatMessages() {
    return chatMessages.map((msg) {
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${msg['user']}: ',
              style: const TextStyle(
                color: Color(0xFFff4757),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
            Expanded(
              child: Text(
                msg['message']!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                ),
              ),
            ),
            Text(
              ' ${msg['time']}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 10,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0a0a0a),
              Color(0xFF000000),
              Color(0xFF1a1a1a),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header with connection status
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isConnected ? const Color(0xFFdc143c).withOpacity(0.2) : const Color(0xFF333333),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isConnected ? const Color(0xFFdc143c).withOpacity(0.5) : const Color(0xFF444444),
                        ),
                      ),
                      child: Icon(
                        isConnected ? Icons.wifi : Icons.wifi_off,
                        color: isConnected ? const Color(0xFFff4757) : const Color(0xFF888888),
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isConnected ? 'Connected to Desktop' : 'Disconnected',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            isConnected
                                ? (isStreaming ? 'Screen sharing active' : 'Ready to share screen')
                                : 'Tap connect to start',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!isConnected)
                      ElevatedButton(
                        onPressed: isConnecting ? null : () => showConnectionDialog(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFff6b6b),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: isConnecting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text('Connect'),
                      ),
                  ],
                ),
              ),

              // Main content area
              Expanded(
                child: isConnected ? _buildControllerInterface() : _buildConnectionPrompt(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
