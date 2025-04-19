import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";

export function useAdminCap() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  
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
  
  return {
    adminCap,
    adminCapId: adminCap?.data?.objectId,
    hasAdminCap,
    isLoading,
    error
  };
} 