package com.minicareem.wallet.model;

/**
 * The two sides of a double-entry bookkeeping record.
 *
 * <p>Every money movement produces exactly one DEBIT and one CREDIT whose
 * amounts are equal and opposite, so the ledger as a whole always sums to zero.
 */
public enum EntryType {
    /** Money leaving an account (stored as a negative amount). */
    DEBIT,
    /** Money entering an account (stored as a positive amount). */
    CREDIT
}
