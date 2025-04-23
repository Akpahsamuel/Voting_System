import { FC, useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariable } from "../config/networkConfig";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ConnectButton } from '@mysten/dapp-kit';
import { Separator } from "../components/ui/separator";
import { TESTNET_ADMIN_CAP, DEVNET_ADMIN_CAP, MAINNET_ADMIN_CAP, TESTNET_SUPER_ADMIN_CAP, DEVNET_SUPER_ADMIN_CAP, MAINNET_SUPER_ADMIN_CAP } from '../constants';
import { Wallet, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { Badge } from "../components/ui/badge";

export const AdminDebug: FC = () => {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const [network, setNetwork] = useState<string>("unknown");
  
  // Try to determine the current network
  useEffect(() => {
    if (window.location.hostname.includes('testnet')) {
      setNetwork('testnet');
    } else if (window.location.hostname.includes('devnet')) {
      setNetwork('devnet');
    } else if (window.location.hostname.includes('localhost')) {
      setNetwork('devnet'); // Assuming local is on devnet
    } else {
      setNetwork('mainnet');
    }
  }, []);

  // Fetch all objects owned by current wallet
  const { data: allObjects, isLoading: isLoadingObjects, refetch: refetchObjects } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || "",
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!account?.address,
    }
  );

  // Fetch admin cap specifically
  const { data: adminCapData, isLoading: isLoadingAdminCap } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || "",
      filter: {
        StructType: `${packageId}::dashboard::AdminCap`
      },
      options: {
        showContent: true
      }
    },
    {
      enabled: !!account?.address,
    }
  );

  // Fetch super admin cap specifically
  const { data: superAdminCapData, isLoading: isLoadingSuperAdminCap } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || "",
      filter: {
        StructType: `${packageId}::dashboard::SuperAdminCap`
      },
      options: {
        showContent: true
      }
    },
    {
      enabled: !!account?.address,
    }
  );

  const expectedAdminCap = 
    network === 'testnet' ? TESTNET_ADMIN_CAP : 
    network === 'devnet' ? DEVNET_ADMIN_CAP : 
    MAINNET_ADMIN_CAP;
    
  const expectedSuperAdminCap = 
    network === 'testnet' ? TESTNET_SUPER_ADMIN_CAP : 
    network === 'devnet' ? DEVNET_SUPER_ADMIN_CAP : 
    MAINNET_SUPER_ADMIN_CAP;

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center">
            <Activity className="mr-2 h-6 w-6 text-blue-400" />
            Admin Debug Information
          </CardTitle>
          <CardDescription>
            Diagnostic information to help troubleshoot admin access issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">Wallet Status</h3>
            {!account ? (
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-amber-400 flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  No wallet connected
                </p>
                <div className="mt-2">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-green-400 flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  Wallet connected
                </p>
                <p className="text-white mt-2 break-all">
                  Address: {account.address}
                </p>
              </div>
            )}
          </div>

          <Separator className="bg-gray-700" />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Configuration</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 text-white"
                onClick={() => {
                  refetchObjects();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-blue-400 mb-2">Network Information</p>
                <p className="text-white">Detected Network: <span className="text-green-400">{network}</span></p>
                <p className="text-white">Package ID: <span className="text-yellow-400 break-all">{packageId}</span></p>
              </div>
              
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-blue-400 mb-2">Expected Capability IDs</p>
                <p className="text-white break-all">AdminCap: <span className="text-yellow-400">{expectedAdminCap}</span></p>
                <p className="text-white break-all">SuperAdminCap: <span className="text-yellow-400">{expectedSuperAdminCap}</span></p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">Admin Capabilities</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-blue-400 mb-2 flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Capability Status <Badge className="ml-2 bg-green-600">Grants Admin Access</Badge>
                </p>
                
                {isLoadingAdminCap ? (
                  <p className="text-white">Loading admin capability...</p>
                ) : adminCapData?.data?.length ? (
                  <div>
                    <p className="text-green-400">Admin capability found!</p>
                    <p className="text-white break-all mt-2">
                      ID: {adminCapData.data[0]?.data?.objectId}
                    </p>
                  </div>
                ) : (
                  <p className="text-amber-400">No admin capability found - SuperAdminCap can still grant access</p>
                )}
              </div>
              
              <div className="p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                <p className="text-blue-400 mb-2 flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  SuperAdmin Capability Status <Badge className="ml-2 bg-purple-600">Grants Admin Access</Badge>
                </p>
                
                {isLoadingSuperAdminCap ? (
                  <p className="text-white">Loading superadmin capability...</p>
                ) : superAdminCapData?.data?.length ? (
                  <div>
                    <p className="text-green-400">SuperAdmin capability found!</p>
                    <p className="text-white break-all mt-2">
                      ID: {superAdminCapData.data[0]?.data?.objectId}
                    </p>
                    <p className="text-blue-400 text-sm mt-2">SuperAdminCap grants both admin access and the ability to grant admin to others</p>
                  </div>
                ) : (
                  <p className="text-amber-400">No superadmin capability found - AdminCap can still grant access</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">All Owned Objects ({allObjects?.data?.length || 0})</h3>
            
            {isLoadingObjects ? (
              <p className="text-white">Loading objects...</p>
            ) : allObjects?.data?.length ? (
              <div className="max-h-80 overflow-y-auto p-4 border border-dashed rounded-md border-gray-700 bg-gray-800">
                {allObjects.data.map((obj, index) => (
                  <div key={index} className="mb-4 pb-4 border-b border-gray-700 last:border-b-0 last:mb-0 last:pb-0">
                    <p className="text-blue-400">Object #{index + 1}</p>
                    <p className="text-white break-all">ID: {obj.data?.objectId}</p>
                    <p className="text-white break-all">Type: {obj.data?.type}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-red-400">No objects found in this wallet</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400">
            Use the information above to diagnose admin access issues.
          </p>
          <Button
            variant="default"
            onClick={() => window.location.href = '/admin'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Admin Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminDebug; 