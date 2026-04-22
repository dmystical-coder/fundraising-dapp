import { DEVNET_NETWORK } from "@/constants/devnet";
import {
  getStacksProvider,
  request,
} from "@stacks/connect";
import {
  makeContractCall,
  broadcastTransaction,
  SignedContractCallOptions,
  ClarityValue,
  PostCondition,
  PostConditionMode,
} from "@stacks/transactions";
import { generateWallet } from "@stacks/wallet-sdk";
import { DevnetWallet } from "./devnet-wallet-context";

export interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[] | unknown[];
  network?: unknown;
  anchorMode?: number;
  postConditions?: PostCondition[];
  postConditionMode?: PostConditionMode;
  sponsored?: boolean;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

interface DirectCallResponse {
  txid: string;
}

export type Network = "mainnet" | "testnet" | "devnet";

/**
 * Resolve the configured Stacks network with a production-safe fallback.
 * In hosted environments the public env var may be missing at runtime/build time.
 */
export const getConfiguredStacksNetwork = (): Network => {
  const rawNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK;
  if (
    rawNetwork === "devnet" ||
    rawNetwork === "testnet" ||
    rawNetwork === "mainnet"
  ) {
    return rawNetwork;
  }
  return "mainnet";
};

export const isDevnetEnvironment = () =>
  getConfiguredStacksNetwork() === "devnet";

export const isTestnetEnvironment = () =>
  getConfiguredStacksNetwork() === "testnet";

export const isMainnetEnvironment = () =>
  getConfiguredStacksNetwork() === "mainnet";

export const executeContractCall = async (
  txOptions: ContractCallOptions,
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

function resolveStacksNetwork(options: ContractCallOptions): Network {
  const network = options.network as unknown;
  if (typeof network === "string") return network as Network;

  if (network && typeof network === "object" && "chainId" in network) {
    const chainId = (network as { chainId?: unknown }).chainId;
    if (typeof chainId === "number") {
      return chainId === 1 ? "mainnet" : "testnet";
    }
  }

  if (isTestnetEnvironment()) return "testnet";
  if (isDevnetEnvironment()) return "devnet";
  return "mainnet";
}

/**
 * Open a contract call for signing via @stacks/connect (Leather / Xverse).
 */
export const openContractCall = async (options: ContractCallOptions) => {
  try {
    if (typeof window === "undefined") {
      throw new Error("Stacks wallet signing is only available in the browser");
    }

    const contract = `${options.contractAddress}.${options.contractName}`;
    const resolvedNetwork = resolveStacksNetwork(options);

    if (resolvedNetwork === "devnet") {
      throw new Error(
        "openContractCall is not supported for devnet. Use executeContractCall instead."
      );
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
        forceWalletSelect: !provider,
        persistWalletSelect: true,
      },
      "stx_callContract",
      params
    );

    if (options.onFinish && result.txid) {
      options.onFinish({ txId: result.txid });
    }

    return result;
  } catch (error: unknown) {
    console.error("Failed to execute contract call:", error);

    if (
      error instanceof Error &&
      error.message?.toLowerCase().includes("cancel") &&
      options.onCancel
    ) {
      options.onCancel();
      return;
    }

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

    throw error;
  }
};
