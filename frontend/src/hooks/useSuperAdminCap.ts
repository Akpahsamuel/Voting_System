import { useCurrentAccount, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariableString } from '../config/networkConfig';
import { useCallback, useEffect, useState } from 'react';

export function useSuperAdminCap() {
  const account = useCurrentAccount();
  const walletAddress = account?.address;
  const packageId = useNetworkVariableString('packageId');
  const dashboardId = useNetworkVariableString('dashboardId'); 
  const [superAdminCapId, setSuperAdminCapId] = useState<string | null>(null);
  const [hasSuperAdminCap, setHasSuperAdminCap] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const suiClient = useSuiClient();

  // Query for dashboard data to check revoked caps
  const { data: dashboardData } = useSuiClientQuery('getObject', {
    id: dashboardId,
    options: {
      showContent: true,
    },
  });

  const fetchSuperAdminCap = useCallback(async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Checking SuperAdminCap for wallet:', walletAddress);
      console.log('Using package ID:', packageId);

      // Query for SuperAdminCap objects owned by this address
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: walletAddress,
        filter: {
          StructType: `${packageId}::dashboard::SuperAdminCap`
        },
        options: {
          showContent: true
        }
      });

      if (ownedObjects.data && ownedObjects.data.length > 0) {
        const superAdminCap = ownedObjects.data[0];
        
        if (superAdminCap && superAdminCap.data) {
          const capId = superAdminCap.data.objectId;
          setSuperAdminCapId(capId);
          
          // Check if this SuperAdminCap is revoked
          let isRevoked = false;
          if (dashboardData?.data?.content?.dataType === 'moveObject') {
            const dashboardContent = dashboardData.data.content;
            // Check if there's revoked_super_admin_caps in the dashboard content
            const revokedCapsString = JSON.stringify(dashboardContent.fields);
            isRevoked = revokedCapsString.includes(capId);
          }
          
          // Only set hasSuperAdminCap to true if the cap is not revoked
          setHasSuperAdminCap(!isRevoked);
          console.log('SuperAdminCap found:', capId, 'Revoked:', isRevoked);
        } else {
          setHasSuperAdminCap(false);
          setSuperAdminCapId(null);
        }
      } else {
        setHasSuperAdminCap(false);
        setSuperAdminCapId(null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching SuperAdminCap:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setHasSuperAdminCap(false);
      setSuperAdminCapId(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, packageId, suiClient, dashboardData]);

  useEffect(() => {
    fetchSuperAdminCap();
  }, [fetchSuperAdminCap]);

  return { hasSuperAdminCap, superAdminCapId, isLoading, error, refreshSuperAdminCap: fetchSuperAdminCap };
} 