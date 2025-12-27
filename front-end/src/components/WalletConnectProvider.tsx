"use client";

import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppKit } from "@reown/appkit/react";

interface WalletConnectContextValue {
  isWalletOpen: boolean;
  isWalletConnected: boolean;
  testnetAddress: string | null;
  mainnetAddress: string | null;
  authenticate: () => void;
  disconnect: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue>({
  isWalletOpen: false,
  isWalletConnected: false,
  testnetAddress: null,
  mainnetAddress: null,
  authenticate: () => {},
  disconnect: () => {},
});

export default WalletConnectContext;

interface ProviderProps {
  children: ReactNode | ReactNode[];
}

/**
 * Fallback provider for SSR / unconfigured environments.
 */
const WalletConnectProviderUnconfigured: FC<ProviderProps> = ({ children }) => {
  const context: WalletConnectContextValue = useMemo(
    () => ({
      authenticate: () => {},
      disconnect: () => {},
      isWalletOpen: false,
      isWalletConnected: false,
      testnetAddress: null,
      mainnetAddress: null,
    }),
    []
  );

  return (
    <WalletConnectContext.Provider value={context}>
      {children}
    </WalletConnectContext.Provider>
  );
};

/**
 * Extract Stacks addresses from WalletConnect session namespaces.
 */
function extractStacksAddressesFromSession(session: unknown): {
  mainnetAddress: string | null;
  testnetAddress: string | null;
} {
  let mainnetAddress: string | null = null;
  let testnetAddress: string | null = null;

  try {
    const namespaces = (session as { namespaces?: Record<string, { accounts?: string[] }> })?.namespaces;
    const stacksAccounts = namespaces?.stacks?.accounts || [];

    for (const account of stacksAccounts) {
      // Format: stacks:1:<address> for mainnet, stacks:2147483648:<address> for testnet
      if (account.startsWith("stacks:1:")) {
        mainnetAddress = account.replace("stacks:1:", "");
      } else if (account.startsWith("stacks:2147483648:")) {
        testnetAddress = account.replace("stacks:2147483648:", "");
      }
    }
  } catch (err) {
    console.warn("Failed to extract Stacks addresses from session:", err);
  }

  return { mainnetAddress, testnetAddress };
}

/**
 * Configured provider that uses Reown AppKit for WalletConnect.
 */
const WalletConnectProviderConfigured: FC<ProviderProps> = ({ children }) => {
  const { open } = useAppKit();

  const [testnetAddress, setTestnetAddress] = useState<string | null>(null);
  const [mainnetAddress, setMainnetAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch Stacks addresses from the WalletConnect session
  const refreshStacksAddresses = useCallback(async () => {
    try {
      const reown = await import("@reown/appkit/react");
      const appKitModal = reown.modal;
      if (!appKitModal) {
        setIsConnected(false);
        setMainnetAddress(null);
        setTestnetAddress(null);
        return;
      }

      const universalProvider = await appKitModal.getUniversalProvider();
      if (!universalProvider?.session) {
        setIsConnected(false);
        setMainnetAddress(null);
        setTestnetAddress(null);
        return;
      }

      // Extract Stacks addresses from session namespaces
      const { mainnetAddress: main, testnetAddress: test } = 
        extractStacksAddressesFromSession(universalProvider.session);

      setMainnetAddress(main);
      setTestnetAddress(test);
      setIsConnected(Boolean(main || test));
    } catch (err) {
      console.warn("Failed to refresh Stacks addresses:", err);
      setIsConnected(false);
      setMainnetAddress(null);
      setTestnetAddress(null);
    }
  }, []);

  // Poll for session changes (AppKit doesn't expose proper events for this)
  useEffect(() => {
    // Initial fetch
    refreshStacksAddresses();

    // Poll every 2 seconds to catch session changes
    const interval = setInterval(refreshStacksAddresses, 2000);

    return () => clearInterval(interval);
  }, [refreshStacksAddresses]);

  const authenticate = useCallback(() => {
    // Open the AppKit modal for wallet connection
    open({ view: "Connect" });
  }, [open]);

  const handleDisconnect = useCallback(async () => {
    try {
      const reown = await import("@reown/appkit/react");
      const appKitModal = reown.modal;
      if (appKitModal) {
        await appKitModal.disconnect();
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
    setTestnetAddress(null);
    setMainnetAddress(null);
    setIsConnected(false);
  }, []);

  const context = useMemo(
    () => ({
      authenticate,
      disconnect: handleDisconnect,
      isWalletOpen: false,
      isWalletConnected: isConnected,
      testnetAddress,
      mainnetAddress,
    }),
    [authenticate, handleDisconnect, isConnected, mainnetAddress, testnetAddress]
  );

  return (
    <WalletConnectContext.Provider value={context}>
      {children}
    </WalletConnectContext.Provider>
  );
};

export const WalletConnectProvider: FC<ProviderProps> = ({ children }) => {
  // Only render the configured provider in the browser
  if (typeof window === "undefined") {
    return (
      <WalletConnectProviderUnconfigured>
        {children}
      </WalletConnectProviderUnconfigured>
    );
  }

  return (
    <WalletConnectProviderConfigured>
      {children}
    </WalletConnectProviderConfigured>
  );
};
