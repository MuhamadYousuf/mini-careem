package com.minicareem.wallet.exception;

/** Thrown when a wallet id does not exist. Maps to HTTP 404. */
public class WalletNotFoundException extends RuntimeException {
    public WalletNotFoundException(Long id) {
        super("Wallet not found: " + id);
    }
}
