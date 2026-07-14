package com.minicareem.wallet.model;

/**
 * Distinguishes normal user wallets from the internal house account.
 */
public enum WalletType {
    /** A rider or driver wallet. Cannot go below zero. */
    USER,
    /** The house/cash account that funds deposits. May hold a negative balance. */
    SYSTEM
}
