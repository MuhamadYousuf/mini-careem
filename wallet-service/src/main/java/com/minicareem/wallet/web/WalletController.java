package com.minicareem.wallet.web;

import com.minicareem.wallet.dto.*;
import com.minicareem.wallet.model.LedgerEntry;
import com.minicareem.wallet.model.Wallet;
import com.minicareem.wallet.service.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/** REST surface for the Wallet service. All paths are prefixed by the gateway. */
@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService service;

    public WalletController(WalletService service) {
        this.service = service;
    }

    /** Simple liveness probe used by Docker / the gateway. */
    @GetMapping("/health")
    public String health() {
        return "wallet ok";
    }

    @PostMapping("/wallets")
    @ResponseStatus(HttpStatus.CREATED)
    public WalletResponse create(@Valid @RequestBody CreateWalletRequest req) {
        Wallet wallet = service.createWallet(req.getOwnerRef(), req.getCurrency());
        return new WalletResponse(wallet, service.balanceOf(wallet.getId()));
    }

    @GetMapping("/wallets/{id}")
    public WalletResponse get(@PathVariable Long id) {
        return new WalletResponse(service.getWallet(id), service.balanceOf(id));
    }

    @PostMapping("/wallets/{id}/deposit")
    public WalletResponse deposit(@PathVariable Long id, @Valid @RequestBody DepositRequest req) {
        service.deposit(id, req.getAmount());
        return new WalletResponse(service.getWallet(id), service.balanceOf(id));
    }

    @PostMapping("/transfers")
    public ResponseEntity<String> transfer(@Valid @RequestBody TransferRequest req) {
        String transferId = service.transfer(
                req.getFromWalletId(), req.getToWalletId(), req.getAmount(), req.getDescription());
        return ResponseEntity.status(HttpStatus.CREATED).body(transferId);
    }

    @GetMapping("/wallets/{id}/entries")
    public List<LedgerEntry> entries(@PathVariable Long id) {
        return service.entriesOf(id);
    }
}
