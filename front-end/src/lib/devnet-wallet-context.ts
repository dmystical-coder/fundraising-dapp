"use client";

import { createContext, useContext } from 'react';
import { DevnetWallet, devnetWallets } from './devnet-wallets';

export { devnetWallets };
export type { DevnetWallet };

export interface DevnetWalletContextType {
  currentWallet: DevnetWallet | null;
  wallets: DevnetWallet[];
  setCurrentWallet: (wallet: DevnetWallet) => void;
}

export const DevnetWalletContext = createContext<DevnetWalletContextType>({
  currentWallet: null,
  wallets: devnetWallets,
  setCurrentWallet: () => {},
});

export const useDevnetWallet = () => useContext(DevnetWalletContext);
