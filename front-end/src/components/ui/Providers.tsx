"use client";

import theme from "@/theme";
import { ChakraProvider } from "@chakra-ui/react";
import { DevnetWalletProvider } from "../DevnetWalletProvider";
import { ErrorBoundary } from "../ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const HiroWalletProvider = dynamic(
  () => import("../HiroWalletProvider").then((m) => m.HiroWalletProvider),
  { ssr: false }
);

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <ErrorBoundary>
          <HiroWalletProvider>
            <DevnetWalletProvider>{children}</DevnetWalletProvider>
          </HiroWalletProvider>
        </ErrorBoundary>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
