import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'dart:async';

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
  bool isWebRTCConnected = false;

  // WebRTC variables
  RTCPeerConnection? peerConnection;
  RTCVideoRenderer? remoteRenderer;
  String? consumerTransportId;
  String? producerId;
  String? consumerId;

  io.Socket? socket;
  String rtspUrl = ''; // Not used anymore

  // Text controllers for proper input handling
  final TextEditingController ipController = TextEditingController();
  final TextEditingController pairingCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    initCamera();
    initWebRTC();
    // Initialize text controllers
    ipController.text = desktopIP;

    // Start heartbeat timer to keep connection alive
    Timer.periodic(const Duration(seconds: 30), (timer) {
      if (socket != null && isConnected) {
        socket!.emit('ping');
      }
    });
  }

  Future<void> initWebRTC() async {
    remoteRenderer = RTCVideoRenderer();
    await remoteRenderer!.initialize();
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

        // Request router RTP capabilities for WebRTC
        socket!.emit('get-router-rtp-capabilities');

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Successfully paired with desktop! Setting up WebRTC...')),
        );
      });



      socket!.on('webrtc-offer', (data) async {
        print('Received WebRTC offer');
        await handleOffer(data);
      });

      socket!.on('webrtc-answer', (data) async {
        print('Received WebRTC answer');
        await peerConnection!.setRemoteDescription(
          RTCSessionDescription(data['sdp'], data['type'])
        );
      });

      socket!.on('ice-candidate', (data) async {
        print('Received ICE candidate');
        await peerConnection!.addCandidate(
          RTCIceCandidate(data['candidate'], data['sdpMid'], data['sdpMLineIndex'])
        );
      });

      socket!.on('screen-sharing-started', (_) {
        setState(() {
          isWebRTCConnected = true;
          isStreaming = true;
          isConnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Screen sharing started!')),
        );
      });

      socket!.on('screen-sharing-stopped', (_) {
        setState(() {
          isWebRTCConnected = false;
          isStreaming = false;
        });
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

      socket!.on('stream-started', (data) async {
        print('Stream started - WebRTC streaming active');
        setState(() {
          isStreaming = true;
          isConnecting = false;
        });
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



  void startScreenSharing() {
    if (socket != null && isConnected) {
      print('Requesting screen sharing from desktop');
      socket!.emit('start-screen-sharing');
    }
  }

  void stopScreenSharing() {
    if (socket != null && isConnected) {
      print('Stopping screen sharing');
      socket!.emit('stop-screen-sharing');
      setState(() {
        isStreaming = false;
        isWebRTCConnected = false;
      });
    }
  }

  Future<void> handleOffer(Map<String, dynamic> data) async {
    try {
      peerConnection = await createPeerConnection({
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'}
        ]
      });

      peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
        socket!.emit('ice-candidate', {
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        });
      };

      // Use onAddStream for better compatibility with flutter_webrtc
      peerConnection!.onAddStream = (MediaStream stream) {
        print('Received remote stream');
        remoteRenderer!.srcObject = stream;
        setState(() {
          isWebRTCConnected = true;
          isStreaming = true;
          isConnecting = false;
        });
      };

      peerConnection!.onTrack = (RTCTrackEvent event) {
        print('Received remote track: ${event.track.kind}');
        // Fallback for onTrack if onAddStream doesn't work
        if (event.track.kind == 'video' && remoteRenderer!.srcObject == null) {
          remoteRenderer!.srcObject = event.streams[0];
        }
      };

      peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
        print('Connection state: $state');
      };

      await peerConnection!.setRemoteDescription(
        RTCSessionDescription(data['sdp'], data['type'])
      );

      RTCSessionDescription answer = await peerConnection!.createAnswer();
      await peerConnection!.setLocalDescription(answer);

      socket!.emit('webrtc-answer', {
        'sdp': answer.sdp,
        'type': answer.type,
      });
    } catch (error) {
      print('Error handling offer: $error');
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

    // Clean up WebRTC
    peerConnection?.dispose();
    peerConnection = null;
    remoteRenderer?.srcObject = null;

    setState(() {
      isConnected = false;
      isStreaming = false;
      isWebRTCConnected = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Disconnected from desktop')),
    );
  }

  @override
  void dispose() {
    // Clean up WebRTC
    peerConnection?.dispose();
    remoteRenderer?.dispose();

    controller?.dispose();
    socket?.dispose();
    ipController.dispose();
    pairingCodeController.dispose();
    super.dispose();
  }

  Widget _buildPlayerWidget() {
    print('Building player widget - isConnected: $isConnected, isStreaming: $isStreaming, isWebRTCConnected: $isWebRTCConnected');
    return Column(
      children: [
        // WebRTC Stream (screenshare from desktop) - shown when streaming
        if (isConnected && isStreaming && remoteRenderer != null)
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.black,
              child: RTCVideoView(
                remoteRenderer!,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
                placeholderBuilder: (context) => const Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
        // Camera preview - always shown at bottom
        if (isInitialized)
          Expanded(
            flex: 1,
            child: Container(
              margin: const EdgeInsets.only(top: 8.0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8.0),
                child: CameraPreview(controller!),
              ),
            ),
          )
        else
          const Expanded(
            flex: 1,
            child: Center(child: Text('Camera initializing...')),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sonic Broadcasting - Mobile'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
        children: [
          TextField(
            decoration: const InputDecoration(
              labelText: 'Desktop IP Address',
              border: OutlineInputBorder(),
              hintText: '10.0.2.2 (Android emulator) or actual IP',
            ),
            controller: ipController,
          ),
          const SizedBox(height: 16),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Pairing Code',
              border: OutlineInputBorder(),
            ),
            controller: pairingCodeController,
            keyboardType: TextInputType.number,
            maxLength: 6,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: isConnecting ? null : connectToDesktop,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
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
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: !isConnected ? null : disconnectFromDesktop,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Disconnect'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            isConnecting
                ? 'Connecting...'
                : isConnected
                    ? isStreaming
                        ? 'Screen sharing active'
                        : 'Connected - Ready to share screen'
                    : 'Disconnected',
            style: TextStyle(
              color: isConnecting
                  ? Colors.orange
                  : isConnected
                      ? isStreaming
                          ? Colors.green
                          : Colors.blue
                      : Colors.red,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 16),
          if (isConnected && !isStreaming)
            ElevatedButton(
              onPressed: startScreenSharing,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
              ),
              child: const Text('Start Screen Sharing'),
            ),
          if (isStreaming)
            ElevatedButton(
              onPressed: stopScreenSharing,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Stop Screen Sharing'),
            ),
          Expanded(
            child: _buildPlayerWidget(),
          ),
          const SizedBox(height: 16),
          const Text('Camera Streaming to Desktop', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton(
                onPressed: isConnected && isInitialized && !isStreaming ? startCameraStreaming : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Start Camera'),
              ),
              ElevatedButton(
                onPressed: isStreaming ? stopCameraStreaming : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Stop Camera'),
              ),
            ],
          ),
        ],
      ),
    ));
  }
}
