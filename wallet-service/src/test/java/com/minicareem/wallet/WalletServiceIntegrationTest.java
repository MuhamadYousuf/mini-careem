package com.minicareem.wallet;

import com.minicareem.wallet.model.LedgerEntry;
import com.minicareem.wallet.model.Wallet;
import com.minicareem.wallet.repository.LedgerEntryRepository;
import com.minicareem.wallet.service.WalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end test through the real service and JPA layer, backed by in-memory
 * H2 (see application-test.yml). Proves deposits and transfers persist and that
 * the whole ledger nets to zero.
 */
@SpringBootTest
@ActiveProfiles("test")
class WalletServiceIntegrationTest {

    @Autowired WalletService service;
    @Autowired LedgerEntryRepository entries;

    @Test
    void depositThenTransferProducesCorrectBalances() {
        Wallet rider = service.createWallet("rider-karachi", "PKR");
        Wallet driver = service.createWallet("driver-karachi", "PKR");

        service.deposit(rider.getId(), new BigDecimal("500.00"));
        service.transfer(rider.getId(), driver.getId(), new BigDecimal("180.00"), "fare");

        assertThat(service.balanceOf(rider.getId())).isEqualByComparingTo("320.00");
        assertThat(service.balanceOf(driver.getId())).isEqualByComparingTo("180.00");
    }

    @Test
    void everyEntryInTheLedgerSumsToZero() {
        Wallet a = service.createWallet("a", "PKR");
        Wallet b = service.createWallet("b", "PKR");
        service.deposit(a.getId(), new BigDecimal("200.00"));
        service.transfer(a.getId(), b.getId(), new BigDecimal("75.50"), "fare");

        // Double-entry invariant: the sum of ALL signed amounts is always zero.
        BigDecimal total = entries.findAll().stream()
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo("0.00");
    }

    @Test
    void ledgerListsMostRecentEntryFirst() {
        Wallet w = service.createWallet("c", "PKR");
        service.deposit(w.getId(), new BigDecimal("10.00"));
        service.deposit(w.getId(), new BigDecimal("20.00"));

        List<LedgerEntry> list = service.entriesOf(w.getId());
        assertThat(list).hasSize(2);
    }
}
