package com.minicareem.wallet.model;

import javax.persistence.*;
import java.time.Instant;

/**
 * A wallet is an account that money can move into and out of.
 *
 * <p>The balance is intentionally NOT stored as a column. It is always derived
 * by summing the wallet's ledger entries, so the ledger is the single source of
 * truth and the two can never drift apart.
 */
@Entity
@Table(name = "wallets")
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** External reference, e.g. a rider or driver id from another service. */
    @Column(nullable = false)
    private String ownerRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WalletType type;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Wallet() {
        // Required by JPA.
    }

    public Wallet(String ownerRef, WalletType type, String currency) {
        this.ownerRef = ownerRef;
        this.type = type;
        this.currency = currency;
    }

    public Long getId() {
        return id;
    }

    public String getOwnerRef() {
        return ownerRef;
    }

    public WalletType getType() {
        return type;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
