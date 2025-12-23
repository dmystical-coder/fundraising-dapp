import { DEVNET_NETWORK } from "@/constants/devnet";
import {
  ContractCallRegularOptions,
  FinishedTxData,
  getStacksProvider,
  request,
} from "@stacks/connect";
import {
  makeContractCall,
  broadcastTransaction,
  SignedContractCallOptions,
  ClarityValue,
  serializeCV,
  PostCondition,
  PostConditionMode,
} from "@stacks/transactions";
import { generateWallet } from "@stacks/wallet-sdk";
import { DevnetWallet } from "./devnet-wallet-context";

interface DirectCallResponse {
  txid: string;
}

export const isDevnetEnvironment = () =>
  process.env.NEXT_PUBLIC_STACKS_NETWORK === "devnet";

export const isTestnetEnvironment = () =>
  process.env.NEXT_PUBLIC_STACKS_NETWORK === "testnet";

export const isMainnetEnvironment = () =>
  process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";

export type Network = "mainnet" | "testnet" | "devnet";

export const executeContractCall = async (
  txOptions: ContractCallRegularOptions,
  currentWallet: DevnetWallet | null
): Promise<DirectCallResponse> => {
  const mnemonic = currentWallet?.mnemonic;
  if (!mnemonic) throw new Error("Devnet wallet not configured");

  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "password",
  });

  const contractCallTxOptions: SignedContractCallOptions = {
    ...txOptions,
    network: DEVNET_NETWORK,
    senderKey: wallet.accounts[0].stxPrivateKey,
    functionArgs: txOptions.functionArgs as ClarityValue[],
    postConditions: txOptions.postConditions as PostCondition[],
    postConditionMode: PostConditionMode.Allow,
    fee: 1000,
  };

  const transaction = await makeContractCall(contractCallTxOptions);

  const response = await broadcastTransaction({
    transaction,
    network: contractCallTxOptions.network,
  });

  if ("error" in response) {
    console.error(response.error);
    throw new Error(response.error || "Transaction failed");
  }

  return { txid: response.txid };
};

function resolveStacksNetwork(options: ContractCallRegularOptions): Network {
  // Stacks Connect accepts `StacksNetwork` objects; WC Stacks RPC expects an implicit chain.
  // Keep our existing heuristic for now.
  const network = options.network as unknown;
  if (typeof network === "string") return network as Network;

  if (network && typeof network === "object" && "chainId" in network) {
    const chainId = (network as { chainId?: unknown }).chainId;
    if (typeof chainId === "number") {
      return chainId === 1 ? "mainnet" : "testnet";
    }
  }

  // Default to env if available, otherwise mainnet.
  if (isTestnetEnvironment()) return "testnet";
  if (isDevnetEnvironment()) return "devnet";
  return "mainnet";
}

function stacksChainIdFromNetwork(network: Network): string {
  // Reown docs: Stacks mainnet => stacks:1, testnet => stacks:2147483648
  return network === "testnet" ? "stacks:2147483648" : "stacks:1";
}

function encodeFunctionArgsForStacksRpc(args: unknown): string[] {
  if (!Array.isArray(args)) return [];

  return args.map((arg) => {
    if (typeof arg === "string") return arg;
    // Stacks RPC expects args as strings; serialize ClarityValues as 0x-prefixed hex.
    return `0x${serializeCV(arg as ClarityValue)}`;
  });
}

async function tryWalletConnectStacksCallContract(params: {
  contract: string;
  functionName: string;
  functionArgs: unknown;
  network: Network;
}): Promise<{ txid: string; transaction?: string } | null> {
  if (typeof window === "undefined") return null;
  if (params.network === "devnet") return null;

  // If the dapp uses post-conditions or sponsorship, keep the current SIP-030 flow.
  // WalletConnect Stacks RPC `stx_callContract` docs only specify contract/function/args.
  // (We can later upgrade to `stx_signTransaction` to support advanced options.)
  //
  // NOTE: We intentionally do not attempt to open/connect here; the connect UI should
  // have already established a Stacks session.
  try {
    const reown = await import("@reown/appkit/react");
    const appKitModal = reown.modal;
    if (!appKitModal) return null;

    const universalProvider = await appKitModal.getUniversalProvider();
    if (!universalProvider?.session) return null;

    const chainId = stacksChainIdFromNetwork(params.network);

    // Ensure the session actually includes stacks accounts for this chain.
    const sessionNamespaces = universalProvider.session
      .namespaces as unknown as Record<
      string,
      { accounts?: string[] } | undefined
    >;
    const stacksNs = sessionNamespaces?.stacks;
    const accounts: string[] = stacksNs?.accounts || [];
    const hasChainAccount = accounts.some((a) => a.startsWith(`${chainId}:`));
    if (!hasChainAccount) return null;

    const result = await universalProvider.request(
      {
        method: "stx_callContract",
        params: {
          contract: params.contract,
          functionName: params.functionName,
          functionArgs: encodeFunctionArgsForStacksRpc(params.functionArgs),
        },
      },
      chainId
    );

    return result as { txid: string; transaction?: string };
  } catch (err) {
    // If WC is present but the request fails, fall back to SIP-030.
    console.warn(
      "WalletConnect Stacks stx_callContract failed; falling back",
      err
    );
    return null;
  }
}

export const openContractCall = async (options: ContractCallRegularOptions) => {
  try {
    if (typeof window === "undefined") {
      throw new Error("Stacks wallet signing is only available in the browser");
    }

    const contract = `${options.contractAddress}.${options.contractName}`;

    const resolvedNetwork = resolveStacksNetwork(options);

    // Prefer WalletConnect-native Stacks JSON-RPC when an AppKit session is connected.
    // This enables mobile wallets and non-injected connectors.
    const wcResult = await tryWalletConnectStacksCallContract({
      contract,
      functionName: options.functionName,
      functionArgs: options.functionArgs,
      network: resolvedNetwork,
    });

    if (wcResult) {
      if (options.onFinish) {
        options.onFinish({ txId: wcResult.txid } as unknown as FinishedTxData);
      }
      return wcResult;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      contract,
      functionName: options.functionName,
      functionArgs: options.functionArgs,
      network: resolvedNetwork,
      postConditions: options.postConditions,
      postConditionMode:
        options.postConditionMode === PostConditionMode.Allow
          ? "allow"
          : "deny",
      sponsored: options.sponsored,
    };

    const provider = getStacksProvider();
    const result = await request(
      {
        provider,
        // If we cannot resolve a provider (no extension installed), this forces a wallet selection modal.
        forceWalletSelect: !provider,
        persistWalletSelect: true,
      },
      "stx_callContract",
      params
    );

    if (options.onFinish) {
      options.onFinish({ txId: result.txid } as unknown as FinishedTxData);
    }

    return result;
  } catch (error: unknown) {
    console.error("Failed to execute contract call:", error);
    if (error instanceof Error) {
      const msg = error.message || "";
      const looksLikeNoWallet =
        /no wallet|not installed|provider/i.test(msg) ||
        /StacksProvider|BlockstackProvider/i.test(msg);
      if (looksLikeNoWallet) {
        throw new Error(
          "No Stacks wallet provider found. Install/enable Leather or Xverse (browser extension) and try again."
        );
      }
    }
    if (
      error instanceof Error &&
      error.message?.includes("cancelled") &&
      options.onCancel
    ) {
      options.onCancel();
    }
    throw error;
  }
};
