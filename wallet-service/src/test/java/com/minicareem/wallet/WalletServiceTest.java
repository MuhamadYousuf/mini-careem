package com.minicareem.wallet;

import com.minicareem.wallet.exception.InsufficientFundsException;
import com.minicareem.wallet.exception.WalletNotFoundException;
import com.minicareem.wallet.model.*;
import com.minicareem.wallet.repository.LedgerEntryRepository;
import com.minicareem.wallet.repository.WalletRepository;
import com.minicareem.wallet.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pure unit tests for the money logic. Repositories are mocked, so these run
 * in milliseconds and assert behaviour without a database.
 */
@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock WalletRepository wallets;
    @Mock LedgerEntryRepository entries;
    @Captor ArgumentCaptor<LedgerEntry> entryCaptor;

    WalletService service;

    private Wallet userWallet(long id) {
        Wallet w = new Wallet("rider-" + id, WalletType.USER, "PKR");
        setId(w, id);
        return w;
    }

    private static void setId(Object entity, long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @BeforeEach
    void setUp() {
        service = new WalletService(wallets, entries);
    }

    @Test
    void transferWritesBalancedDebitAndCreditPair() {
        when(wallets.findById(1L)).thenReturn(Optional.of(userWallet(1)));
        when(wallets.findById(2L)).thenReturn(Optional.of(userWallet(2)));
        when(entries.balanceOf(1L)).thenReturn(new BigDecimal("100.00"));

        service.transfer(1L, 2L, new BigDecimal("30.00"), "fare");

        verify(entries, times(2)).save(entryCaptor.capture());
        List<LedgerEntry> saved = entryCaptor.getAllValues();

        // The two entries must sum to zero: the ledger stays balanced.
        BigDecimal sum = saved.get(0).getAmount().add(saved.get(1).getAmount());
        assertThat(sum).isEqualByComparingTo("0.00");
        // They share one transferId so the pair can be reconciled later.
        assertThat(saved.get(0).getTransferId()).isEqualTo(saved.get(1).getTransferId());

        LedgerEntry debit = saved.get(0);
        LedgerEntry credit = saved.get(1);
        assertThat(debit.getType()).isEqualTo(EntryType.DEBIT);
        assertThat(debit.getAmount()).isEqualByComparingTo("-30.00");
        assertThat(credit.getType()).isEqualTo(EntryType.CREDIT);
        assertThat(credit.getAmount()).isEqualByComparingTo("30.00");
    }

    @Test
    void transferRejectedWhenUserWalletHasInsufficientFunds() {
        when(wallets.findById(1L)).thenReturn(Optional.of(userWallet(1)));
        when(wallets.findById(2L)).thenReturn(Optional.of(userWallet(2)));
        when(entries.balanceOf(1L)).thenReturn(new BigDecimal("10.00"));

        assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("30.00"), "fare"))
                .isInstanceOf(InsufficientFundsException.class);

        // Nothing must be written when the transfer is rejected.
        verify(entries, never()).save(any());
    }

    @Test
    void transferRejectsNonPositiveAmount() {
        assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("0.00"), "x"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(entries);
    }

    @Test
    void getWalletThrowsWhenMissing() {
        when(wallets.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getWallet(99L))
                .isInstanceOf(WalletNotFoundException.class);
    }

    @Test
    void depositDrawsFromSystemWalletIntoUserWallet() {
        Wallet system = new Wallet("house", WalletType.SYSTEM, "PKR");
        setId(system, 5L);
        when(wallets.findFirstByType(WalletType.SYSTEM)).thenReturn(Optional.of(system));
        when(wallets.findById(5L)).thenReturn(Optional.of(system));
        when(wallets.findById(1L)).thenReturn(Optional.of(userWallet(1)));

        service.deposit(1L, new BigDecimal("50.00"));

        verify(entries, times(2)).save(entryCaptor.capture());
        List<LedgerEntry> saved = entryCaptor.getAllValues();
        // System wallet is debited (may go negative), user wallet credited.
        assertThat(saved.get(0).getWalletId()).isEqualTo(5L);
        assertThat(saved.get(0).getAmount()).isEqualByComparingTo("-50.00");
        assertThat(saved.get(1).getWalletId()).isEqualTo(1L);
        assertThat(saved.get(1).getAmount()).isEqualByComparingTo("50.00");
    }
}
