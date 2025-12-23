"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  getLocalStorage,
  isConnected as stacksIsConnected,
  type StorageData,
} from "@stacks/connect";

interface HiroWallet {
  isWalletOpen: boolean;
  isWalletConnected: boolean;
  testnetAddress: string | null;
  mainnetAddress: string | null;
  authenticate: () => void;
  disconnect: () => void;
}

const HiroWalletContext = createContext<HiroWallet>({
  isWalletOpen: false,
  isWalletConnected: false,
  testnetAddress: null,
  mainnetAddress: null,
  authenticate: () => {},
  disconnect: () => {},
});
export default HiroWalletContext;

interface ProviderProps {
  children: ReactNode | ReactNode[];
}

const HiroWalletProviderUnconfigured: FC<ProviderProps> = ({ children }) => {
  const hiroWalletContext: HiroWallet = useMemo(
    () => ({
      authenticate: () => {
        // no-op when not configured
      },
      disconnect: () => {
        // no-op when not configured
      },
      isWalletOpen: false,
      isWalletConnected: false,
      testnetAddress: null,
      mainnetAddress: null,
    }),
    []
  );

  return (
    <HiroWalletContext.Provider value={hiroWalletContext}>
      {children}
    </HiroWalletContext.Provider>
  );
};

const HiroWalletProviderConfigured: FC<ProviderProps> = ({ children }) => {
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Hydrate initial state from localStorage.
    setStorage(getLocalStorage());
    setIsWalletConnected(stacksIsConnected());
  }, []);

  const refreshFromStorage = useCallback(() => {
    setStorage(getLocalStorage());
    setIsWalletConnected(stacksIsConnected());
  }, []);

  const authenticate = useCallback(async () => {
    // Opens Stacks Connect modal (wallet extension selection) and stores addresses.
    await stacksConnect({});
    refreshFromStorage();
  }, [refreshFromStorage]);

  const handleDisconnect = useCallback(() => {
    stacksDisconnect();
    refreshFromStorage();
  }, [refreshFromStorage]);

  const { testnetAddress, mainnetAddress, hasStxAddress } = useMemo(() => {
    const stxAddresses = storage?.addresses?.stx ?? [];
    const anyStx = stxAddresses[0]?.address ?? null;

    // Prefer explicit mainnet/testnet prefixes if present.
    const main = stxAddresses.find((a) => a.address?.startsWith("SP"))?.address ?? null;
    const test = stxAddresses.find((a) => a.address?.startsWith("ST"))?.address ?? null;

    const resolvedMain = main || (anyStx?.startsWith("SP") ? anyStx : null);
    const resolvedTest = test || (anyStx?.startsWith("ST") ? anyStx : null);

    return {
      testnetAddress: resolvedTest,
      mainnetAddress: resolvedMain,
      hasStxAddress: Boolean(resolvedMain || resolvedTest),
    };
  }, [storage]);

  const isStacksWalletConnected = Boolean(isWalletConnected && hasStxAddress);

  const hiroWalletContext = useMemo(
    () => ({
      authenticate,
      disconnect: handleDisconnect,
      isWalletOpen: false,
      isWalletConnected: isStacksWalletConnected,
      testnetAddress,
      mainnetAddress,
    }),
    [
      authenticate,
      handleDisconnect,
      isStacksWalletConnected,
      mainnetAddress,
      testnetAddress,
    ]
  );

  return (
    <HiroWalletContext.Provider value={hiroWalletContext}>
      {children}
    </HiroWalletContext.Provider>
  );
};

export const HiroWalletProvider: FC<ProviderProps> = ({ children }) => {
  // Only render the configured provider in the browser.
  if (typeof window === "undefined") {
    return <HiroWalletProviderUnconfigured>{children}</HiroWalletProviderUnconfigured>;
  }

  return <HiroWalletProviderConfigured>{children}</HiroWalletProviderConfigured>;
};
