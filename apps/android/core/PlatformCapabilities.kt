package com.vaultsync.core

/** Honest capability contract shared by UI, permission flows, and backup planning. */
data class PlatformCapabilities(
    val canReadUserSelectedMedia: Boolean = true,
    val canReadGrantedSafFolders: Boolean = true,
    val canExportAuthorizedContacts: Boolean = false,
    val canRunConstrainedBackgroundWork: Boolean = true,
    val canReadOtherAppsPrivateData: Boolean = false,
    val canSilentlyInstallPackages: Boolean = false,
)
