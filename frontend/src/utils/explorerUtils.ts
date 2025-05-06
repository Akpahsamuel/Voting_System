/**
 * Utility functions for generating Sui Explorer (sui scan) URLs
 */
import { getNetwork } from "./networkUtils";

/**
 * Get the appropriate explorer base URL based on the current network
 */
function getExplorerBaseUrl(): string {
  // Get the current network using the getNetwork function
  const currentNetwork = getNetwork();
  
  console.log("Current network for explorer:", currentNetwork);
  
  // Return the appropriate SuiScan URL based on the network
  switch (currentNetwork) {
    case "mainnet":
      return "https://suiscan.xyz/mainnet";
    case "testnet":
      return "https://suiscan.xyz/testnet";
    case "devnet":
      return "https://suiscan.xyz/devnet";
    default:
      // If network is unknown, use testnet as fallback
      console.log("Unknown network for explorer, using testnet as fallback");
      return "https://suiscan.xyz/testnet";
  }
}

/**
 * Generate a URL to view an address on Sui Explorer
 * @param address The address to view
 */
export function getAddressUrl(address: string): string {
  return `${getExplorerBaseUrl()}/address/${address}`;
}

/**
 * Generate a URL to view a transaction on Sui Explorer
 * @param txId The transaction ID to view
 */
export function getTransactionUrl(txId: string): string {
  return `${getExplorerBaseUrl()}/tx/${txId}`;
}

/**
 * Generate a URL to view an object on Sui Explorer
 * @param objectId The object ID to view
 */
export function getObjectUrl(objectId: string): string {
  return `${getExplorerBaseUrl()}/object/${objectId}`;
}

/**
 * Open a URL in a new browser tab
 * @param url The URL to open
 */
export function openInExplorer(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}