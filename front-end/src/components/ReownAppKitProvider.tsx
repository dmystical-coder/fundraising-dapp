"use client";

import React from "react";

import { createAppKit } from "@reown/appkit/react";
import { bitcoin, bitcoinTestnet, defineChain } from "@reown/appkit/networks";
import { BitcoinAdapter } from "@reown/appkit-adapter-bitcoin";
import type { AppKitNetwork } from "@reown/appkit-common";

let initialized = false;

// AppKit v1.8.x does not currently export Stacks networks, but it *does* support
// the `stacks` namespace. We can define Stacks networks via `defineChain`.
// Chain IDs align with Stacks.js ChainID values (1 = mainnet, 2147483648 = testnet).
const stacksMainnet = defineChain({
  id: "1",
  caipNetworkId: "stacks:1",
  chainNamespace: "stacks",
  name: "Stacks",
  nativeCurrency: {
    name: "Stacks",
    symbol: "STX",
    decimals: 6,
  },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] },
  },
});

const stacksTestnet = defineChain({
  id: "2147483648",
  caipNetworkId: "stacks:2147483648",
  chainNamespace: "stacks",
  name: "Stacks Testnet",
  nativeCurrency: {
    name: "Stacks",
    symbol: "STX",
    decimals: 6,
  },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] },
  },
  testnet: true,
});

function getReownProjectId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
    // Back-compat with docs naming
    process.env.NEXT_PUBLIC_PROJECT_ID
  );
}

export function ReownAppKitProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Important: this must run before any child calls AppKit hooks.
  if (!initialized && typeof window !== "undefined") {
    const projectId = getReownProjectId();
    if (projectId) {
      const isStacksMainnetEnv =
        process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";

      // Include both BTC + STX networks so the modal can surface them.
      // Keep BTC as default since we only configure the BitcoinAdapter today.
      const networks = [
        bitcoin,
        stacksMainnet,
        bitcoinTestnet,
        stacksTestnet,
      ] as unknown as [AppKitNetwork, ...AppKitNetwork[]];

      const adapters = [new BitcoinAdapter()];

      createAppKit({
        adapters,
        projectId,
        networks,
        defaultNetwork: isStacksMainnetEnv ? stacksMainnet : stacksTestnet,
        defaultAccountTypes: { stacks: "eoa", bip122: "stx" },
        universalProviderConfigOverride: {
          methods: {
            stacks: [
              "stx_getAddresses",
              "stx_callContract",
              "stx_signMessage",
              "stx_signTransaction",
            ],
          },
          chains: {
            stacks: [
              isStacksMainnetEnv ? "stacks:1" : "stacks:2147483648",
              // Request both; wallets can ignore unsupported.
              "stacks:1",
              "stacks:2147483648",
            ],
          },
          events: {
            stacks: ["stx_chainChanged"],
          },
        },
        metadata: {
          name: "Fundraising",
          description: "Fundraising dApp",
          url: process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
          icons: ["https://avatars.githubusercontent.com/u/179229932"],
        },
      });

      initialized = true;
    }
  }

  return <>{children}</>;
}
