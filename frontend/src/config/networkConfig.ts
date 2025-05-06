import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";
import { DEVNET_PACKAGE_ID, TESTNET_PACKAGE_ID, MAINNET_PACKAGE_ID, DEVNET_DASHBOARD_ID, TESTNET_DASHBOARD_ID, MAINNET_DASHBOARD_ID } from "../constants";

// Define the structure of our network variables
export type NetworkVariables = {
  packageId: string;
  dashboardId: string;
};

const { networkConfig, useNetworkVariable: originalUseNetworkVariable } = createNetworkConfig({
  localnet: { 
    url: getFullnodeUrl("localnet"),
    variables: {
      packageId: "",
      dashboardId: "",
    } as NetworkVariables
  },
  devnet: {
    url: getFullnodeUrl("devnet"),
    variables: {
      packageId: DEVNET_PACKAGE_ID,
      dashboardId: DEVNET_DASHBOARD_ID,
    } as NetworkVariables
  },
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      packageId: TESTNET_PACKAGE_ID,
      dashboardId: TESTNET_DASHBOARD_ID,
    } as NetworkVariables
  },
  mainnet: {
    url: getFullnodeUrl("mainnet"),
    variables: {
      packageId: MAINNET_PACKAGE_ID,
      dashboardId: MAINNET_DASHBOARD_ID,
    } as NetworkVariables
  },
});

// Export the network config
export { networkConfig };

// Export the original hook with type assertion
export function useNetworkVariable(name: "packageId" | "dashboardId"): string {
  return originalUseNetworkVariable(name as any);
}

// Export a wrapper with explicit string return type
export function useNetworkVariableString(name: "packageId" | "dashboardId"): string {
  return originalUseNetworkVariable(name as any);
}