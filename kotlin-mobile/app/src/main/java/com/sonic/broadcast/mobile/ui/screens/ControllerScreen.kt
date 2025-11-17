package com.sonic.broadcast.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sonic.broadcast.mobile.daily.DailyClient
import com.sonic.broadcast.mobile.state.AppViewModel
import com.sonic.broadcast.mobile.ui.components.ScreenSharePreview

@Composable
fun ControllerScreen(viewModel: AppViewModel) {
    val ui by viewModel.ui.collectAsState()
    Column(
        modifier = Modifier.fillMaxSize().padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Sonic Mobile Controller", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.onSurface)
        OutlinedTextField(
            value = ui.baseUrl,
            onValueChange = { viewModel.updateBaseUrl(it) },
            label = { Text("Desktop base URL") },
            singleLine = true,
        )
        Button(onClick = { viewModel.connectSocket() }, enabled = ui.baseUrl.isNotBlank() && !ui.connecting && !ui.socketConnected) { Text(if (ui.connecting) "Connecting…" else if (ui.socketConnected) "Connected" else "Connect") }
    val participant = ui.daily.screenParticipantId?.let { ui.daily.participants[it] }
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            ScreenSharePreview(participant = participant, modifier = Modifier.fillMaxSize())
            if (!ui.daily.joined || participant == null) {
                Text("Waiting for screenshare…", modifier = Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.onSurface)
            }
        }
        // Livestream controls
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(onClick = { viewModel.startLivestream("rtmp://example.com/app/key") }, enabled = ui.livestreamStatus == "idle" || ui.livestreamStatus == "error") { Text("Start Livestream") }
            Button(onClick = { viewModel.pauseLivestream() }, enabled = ui.livestreamStatus == "live" ) { Text("Pause") }
            Button(onClick = { viewModel.stopLivestream() }, enabled = ui.livestreamStatus == "live" || ui.livestreamStatus == "pausing" || ui.livestreamStatus == "starting" ) { Text("End") }
        }
        ui.joinError?.let { Text("Join error: $it", color = MaterialTheme.colorScheme.error) }
        if (ui.livestreamError != null) { Text("Livestream error: ${ui.livestreamError}", color = MaterialTheme.colorScheme.error) }
        Text("Livestream status: ${ui.livestreamStatus}", color = MaterialTheme.colorScheme.onSurface)
    }
}
