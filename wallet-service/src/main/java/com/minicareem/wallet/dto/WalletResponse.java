package com.minicareem.wallet.dto;

import com.minicareem.wallet.model.Wallet;

import java.math.BigDecimal;

/** View of a wallet returned to clients, including its derived balance. */
public class WalletResponse {

    public Long id;
    public String ownerRef;
    public String type;
    public String currency;
    public BigDecimal balance;

    public WalletResponse(Wallet wallet, BigDecimal balance) {
        this.id = wallet.getId();
        this.ownerRef = wallet.getOwnerRef();
        this.type = wallet.getType().name();
        this.currency = wallet.getCurrency();
        this.balance = balance;
    }
}
