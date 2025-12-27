import { fetch } from "undici";

async function main() {
  const contractAddress = "SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH";
  const contractName = "fundraising";
  const functionName = "get-last-campaign-id";
  const url = `https://api.mainnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;

  console.log(`Fetching from ${url}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    const data = await response.json();
    console.log("Raw Response:", JSON.stringify(data, null, 2));

    if (data.okay && data.result) {
        const hex = data.result;
        // Last byte should tell us the number if it's small
        const lastByte = hex.slice(-2);
        console.log(`Last byte: ${lastByte} (decimal: ${parseInt(lastByte, 16)})`);
    }

  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

main();
