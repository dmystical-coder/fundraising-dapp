"use client";
import { getLocalStorage } from "@stacks/connect";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  ButtonProps,
  Flex,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  useClipboard,
  VStack,
} from "@chakra-ui/react";
import { useContext, useState } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  getConfiguredStacksNetwork,
  isDevnetEnvironment,
} from "@/lib/contract-utils";
import { formatStxAddress } from "@/lib/address-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";

/**
 * Hook to get the current connected wallet address.
 * Works for both devnet (manual wallet selection) and mainnet/testnet (Hiro wallet).
 */
export const useAddress = (): string | null => {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet } = useDevnetWallet();
  const network = getConfiguredStacksNetwork();

  if (isDevnetEnvironment()) {
    return currentWallet?.stxAddress || null;
  }

  if (network === "testnet") {
    return testnetAddress || null;
  }

  if (network === "mainnet") {
    return mainnetAddress || null;
  }

  return null;
};

function readHasMainnetInStorage(): boolean {
  const stx = getLocalStorage()?.addresses?.stx ?? [];
  return stx.some((a) => a.address?.startsWith("SP"));
}

function readHasTestnetInStorage(): boolean {
  const stx = getLocalStorage()?.addresses?.stx ?? [];
  return stx.some((a) => a.address?.startsWith("ST"));
}

interface ConnectWalletButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

const focusVisibleProps = {
  _focusVisible: {
    boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)",
  },
};

export const ConnectWalletButton = (buttonProps: ConnectWalletButtonProps) => {
  const { children, size = "md", w, ...restButtonProps } = buttonProps;
  const {
    authenticate,
    disconnect,
    isWalletConnected,
    mainnetAddress,
    testnetAddress,
  } = useContext(HiroWalletContext);

  const [isConnecting, setIsConnecting] = useState(false);

  const network = getConfiguredStacksNetwork();
  const currentAddress =
    network === "testnet"
      ? testnetAddress
      : network === "mainnet"
        ? mainnetAddress
        : null;

  const isWrongNetworkAccount =
    isWalletConnected &&
    ((network === "mainnet" &&
      !mainnetAddress &&
      Boolean(testnetAddress)) ||
      (network === "testnet" &&
        !testnetAddress &&
        Boolean(mainnetAddress)));

  const { onCopy } = useClipboard(currentAddress || "");

  const handleAuthenticate = async () => {
    setIsConnecting(true);
    try {
      await authenticate();
      const net = getConfiguredStacksNetwork();
      if (net === "mainnet" && readHasMainnetInStorage()) {
        toast.success("Connected on Stacks mainnet", {
          description: "You can create campaigns, donate, and use your dashboard.",
          duration: 4000,
        });
      } else if (net === "testnet" && readHasTestnetInStorage()) {
        toast.success("Connected on Stacks testnet", {
          duration: 3000,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isProviderConflict =
        /Cannot redefine property:\s*StacksProvider/i.test(message);
      toast.error("Wallet connection failed", {
        description: isProviderConflict
          ? "Multiple Stacks wallet extensions are conflicting. Disable one of Leather/Xverse and try again."
          : "Unable to connect wallet. Ensure a Stacks wallet extension is installed and unlocked, then retry.",
        duration: 7000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isWalletConnected && currentAddress) {
    const connectLabelBase =
      network === "mainnet" ? "Stacks mainnet" : "Stacks testnet";
    return (
      <Menu placement="bottom-end">
        <MenuButton
          as={Button}
          size={size}
          w={w}
          data-testid="wallet-connect-button"
          aria-label={`Open wallet menu, ${formatStxAddress(currentAddress)}, on ${connectLabelBase}`}
          minH="11"
          {...focusVisibleProps}
          {...restButtonProps}
        >
          <Flex gap="2" align="center">
            {formatStxAddress(currentAddress)}
            {network === "mainnet" ? (
              <Tag size="sm" colorScheme="success" borderRadius="full">
                mainnet
              </Tag>
            ) : network === "testnet" ? (
              <Tag size="sm" colorScheme="orange" borderRadius="full">
                testnet
              </Tag>
            ) : null}
          </Flex>
        </MenuButton>
        <MenuList
          zIndex="popover"
          py={1}
          aria-label="Wallet actions"
        >
          <MenuItem onClick={onCopy} minH="11">
            Copy address
          </MenuItem>
          <MenuItem onClick={disconnect} minH="11">
            Disconnect
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }

  if (isWrongNetworkAccount) {
    const expected = network === "mainnet" ? "Mainnet" : "Testnet";
    const hasInstead = network === "mainnet" ? "Testnet" : "Mainnet";
    return (
      <VStack
        align="stretch"
        spacing={3}
        w={w}
        maxW="100%"
        role="status"
        aria-live="polite"
      >
        <Alert status="warning" borderRadius="lg" variant="subtle">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {expected} address required
            </AlertTitle>
            <AlertDescription fontSize="sm" color="text.primary">
              This deployment uses{" "}
              {network === "mainnet" ? "Stacks mainnet" : "Stacks testnet"}. Your
              wallet is using a {hasInstead.toLowerCase()} address. Open your
              wallet, switch to {expected} (or add a {expected} account), then
              connect again.
            </AlertDescription>
          </Box>
        </Alert>
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size={size}
            minH="11"
            colorScheme="primary"
            onClick={handleAuthenticate}
            isLoading={isConnecting}
            loadingText="Connecting"
            isDisabled={isConnecting}
            aria-busy={isConnecting}
            aria-label={`Connect a ${expected.toLowerCase()} Stacks account`}
            {...focusVisibleProps}
            flex="1"
            minW="min(100%, 11rem)"
          >
            {network === "mainnet" ? "Choose mainnet account" : "Choose testnet account"}
          </Button>
          <Button
            size={size}
            minH="11"
            variant="outline"
            onClick={disconnect}
            isDisabled={isConnecting}
            aria-label="Sign out and clear wallet connection"
            {...focusVisibleProps}
            flex="1"
            minW="min(100%, 9rem)"
          >
            Sign out
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <Button
      size={size}
      w={w}
      minH="11"
      data-testid="wallet-connect-button"
      onClick={handleAuthenticate}
      isLoading={isConnecting}
      loadingText="Connecting"
      isDisabled={isConnecting}
      aria-busy={isConnecting}
      aria-label="Connect your Stacks wallet to FundStacks"
      {...focusVisibleProps}
      {...restButtonProps}
    >
      <Flex gap="2" align="center">
        {children || "Connect Wallet"}
      </Flex>
    </Button>
  );
};

// Alias for convenience
export const ConnectWallet = ConnectWalletButton;
