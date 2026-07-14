package com.minicareem.wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Wallet service.
 *
 * <p>The Wallet owns money. Because money demands strong consistency, this
 * service is the only one in mini-Careem that talks to a relational database
 * (MySQL) and wraps its writes in ACID transactions.
 */
@SpringBootApplication
public class WalletApplication {

    public static void main(String[] args) {
        SpringApplication.run(WalletApplication.class, args);
    }
}
