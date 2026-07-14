package com.minicareem.wallet.exception;

/** Thrown when a USER wallet would go below zero. Maps to HTTP 422. */
public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(Long walletId) {
        super("Insufficient funds in wallet: " + walletId);
    }
}
