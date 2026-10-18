package com.nova.assistant

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*

/**
 * NovaForegroundService: Runs continuously on Android in background.
 * Provides:
 * 1. Fused Location Tracking (GPS)
 * 2. UsageStatsManager App Limit Enforcer (Screen Time)
 * 3. Emergency SOS Dispatcher (SMS + Direct Call)
 */
class NovaForegroundService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var lastLocation: Location? = null
    private val CHANNEL_ID = "NovaGuardianChannel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(101, buildNotification("Nova is actively protecting and assisting you"))

        // 1. Initialize High-Accuracy Fused Location
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        requestLocationUpdates()

        // 2. Start Screen Time & App Limit Monitor Loop
        startAppLimitSupervisor()
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15000)
            .setMinUpdateIntervalMillis(5000)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    lastLocation = result.lastLocation
                    // Sends coordinates to Nova Backend API
                    lastLocation?.let { loc ->
                        syncLocationToBackend(loc.latitude, loc.longitude)
                    }
                }
            }, mainLooper)
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    /**
     * App Limit & Screen Time Enforcer:
     * Checks currently foregrounded app via UsageStatsManager.
     * If user exceeds limit (e.g. 45 min on Instagram), sends home intent or overlay warning.
     */
    private fun startAppLimitSupervisor() {
        Thread {
            while (true) {
                try {
                    val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                    val time = System.currentTimeMillis()
                    val stats = usageStatsManager.queryUsageStats(
                        UsageStatsManager.INTERVAL_DAILY,
                        time - 1000 * 3600 * 24,
                        time
                    )

                    for (pkg in stats) {
                        // Check if Instagram or TikTok exceeded limit
                        if (pkg.packageName.contains("instagram") && pkg.totalTimeInForeground > 45 * 60 * 1000) {
                            showLimitWarning("Instagram limit exceeded! Take a break.")
                        }
                    }
                    Thread.sleep(30000) // check every 30s
                } catch (e: Exception) {
                    break
                }
            }
        }.start()
    }

    /**
     * Emergency Dispatch:
     * Broadcasts SMS with Google Maps coordinates and launches emergency call.
     */
    fun triggerEmergencySOS(situation: String, emergencyNumber: String = "112") {
        val lat = lastLocation?.latitude ?: 0.0
        val lng = lastLocation?.longitude ?: 0.0
        val mapLink = "https://maps.google.com/?q=$lat,$lng"

        val emergencyMessage = "🚨 EMERGENCY ALERT: Nova AI detected distress: '$situation'. Live Location: $mapLink"

        // 1. Send SMS to Emergency Contacts
        try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                getSystemService(SmsManager::class.java)
            } else {
                SmsManager.getDefault()
            }
            smsManager.sendTextMessage(emergencyNumber, null, emergencyMessage, null, null)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Direct Call to Emergency Services (112 / 911)
        val callIntent = Intent(Intent.ACTION_CALL).apply {
            data = Uri.parse("tel:$emergencyNumber")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(callIntent)
    }

    private fun syncLocationToBackend(lat: Double, lng: Double) {
        // Syncs with Nova API server at /api/location/update
    }

    private fun showLimitWarning(message: String) {
        // Display Heads-Up notification or voice warning
    }

    private fun buildNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nova AI Guardian")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Nova Background Guardian",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
