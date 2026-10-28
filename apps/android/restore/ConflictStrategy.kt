package com.vaultsync.restore

enum class ConflictStrategy { SKIP, RENAME, KEEP_BOTH, REPLACE }

/** REPLACE is valid only after an explicit preview and platform confirmation. */
data class RestoreDecision(
    val destinationUri: String,
    val strategy: ConflictStrategy,
    val confirmedByUser: Boolean,
)
