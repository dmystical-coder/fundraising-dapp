import { callReadOnlyFunction, cvToValue } from "@stacks/transactions";
import { StacksMainnet } from "@stacks/network";

async function main() {
  const contractAddress = "SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH";
  const contractName = "fundraising";
  const functionName = "get-last-campaign-id";

  const network = new StacksMainnet();

  console.log(`Calling ${contractAddress}.${contractName}::${functionName}...`);

  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs: [],
      senderAddress: contractAddress,
      network,
    });

    const value = cvToValue(result);
    console.log("Last Campaign ID:", JSON.stringify(value, null, 2));

    // Also try to fetch campaign #4 if ID >= 4
    if (value && typeof value.value === 'bigint' && value.value >= 4n) {
        console.log("Fetching details for Campaign #4...");
        // Add logic to fetch camp 4 later if needed
    }

  } catch (error) {
    console.error("Failed to call contract:", error);
  }
}

main();
