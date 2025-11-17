package com.sonic.broadcast.mobile.daily

import android.content.Context
import co.daily.CallClient
import co.daily.CallClientListener
import co.daily.model.CallState
import co.daily.model.MeetingToken
import co.daily.model.CallJoinData
import co.daily.model.RequestListenerWithData
import co.daily.model.RequestResultWithData
import co.daily.model.MediaState
import co.daily.model.Participant
import co.daily.model.ParticipantId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext

/**
 * DailyClient wraps Daily's CallClient providing state as a Kotlin Flow.
 * Focused on: join, leave, tracking screen share participant.
 */
class DailyClient(private val appContext: Context) {
    data class MeetingState(
        val joined: Boolean = false,
        val joining: Boolean = false,
        val roomUrl: String? = null,
        val token: String? = null,
        val error: String? = null,
        val participants: Map<ParticipantId, Participant> = emptyMap(),
        val screenParticipantId: ParticipantId? = null,
        val livestreamStatus: LivestreamStatus = LivestreamStatus.Idle,
    )

    sealed interface LivestreamStatus { object Idle: LivestreamStatus; object Starting: LivestreamStatus; object Live: LivestreamStatus; data class Error(val message:String): LivestreamStatus }

    private val _state = MutableStateFlow(MeetingState())
    val state: StateFlow<MeetingState> = _state.asStateFlow()

    private var callClient: CallClient? = null

    private val listener = object : CallClientListener {
        override fun onParticipantJoined(participant: Participant) {
            updateParticipants { this + (participant.id to participant) }
        }
        override fun onParticipantUpdated(participant: Participant) {
            updateParticipants { this + (participant.id to participant) }
        }
        override fun onParticipantLeft(participant: Participant, reason: co.daily.model.ParticipantLeftReason) {
            updateParticipants { this - participant.id }
        }
        override fun onError(message: String) {
            _state.update { it.copy(error = message) }
        }
        override fun onCallStateUpdated(state: CallState) {
            _state.update {
                it.copy(
                    joining = state == CallState.joining,
                    joined = state == CallState.joined
                )
            }
            if (state == CallState.left) {
                _state.value = MeetingState()
            }
        }
        // Other callbacks ignored for brevity
    }

    private fun updateParticipants(mutator: Map<ParticipantId, Participant>.() -> Map<ParticipantId, Participant>) {
        _state.update { prev ->
            val updated = prev.participants.mutator()
            prev.copy(
                participants = updated,
                screenParticipantId = pickScreenShare(updated)
            )
        }
    }

    private fun pickScreenShare(parts: Map<ParticipantId, Participant>): ParticipantId? {
        // Prefer a participant with a screen-video track; fallback to first participant with camera.
        val screen = parts.values.firstOrNull { p -> p.media?.screenVideo?.state == MediaState.playable }
        if (screen != null) return screen.id
        return parts.values.firstOrNull { p -> p.media?.camera?.state == MediaState.playable }?.id
    }

    suspend fun join(roomUrl: String, token: String?) = withContext(Dispatchers.IO) {
        if (callClient == null) {
            // Ensure we use the application context
            callClient = CallClient(appContext)
            callClient?.addListener(listener)
        }
        _state.update { it.copy(joining = true, roomUrl = roomUrl, token = token, error = null) }
        try {
            val meetingToken = token?.let { MeetingToken(it) }
            callClient?.join(
                roomUrl,
                meetingToken,
                null,
                RequestListenerWithData<CallJoinData> { result: RequestResultWithData<CallJoinData> ->
                    if (result.isError) {
                        val msg = result.error?.msg ?: "Join failed"
                        _state.update { it.copy(joining = false, error = msg, joined = false) }
                    }
                    // On success, we'll rely on onCallStateUpdated to reflect joined state
                }
            )
            // joined flag will be updated via onCallStateUpdated
        } catch (e: Exception) {
            _state.update { it.copy(joining = false, error = e.message, joined = false) }
        }
    }

    suspend fun leave() = withContext(Dispatchers.IO) {
    try { callClient?.leave() } catch (_: Exception) {}
        _state.value = MeetingState()
    }

    // Livestream control placeholders (SDK exposes APIs; integrate when ready for your flow)
    suspend fun startLivestream(@Suppress("UNUSED_PARAMETER") rtmpUrl: String) {
        _state.update { it.copy(livestreamStatus = LivestreamStatus.Starting) }
        _state.update { it.copy(livestreamStatus = LivestreamStatus.Live) }
    }
    suspend fun stopLivestream() {
        _state.update { it.copy(livestreamStatus = LivestreamStatus.Idle) }
    }
}
