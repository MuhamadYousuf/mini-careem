package com.minicareem.wallet;

import com.minicareem.wallet.exception.InsufficientFundsException;
import com.minicareem.wallet.model.Wallet;
import com.minicareem.wallet.model.WalletType;
import com.minicareem.wallet.service.WalletService;
import com.minicareem.wallet.web.WalletController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web-layer tests: verify routing, validation and that domain exceptions map to
 * the right HTTP status codes. The service is mocked.
 */
@WebMvcTest(WalletController.class)
class WalletControllerTest {

    @Autowired MockMvc mvc;
    @MockBean WalletService service;

    private Wallet wallet() {
        return new Wallet("rider-1", WalletType.USER, "PKR");
    }

    @Test
    void createWalletReturns201() throws Exception {
        when(service.createWallet(any(), any())).thenReturn(wallet());
        when(service.balanceOf(any())).thenReturn(BigDecimal.ZERO);

        mvc.perform(post("/api/wallet/wallets")
                        .contentType("application/json")
                        .content("{\"ownerRef\":\"rider-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerRef").value("rider-1"));
    }

    @Test
    void createWalletRejectsBlankOwner() throws Exception {
        mvc.perform(post("/api/wallet/wallets")
                        .contentType("application/json")
                        .content("{\"ownerRef\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void insufficientFundsMapsTo422() throws Exception {
        when(service.transfer(anyLong(), anyLong(), any(), any()))
                .thenThrow(new InsufficientFundsException(1L));

        mvc.perform(post("/api/wallet/transfers")
                        .contentType("application/json")
                        .content("{\"fromWalletId\":1,\"toWalletId\":2,\"amount\":30}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mvc.perform(get("/api/wallet/health"))
                .andExpect(status().isOk());
    }
}
