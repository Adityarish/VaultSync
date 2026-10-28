package com.vaultsync.backup

/** Provider-neutral preferences translated to WorkManager Constraints by the Android app. */
data class BackupConstraints(
    val wifiOnly: Boolean,
    val chargingOnly: Boolean,
    val batteryNotLow: Boolean,
)
