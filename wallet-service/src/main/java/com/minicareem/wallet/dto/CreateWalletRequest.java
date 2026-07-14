package com.minicareem.wallet.dto;

import javax.validation.constraints.NotBlank;

/** Request body for creating a wallet. */
public class CreateWalletRequest {

    @NotBlank
    private String ownerRef;

    /** Optional; defaults to PKR if omitted. */
    private String currency = "PKR";

    public String getOwnerRef() {
        return ownerRef;
    }

    public void setOwnerRef(String ownerRef) {
        this.ownerRef = ownerRef;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
