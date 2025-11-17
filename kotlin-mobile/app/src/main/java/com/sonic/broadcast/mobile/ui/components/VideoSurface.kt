package com.sonic.broadcast.mobile.ui.components

import android.view.LayoutInflater
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import co.daily.model.Participant
import co.daily.model.MediaStreamTrack
import co.daily.view.VideoView

/**
 * ScreenSharePreview renders the first screen share (or fallback camera) track for a participant.
 * Supply the resolved participant from state.
 */
@Composable
fun ScreenSharePreview(
    participant: Participant?,
    modifier: Modifier = Modifier
) {
    var videoView: VideoView? by remember { mutableStateOf(null) }
    AndroidView(
        modifier = modifier,
        factory = { context ->
            val container = FrameLayout(context)
            val vv = VideoView(context)
            container.addView(vv, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            videoView = vv
            container
        },
        update = { _ ->
            val vv = videoView ?: return@AndroidView
            val track: MediaStreamTrack? = participant?.media?.screenVideo?.track
                ?: participant?.media?.camera?.track
            vv.track = track
        }
    )
    LaunchedEffect(participant?.id) {
        val vv = videoView
        val track: MediaStreamTrack? = participant?.media?.screenVideo?.track
            ?: participant?.media?.camera?.track
        vv?.track = track
    }
}
