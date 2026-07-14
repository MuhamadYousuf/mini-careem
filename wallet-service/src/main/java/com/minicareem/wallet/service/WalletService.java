package com.minicareem.wallet.service;

import com.minicareem.wallet.exception.InsufficientFundsException;
import com.minicareem.wallet.exception.WalletNotFoundException;
import com.minicareem.wallet.model.*;
import com.minicareem.wallet.repository.LedgerEntryRepository;
import com.minicareem.wallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Core money logic for mini-Careem.
 *
 * <p>Every balance-changing operation is a transfer that writes two ledger
 * entries inside one database transaction: if either write fails, both roll
 * back, so the ledger can never end up half-updated. This is the ACID
 * guarantee that justifies choosing MySQL for this service.
 */
@Service
public class WalletService {

    private final WalletRepository wallets;
    private final LedgerEntryRepository entries;

    public WalletService(WalletRepository wallets, LedgerEntryRepository entries) {
        this.wallets = wallets;
        this.entries = entries;
    }

    @Transactional
    public Wallet createWallet(String ownerRef, String currency) {
        return wallets.save(new Wallet(ownerRef, WalletType.USER, currency));
    }

    @Transactional(readOnly = true)
    public Wallet getWallet(Long id) {
        return wallets.findById(id).orElseThrow(() -> new WalletNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public BigDecimal balanceOf(Long walletId) {
        // Touch the wallet first so an unknown id yields 404, not a silent 0.
        getWallet(walletId);
        return entries.balanceOf(walletId);
    }

    @Transactional(readOnly = true)
    public List<LedgerEntry> entriesOf(Long walletId) {
        getWallet(walletId);
        return entries.findByWalletIdOrderByCreatedAtDesc(walletId);
    }

    /**
     * Fund a user wallet from the SYSTEM house account. Implemented as an
     * ordinary transfer so double-entry integrity is preserved.
     */
    @Transactional
    public void deposit(Long walletId, BigDecimal amount) {
        Wallet system = systemWallet();
        transfer(system.getId(), walletId, amount, "deposit");
    }

    /**
     * Move {@code amount} from one wallet to another, writing a balanced pair
     * of ledger entries. USER wallets are not allowed to go negative.
     */
    @Transactional
    public String transfer(Long fromWalletId, Long toWalletId, BigDecimal amount, String description) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        Wallet from = getWallet(fromWalletId);
        Wallet to = getWallet(toWalletId);

        // A USER wallet may not be overdrawn; the SYSTEM wallet may.
        if (from.getType() == WalletType.USER) {
            BigDecimal balance = entries.balanceOf(fromWalletId);
            if (balance.compareTo(amount) < 0) {
                throw new InsufficientFundsException(fromWalletId);
            }
        }

        String transferId = UUID.randomUUID().toString();
        // Debit the source (negative) and credit the destination (positive).
        entries.save(new LedgerEntry(fromWalletId, transferId, EntryType.DEBIT,
                amount.negate(), description));
        entries.save(new LedgerEntry(toWalletId, transferId, EntryType.CREDIT,
                amount, description));
        return transferId;
    }

    /**
     * Return the single house account, creating it on first use. Deposits draw
     * from here so that every credit to a user has a matching debit somewhere.
     */
    @Transactional
    public Wallet systemWallet() {
        return wallets.findFirstByType(WalletType.SYSTEM)
                .orElseGet(() -> wallets.save(
                        new Wallet("house", WalletType.SYSTEM, "PKR")));
    }
}
