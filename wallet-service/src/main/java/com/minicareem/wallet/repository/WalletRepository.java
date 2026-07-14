package com.minicareem.wallet.repository;

import com.minicareem.wallet.model.Wallet;
import com.minicareem.wallet.model.WalletType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    /** Used to look up the single SYSTEM (house) wallet that funds deposits. */
    Optional<Wallet> findFirstByType(WalletType type);
}
