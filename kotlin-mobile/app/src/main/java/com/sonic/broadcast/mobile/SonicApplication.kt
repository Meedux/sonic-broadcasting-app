package com.sonic.broadcast.mobile

import android.app.Application

/**
 * Minimal Application subclass referenced by AndroidManifest.
 * Add any future process-wide initialization here.
 */
class SonicApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize global SDK singletons here if needed (e.g., Daily SDK setup).
    }
}
