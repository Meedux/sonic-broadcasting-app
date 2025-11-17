package com.sonic.broadcast.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SonicDarkColors = darkColorScheme(
    primary = Color(0xFFC0162B),
    onPrimary = Color.White,
    background = Color(0xFF0C0C0F),
    surface = Color(0xFF15151A),
    onSurface = Color(0xFF9A9AA0),
    error = Color(0xFFFF4D4F)
)

@Composable
fun SonicTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = SonicDarkColors, typography = MaterialTheme.typography, content = content)
}
