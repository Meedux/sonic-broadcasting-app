package com.sonic.broadcast.mobile.socket

import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject

class SocketManager {
    private var socket: Socket? = null
    private val _events = MutableSharedFlow<Event>(extraBufferCapacity = 32)
    val events: SharedFlow<Event> = _events

    sealed interface Event {
        data class Connected(val id: String): Event
        data class Disconnected(val reason: String?): Event
        data class Session(val roomUrl: String, val token: String?): Event
        data class Error(val message: String): Event
        data class LivestreamStatus(val status: String, val message: String? = null): Event
    }

    fun connect(baseUrl: String) {
        disconnect()
        try {
            val opts = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = 8
                reconnectionDelay = 500L
                reconnectionDelayMax = 4000L
                timeout = 8000L
                path = "/socket.io"
                transports = arrayOf("websocket")
            }
            socket = IO.socket(baseUrl, opts)
            socket?.on(Socket.EVENT_CONNECT) {
                _events.tryEmit(Event.Connected(socket?.id() ?: ""))
            }
            socket?.on(Socket.EVENT_DISCONNECT) { args ->
                _events.tryEmit(Event.Disconnected(args.firstOrNull()?.toString()))
            }
            socket?.on("daily-session") { args ->
                val raw = args.firstOrNull()
                val json = when (raw) {
                    is JSONObject -> raw
                    is String -> JSONObject(raw)
                    else -> null
                }
                if (json != null) {
                    _events.tryEmit(Event.Session(json.optString("roomUrl"), json.optString("token")))
                }
            }
            socket?.on("livestream-status") { args ->
                val raw = args.firstOrNull()
                val json = when (raw) {
                    is JSONObject -> raw
                    is String -> JSONObject(raw)
                    else -> null
                }
                if (json != null) {
                    _events.tryEmit(Event.LivestreamStatus(json.optString("status"), json.optString("message")))
                }
            }
            socket?.on(Socket.EVENT_CONNECT_ERROR) { a ->
                _events.tryEmit(Event.Error(a.firstOrNull()?.toString() ?: "connect_error"))
            }
            socket?.connect()
        } catch (e: Exception) {
            _events.tryEmit(Event.Error(e.message ?: "socket_init_error"))
        }
    }

    fun disconnect() {
        try { socket?.disconnect() } catch (_: Exception) {}
        socket = null
    }

    fun emitStartLivestream(rtmpUrl: String, streamKey: String?) {
        try { socket?.emit("start-livestream", JSONObject().apply {
            put("rtmpUrl", rtmpUrl)
            if (streamKey != null) put("streamKey", streamKey)
        }) } catch (_: Exception) {}
    }

    fun emitStopLivestream() {
        try { socket?.emit("stop-livestream") } catch (_: Exception) {}
    }

    fun emitPauseLivestream() {
        try { socket?.emit("pause-livestream") } catch (_: Exception) {}
    }
}
