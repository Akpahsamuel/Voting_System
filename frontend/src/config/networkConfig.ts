import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";
import { DEVNET_PACKAGE_ID, TESTNET_PACKAGE_ID, MAINNET_PACKAGE_ID, DEVNET_DASHBOARD_ID, TESTNET_DASHBOARD_ID, MAINNET_DASHBOARD_ID } from "../constants";

// Define the structure of our network variables
export type NetworkVariables = {
  packageId: string;
  dashboardId: string;
};

const { networkConfig, useNetworkVariable } = createNetworkConfig<NetworkVariables>({
  localnet: { 
    url: getFullnodeUrl("localnet"),
    variables: {
      packageId: "",
      dashboardId: "",
    }
  },
  devnet: {
    url: getFullnodeUrl("devnet"),
    variables: {
      packageId: DEVNET_PACKAGE_ID,
      dashboardId: DEVNET_DASHBOARD_ID,
    }
  },
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      packageId: TESTNET_PACKAGE_ID,
      dashboardId: TESTNET_DASHBOARD_ID,
    }
  },
  mainnet: {
    url: getFullnodeUrl("mainnet"),
    variables: {
      packageId: MAINNET_PACKAGE_ID,
      dashboardId: MAINNET_DASHBOARD_ID,
    }
  },
});

// Export type-safe hook
export { networkConfig, useNetworkVariable };