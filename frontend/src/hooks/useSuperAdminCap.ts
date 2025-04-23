import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariable } from '../config/networkConfig';

export function useSuperAdminCap() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  
  // Log the wallet address and package ID for debugging
  console.log("Current wallet address (SuperAdmin check):", account?.address);
  console.log("Package ID being used (SuperAdmin check):", packageId);
  
  const { data, isLoading, error, refetch } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address || "",
    filter: {
      StructType: `${packageId}::dashboard::SuperAdminCap`
    },
    options: {
      showContent: true
    }
  }, {
    enabled: !!account?.address,
  });
  
  const superAdminCap = data?.data?.[0];
  const hasSuperAdminCap = !!superAdminCap;
  
  // Log the result of the superadmin capability check
  console.log("SuperAdmin capability found:", hasSuperAdminCap);
  if (hasSuperAdminCap) {
    console.log("SuperAdmin capability ID:", superAdminCap?.data?.objectId);
  }
  
  if (error) {
    console.error("Error fetching superadmin capability:", error);
  }
  
  return {
    superAdminCap,
    superAdminCapId: superAdminCap?.data?.objectId,
    hasSuperAdminCap,
    isLoading,
    error,
    refetch
  };
} 