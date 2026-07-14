package com.minicareem.wallet.repository;

import com.minicareem.wallet.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    /**
     * Balance = sum of the signed amounts on the wallet's entries.
     * COALESCE keeps a brand-new wallet at 0 instead of null.
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.walletId = :walletId")
    BigDecimal balanceOf(@Param("walletId") Long walletId);
}
