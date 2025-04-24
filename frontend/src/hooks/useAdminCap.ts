import { useCurrentAccount, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariable } from '../config/networkConfig';
import { useCallback, useEffect, useState } from 'react';

export function useAdminCap() {
  const account = useCurrentAccount();
  const walletAddress = account?.address;
  const packageId = useNetworkVariable('packageId');
  const dashboardId = useNetworkVariable('dashboardId'); 
  const [adminCapId, setAdminCapId] = useState<string | null>(null);
  const [hasAdminCap, setHasAdminCap] = useState<boolean>(false);
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

  const fetchAdminCap = useCallback(async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Checking AdminCap for wallet:', walletAddress);
      console.log('Using package ID:', packageId);

      // Query for AdminCap objects owned by this address
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: walletAddress,
        filter: {
          StructType: `${packageId}::dashboard::AdminCap`
        },
        options: {
          showContent: true
        }
      });

      if (ownedObjects.data && ownedObjects.data.length > 0) {
        const adminCap = ownedObjects.data[0];
        
        if (adminCap && adminCap.data) {
          const capId = adminCap.data.objectId;
          setAdminCapId(capId);
          
          // Check if this AdminCap is revoked
          let isRevoked = false;
          if (dashboardData?.data?.content?.dataType === 'moveObject') {
            const dashboardContent = dashboardData.data.content;
            // Check if there's revoked_admin_caps in the dashboard content
            const revokedCapsString = JSON.stringify(dashboardContent.fields);
            isRevoked = revokedCapsString.includes(capId);
          }
          
          // Only set hasAdminCap to true if the cap is not revoked
          setHasAdminCap(!isRevoked);
          console.log('AdminCap found:', capId, 'Revoked:', isRevoked);
        } else {
          setHasAdminCap(false);
          setAdminCapId(null);
        }
      } else {
        setHasAdminCap(false);
        setAdminCapId(null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching AdminCap:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setHasAdminCap(false);
      setAdminCapId(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, packageId, suiClient, dashboardData]);

  useEffect(() => {
    fetchAdminCap();
  }, [fetchAdminCap]);

  return { hasAdminCap, adminCapId, isLoading, error, refreshAdminCap: fetchAdminCap };
} 