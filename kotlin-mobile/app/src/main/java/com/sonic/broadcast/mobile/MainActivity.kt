package com.sonic.broadcast.mobile

import android.Manifest
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sonic.broadcast.mobile.state.AppViewModel
import com.sonic.broadcast.mobile.ui.screens.ControllerScreen
import com.sonic.broadcast.mobile.ui.theme.SonicTheme

private val REQUIRED_PERMISSIONS = arrayOf(
    Manifest.permission.CAMERA,
    Manifest.permission.RECORD_AUDIO
)

class MainActivity : ComponentActivity() {
    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val allGranted = REQUIRED_PERMISSIONS.all { perm -> result[perm] == true }
        if (!allGranted) {
            // In a production app show rationale + retry or navigate to settings.
        }
    }

    private fun ensurePermissions() {
        val missing = REQUIRED_PERMISSIONS.filter { checkSelfPermission(it) != android.content.pm.PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensurePermissions()
        setContent {
            SonicTheme {
                val vm: AppViewModel = viewModel()
                ControllerScreen(vm)
            }
        }
    }
}
