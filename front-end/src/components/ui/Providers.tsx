"use client";

import theme from "@/theme";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { DevnetWalletProvider } from "../DevnetWalletProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const ReownAppKitProvider = dynamic(
  () => import("../ReownAppKitProvider").then((m) => m.ReownAppKitProvider),
  { ssr: false }
);

const HiroWalletProvider = dynamic(
  () => import("../HiroWalletProvider").then((m) => m.HiroWalletProvider),
  { ssr: false }
);

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeScript initialColorMode="light" />
      <ChakraProvider theme={theme}>
        <ReownAppKitProvider>
          <HiroWalletProvider>
            <DevnetWalletProvider>{children}</DevnetWalletProvider>
          </HiroWalletProvider>
        </ReownAppKitProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
