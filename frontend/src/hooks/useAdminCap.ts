import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";

export function useAdminCap() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  
  // Log the wallet address and package ID for debugging
  console.log("Current wallet address:", account?.address);
  console.log("Package ID being used:", packageId);
  
  const { data, isLoading, error } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address || "",
    filter: {
      StructType: `${packageId}::dashboard::AdminCap`
    },
    options: {
      showContent: true
    }
  }, {
    enabled: !!account?.address,
  });
  
  const adminCap = data?.data?.[0];
  const hasAdminCap = !!adminCap;
  
  // Log the result of the admin capability check
  console.log("Admin capability found:", hasAdminCap);
  if (hasAdminCap) {
    console.log("Admin capability ID:", adminCap?.data?.objectId);
  }
  
  if (error) {
    console.error("Error fetching admin capability:", error);
  }
  
  return {
    adminCap,
    adminCapId: adminCap?.data?.objectId,
    hasAdminCap,
    isLoading,
    error
  };
} 