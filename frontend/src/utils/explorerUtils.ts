/**
 * Utility functions for generating Sui Explorer (sui scan) URLs
 */
import { networkConfig } from "../config/networkConfig";

/**
 * Get the appropriate explorer base URL based on the current network
 */
function getExplorerBaseUrl(): string {
  // Get the current network from environment variables
  const currentNetwork = import.meta.env.VITE_NETWORK;
  
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
      // Force devnet if we're on a development environment (based on URL)
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("Development environment detected, using devnet for explorer");
        return "https://suiscan.xyz/devnet";
      }
      
      // Default to devnet as fallback
      return "https://suiscan.xyz/devnet";
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