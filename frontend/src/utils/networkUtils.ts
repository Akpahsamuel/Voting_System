type Network = 'testnet' | 'devnet' | 'mainnet';

export const getNetwork = (): Network => {
  // First check localStorage
  const savedNetwork = localStorage.getItem('selectedNetwork') as Network;
  
  // Fall back to environment variable
  const envNetwork = import.meta.env.VITE_NETWORK as Network;
  
  // If neither exists or is valid, default to testnet
  const networks: Network[] = ['mainnet', 'devnet', 'testnet'];
  const network = savedNetwork || envNetwork;
  
  if (!networks.includes(network)) {
    return 'testnet';
  }
  
  return network;
};

export const setNetwork = (network: Network): void => {
  localStorage.setItem('selectedNetwork', network);
};

// Map of features that are available on each network
const networkFeatures: Record<Network, string[]> = {
  mainnet: ['wallet', 'statistics'], // Limited features on mainnet
  testnet: ['wallet', 'statistics', 'proposal', 'ballot', 'dashboard'], // All features
  devnet: ['wallet', 'statistics', 'proposal', 'ballot', 'dashboard'] // All features
};

// Feature check function to determine if a feature is available on the current network
export const isFeatureAvailable = (feature: string): boolean => {
  const currentNetwork = getNetwork();
  return networkFeatures[currentNetwork]?.includes(feature) || false;
};

// Get a user-friendly message for unavailable features
export const getFeatureUnavailableMessage = (feature: string): string => {
  const currentNetwork = getNetwork();
  
  if (currentNetwork === 'mainnet') {
    return `This feature is coming soon to mainnet. Please switch to testnet or devnet to use it now.`;
  }
  
  return `This feature is not available on ${currentNetwork}.`;
}; 