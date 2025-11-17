package com.sonic.broadcast.mobile.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sonic.broadcast.mobile.daily.DailyClient
import com.sonic.broadcast.mobile.socket.SocketManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class UiState(
    val baseUrl: String = "",
    val connecting: Boolean = false,
    val socketConnected: Boolean = false,
    val joinError: String? = null,
    val livestreamError: String? = null,
    val roomUrl: String? = null,
    val token: String? = null,
    val daily: DailyClient.MeetingState = DailyClient.MeetingState(),
    val livestreamStatus: String = "idle",
)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val dailyClient = DailyClient(application.applicationContext)
    private val socketManager = SocketManager()
    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()
    private var socketJob: Job? = null

    init {
        viewModelScope.launch {
            dailyClient.state.collectLatest { st ->
                _ui.value = _ui.value.copy(daily = st, roomUrl = st.roomUrl, token = st.token, joinError = st.error)
            }
        }
    }

    fun updateBaseUrl(url: String) { _ui.value = _ui.value.copy(baseUrl = url) }

    fun connectSocket() {
        val base = _ui.value.baseUrl.trim()
        if (base.isEmpty()) return
        _ui.value = _ui.value.copy(connecting = true)
        socketManager.connect(base)
        socketJob?.cancel()
        socketJob = viewModelScope.launch {
            socketManager.events.collectLatest { evt ->
                when (evt) {
                    is SocketManager.Event.Connected -> _ui.value = _ui.value.copy(connecting = false, socketConnected = true)
                    is SocketManager.Event.Disconnected -> _ui.value = _ui.value.copy(socketConnected = false)
                    is SocketManager.Event.Error -> _ui.value = _ui.value.copy(connecting = false, joinError = evt.message)
                    is SocketManager.Event.Session -> {
                        viewModelScope.launch { dailyClient.join(evt.roomUrl, evt.token) }
                    }
                    is SocketManager.Event.LivestreamStatus -> {
                        _ui.value = _ui.value.copy(livestreamStatus = evt.status)
                    }
                }
            }
        }
    }

    fun startLivestream(rtmpUrl: String) {
        socketManager.emitStartLivestream(rtmpUrl, streamKey = null)
        _ui.value = _ui.value.copy(livestreamStatus = "starting")
    }

    fun stopLivestream() { viewModelScope.launch { dailyClient.stopLivestream() } }

    fun pauseLivestream() {
        socketManager.emitPauseLivestream()
        _ui.value = _ui.value.copy(livestreamStatus = "pausing")
    }

    override fun onCleared() {
        super.onCleared()
        socketManager.disconnect()
        viewModelScope.launch { dailyClient.leave() }
    }
}
