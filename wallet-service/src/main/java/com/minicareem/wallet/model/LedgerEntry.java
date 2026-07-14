package com.minicareem.wallet.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * One line of the double-entry ledger.
 *
 * <p>Amounts are signed: a CREDIT stores a positive amount, a DEBIT stores a
 * negative amount. A wallet's balance is simply the sum of its entry amounts.
 * Money is always {@link BigDecimal}; never {@code double}.
 */
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long walletId;

    /** Groups the two entries created by a single transfer. */
    @Column(nullable = false)
    private String transferId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType type;

    /** Signed amount: positive for CREDIT, negative for DEBIT. */
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LedgerEntry() {
        // Required by JPA.
    }

    public LedgerEntry(Long walletId, String transferId, EntryType type,
                       BigDecimal amount, String description) {
        this.walletId = walletId;
        this.transferId = transferId;
        this.type = type;
        this.amount = amount;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public Long getWalletId() {
        return walletId;
    }

    public String getTransferId() {
        return transferId;
    }

    public EntryType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
