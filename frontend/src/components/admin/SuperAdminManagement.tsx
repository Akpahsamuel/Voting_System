import React, { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, UserPlus, UserMinus, ShieldCheck, RefreshCw, Copy, ExternalLink, AlertCircle, Info as InfoIcon } from "lucide-react";
import { SuiObjectData } from "@mysten/sui/client";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
// Commenting out imports that are causing errors
// import { DEVNET_PACKAGE_ID } from "../../config/constants";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
// import { parseAdminAddressesFromDashboard } from "../../utils/parseAdminAddress";
// import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
// import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
// import { CheckCircleIcon, ClipboardIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { getAddressUrl, openInExplorer } from "../../utils/explorerUtils";

// Import shadcn components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";

// Form schema validation
const formSchema = z.object({
  address: z.string().min(1, { message: "Address is required" })
    .refine(
      (val) => val.startsWith("0x") && val.length >= 20,
      { message: "Invalid Sui address format. Address must start with '0x' and be at least 20 characters long." }
    )
});

interface SuperAdminManagementProps {
  superAdminCapId: string;
  onRefresh?: () => void;
}

const SuperAdminManagement: React.FC<SuperAdminManagementProps> = ({ superAdminCapId, onRefresh }) => {
  const [isLoadingGrantAdmin, setIsLoadingGrantAdmin] = useState(false);
  const [isLoadingGrantSuperAdmin, setIsLoadingGrantSuperAdmin] = useState(false);
  const [isLoadingRevokeAdmin, setIsLoadingRevokeAdmin] = useState(false);
  const [isLoadingRevokeSuperAdmin, setIsLoadingRevokeSuperAdmin] = useState(false);
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [superAdminAddresses, setSuperAdminAddresses] = useState<string[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [adminCapabilities, setAdminCapabilities] = useState<{address: string, capId: string}[]>([]);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState<boolean>(false);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Fetch dashboard data to get admin and superadmin addresses
  const { data: dashboardData, refetch: refetchDashboard } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  // Parse addresses from dashboard data
  const parseAddressesFromDashboard = () => {
    if (!dashboardData?.data) return;
    
    try {
      const dashboardObj = dashboardData.data as SuiObjectData;
      if (dashboardObj.content?.dataType !== "moveObject") return;
      
      console.log("Dashboard data for admin parsing:", dashboardObj.content.fields);
      
      const fields = dashboardObj.content.fields as any;
      
      // Parse admin addresses
      const rawAdminData = fields?.admin_addresses;
      const adminDataString = JSON.stringify(rawAdminData);
      const adminAddressMatches = adminDataString.match(/0x[a-fA-F0-9]{40,}/g);
      
      if (adminAddressMatches && adminAddressMatches.length > 0) {
        console.log("Found admin addresses:", adminAddressMatches);
        setAdminAddresses(adminAddressMatches);
      }
      
      // Parse superadmin addresses
      const rawSuperAdminData = fields?.super_admin_addresses;
      const superAdminDataString = JSON.stringify(rawSuperAdminData);
      const superAdminAddressMatches = superAdminDataString.match(/0x[a-fA-F0-9]{40,}/g);
      
      if (superAdminAddressMatches && superAdminAddressMatches.length > 0) {
        console.log("Found superadmin addresses:", superAdminAddressMatches);
        setSuperAdminAddresses(superAdminAddressMatches);
      }
      
      setIsLoadingAdmins(false);
    } catch (error) {
      console.error("Error parsing addresses from dashboard:", error);
      setFetchError("Error parsing administrator data");
      setIsLoadingAdmins(false);
    }
  };

  // Effect to parse dashboard data when it changes
  useEffect(() => {
    if (dashboardData?.data) {
      parseAddressesFromDashboard();
    }
  }, [dashboardData]);

  // Initialize form with react-hook-form and zod validation
  const grantAdminForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const grantSuperAdminForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const revokeAdminForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const revokeSuperAdminForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const handleGrantAdmin = async (values: z.infer<typeof formSchema>) => {
    if (!superAdminCapId) {
      toast.error("SuperAdmin capability not found");
      return;
    }
    
    try {
      setIsLoadingGrantAdmin(true);
      
      // Create a transaction to grant admin privileges using superadmin capability
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::grant_admin_super`,
        arguments: [
          tx.object(superAdminCapId),
          tx.object(dashboardId),
          tx.pure.address(values.address)
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: async (result) => {
          console.log("Grant admin transaction successful:", result);
          toast.success(`Admin capability granted to ${values.address}`);
          grantAdminForm.reset();
          await refetchDashboard();
          if (onRefresh) onRefresh();
        },
        onError: (error) => {
          console.error("Grant admin transaction failed:", error);
          toast.error(`Failed to grant admin: ${error.message}`);
        },
      });
    } catch (error) {
      console.error("Error in grant admin:", error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingGrantAdmin(false);
    }
  };

  const handleGrantSuperAdmin = async (values: z.infer<typeof formSchema>) => {
    if (!superAdminCapId) {
      toast.error("SuperAdmin capability not found");
      return;
    }
    
    try {
      setIsLoadingGrantSuperAdmin(true);
      
      // Create a transaction to grant superadmin privileges
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::grant_super_admin`,
        arguments: [
          tx.object(superAdminCapId),
          tx.object(dashboardId),
          tx.pure.address(values.address)
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: async (result) => {
          console.log("Grant superadmin transaction successful:", result);
          toast.success(`SuperAdmin capability granted to ${values.address}`);
          grantSuperAdminForm.reset();
          await refetchDashboard();
          if (onRefresh) onRefresh();
        },
        onError: (error) => {
          console.error("Grant superadmin transaction failed:", error);
          toast.error(`Failed to grant superadmin: ${error.message}`);
        },
      });
    } catch (error) {
      console.error("Error in grant superadmin:", error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingGrantSuperAdmin(false);
    }
  };

  const fetchAdminCapabilities = async () => {
    if (adminAddresses.length === 0) return;
    
    setIsLoadingCapabilities(true);
    try {
      // We need to search for owned objects for each admin address
      const capabilities: {address: string, capId: string}[] = [];
      
      // Process in batches to avoid too many parallel requests
      for (let i = 0; i < adminAddresses.length; i++) {
        const address = adminAddresses[i];
        try {
          const ownedObjects = await suiClient.getOwnedObjects({
            owner: address,
            filter: {
              StructType: `${packageId}::dashboard::AdminCap`
            },
            options: {
              showContent: true
            }
          });
          
          if (ownedObjects.data && ownedObjects.data.length > 0) {
            ownedObjects.data.forEach(obj => {
              if (obj.data) {
                capabilities.push({
                  address,
                  capId: obj.data.objectId
                });
              }
            });
          }
          
          // If this is a superadmin, also fetch their SuperAdminCap
          if (superAdminAddresses.includes(address)) {
            const superAdminObjects = await suiClient.getOwnedObjects({
              owner: address,
              filter: {
                StructType: `${packageId}::dashboard::SuperAdminCap`
              },
              options: {
                showContent: true
              }
            });
            
            if (superAdminObjects.data && superAdminObjects.data.length > 0) {
              superAdminObjects.data.forEach(obj => {
                if (obj.data) {
                  capabilities.push({
                    address,
                    capId: obj.data.objectId
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching capabilities for ${address}:`, error);
        }
      }
      
      setAdminCapabilities(capabilities);
    } catch (error) {
      console.error("Error fetching admin capabilities:", error);
    } finally {
      setIsLoadingCapabilities(false);
    }
  };

  const handleRevokeAdmin = async (values: z.infer<typeof formSchema>) => {
    if (!superAdminCapId) {
      toast.error("SuperAdmin capability not found");
      return;
    }
    
    // Get the capability ID for the admin to revoke
    // Since we need the capability ID for the current contract
    let adminCapId = "";
    for (const cap of adminCapabilities) {
      if (cap.address === values.address) {
        adminCapId = cap.capId;
        break;
      }
    }
    
    if (!adminCapId) {
      toast.error("Could not find AdminCap ID for this address. Cannot revoke admin privileges.");
      return;
    }
    
    try {
      setIsLoadingRevokeAdmin(true);
      
      // Create a transaction to revoke admin privileges using the original contract's required arguments
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::revoke_admin`,
        arguments: [
          tx.object(superAdminCapId),
          tx.object(dashboardId),
          tx.object(adminCapId), // Include the admin cap ID that the current contract requires
          tx.pure.address(values.address)
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: async (result) => {
          console.log("Revoke admin transaction successful:", result);
          toast.success(`Admin privileges revoked from ${values.address}`);
          revokeAdminForm.reset();
          await refetchDashboard();
          if (onRefresh) onRefresh();
        },
        onError: (error) => {
          console.error("Revoke admin transaction failed:", error);
          toast.error(`Failed to revoke admin: ${error.message}`);
        },
      });
    } catch (error) {
      console.error("Error in revoke admin:", error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingRevokeAdmin(false);
    }
  };

  const handleRevokeSuperAdmin = async (values: z.infer<typeof formSchema>) => {
    if (!superAdminCapId) {
      toast.error("SuperAdmin capability not found");
      return;
    }
    
    // Get the dashboard data to identify the deployer (first super admin)
    // Assuming the first address in the super admin list is the deployer/creator
    if (superAdminAddresses.length > 0 && values.address === superAdminAddresses[0]) {
      toast.error("Cannot revoke the deployer's super admin privileges");
      return;
    }
    
    // Get the capability ID for the super admin to revoke
    // Since we need the capability ID for the current contract
    let targetSuperAdminCapId = "";
    for (const cap of adminCapabilities) {
      if (cap.address === values.address) {
        targetSuperAdminCapId = cap.capId;
        break;
      }
    }
    
    if (!targetSuperAdminCapId) {
      toast.error("Could not find SuperAdminCap ID for this address. Cannot revoke super admin privileges.");
      return;
    }
    
    try {
      setIsLoadingRevokeSuperAdmin(true);
      
      // Create a transaction to revoke super admin privileges using the required parameters
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::revoke_super_admin`,
        arguments: [
          tx.object(superAdminCapId),
          tx.object(dashboardId),
          tx.object(targetSuperAdminCapId), // Include the super admin cap ID that the current contract requires
          tx.pure.address(values.address)
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: async (result) => {
          console.log("Revoke super admin transaction successful:", result);
          toast.success(`SuperAdmin privileges revoked from ${values.address}`);
          revokeSuperAdminForm.reset();
          await refetchDashboard();
          if (onRefresh) onRefresh();
        },
        onError: (error) => {
          console.error("Revoke super admin transaction failed:", error);
          
          // Check for specific error related to revoking deployer
          if (error.message && error.message.includes("ECannotRevokeDeployer")) {
            toast.error("Cannot revoke the package deployer's super admin privileges");
          } else {
            toast.error(`Failed to revoke super admin: ${error.message}`);
          }
        },
      });
    } catch (error) {
      console.error("Error in revoke super admin:", error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingRevokeSuperAdmin(false);
    }
  };

  const refreshData = async () => {
    try {
      setIsLoadingAdmins(true);
      await refetchDashboard();
      // Fetch capabilities after dashboard is refreshed
      await fetchAdminCapabilities();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Utility functions
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

  // Call fetchAdminCapabilities when adminAddresses changes
  useEffect(() => {
    if (adminAddresses.length > 0) {
      fetchAdminCapabilities();
    }
  }, [adminAddresses]);

  // Helper function to find capability ID for an address
  const getCapabilityId = (address: string, isSuper: boolean = false): string => {
    const capabilities = adminCapabilities.filter(cap => 
      cap.address === address
    );
    
    if (capabilities.length === 0) return "";
    return capabilities[0].capId;
  };

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl text-white">SuperAdmin Panel</CardTitle>
            <CardDescription>Manage admins and superadmins</CardDescription>
          </div>
          <Button onClick={refreshData} variant="ghost" size="icon">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grant-admin">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="grant-admin">Grant Admin</TabsTrigger>
            <TabsTrigger value="grant-superadmin">Grant SuperAdmin</TabsTrigger>
            <TabsTrigger value="revoke-admin">Revoke Admin</TabsTrigger>
            <TabsTrigger value="revoke-superadmin">Revoke SuperAdmin</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grant-admin">
            <Form {...grantAdminForm}>
              <form onSubmit={grantAdminForm.handleSubmit(handleGrantAdmin)} className="space-y-4">
                <FormField
                  control={grantAdminForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription>
                        Enter the address to grant admin privileges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoadingGrantAdmin}
                >
                  {isLoadingGrantAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting Admin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Grant Admin Privileges
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="grant-superadmin">
            <Form {...grantSuperAdminForm}>
              <form onSubmit={grantSuperAdminForm.handleSubmit(handleGrantSuperAdmin)} className="space-y-4">
                <FormField
                  control={grantSuperAdminForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription>
                        Enter the address to grant superadmin privileges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoadingGrantSuperAdmin}
                >
                  {isLoadingGrantSuperAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting SuperAdmin...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Grant SuperAdmin Privileges
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="revoke-admin">
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-md p-4 mb-4">
              <h4 className="text-blue-300 font-medium flex items-center gap-2 mb-1">
                <InfoIcon className="h-4 w-4" /> Authorization Model
              </h4>
              <p className="text-blue-100/80 text-sm">
                Admin privileges are based on address registration. When an address is revoked,
                it is removed from the admin registry in the dashboard. All capabilities for that
                address will no longer work, regardless of who possesses them.
              </p>
            </div>
            <Form {...revokeAdminForm}>
              <form onSubmit={revokeAdminForm.handleSubmit(handleRevokeAdmin)} className="space-y-4">
                <FormField
                  control={revokeAdminForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription>
                        Enter the address to revoke admin privileges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoadingRevokeAdmin}
                >
                  {isLoadingRevokeAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoking Admin...
                    </>
                  ) : (
                    <>
                      <UserMinus className="mr-2 h-4 w-4" />
                      Revoke Admin Privileges
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="revoke-superadmin">
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-md p-4 mb-4">
              <h4 className="text-blue-300 font-medium flex items-center gap-2 mb-1">
                <InfoIcon className="h-4 w-4" /> Authorization Model
              </h4>
              <p className="text-blue-100/80 text-sm">
                SuperAdmin privileges are based on address registration. When an address is revoked,
                it is removed from the superadmin registry in the dashboard. All superadmin capabilities 
                for that address will no longer work, regardless of who possesses them.
              </p>
            </div>
            <Form {...revokeSuperAdminForm}>
              <form onSubmit={revokeSuperAdminForm.handleSubmit(handleRevokeSuperAdmin)} className="space-y-4">
                <FormField
                  control={revokeSuperAdminForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription>
                        Enter the address to revoke super admin privileges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoadingRevokeSuperAdmin}
                >
                  {isLoadingRevokeSuperAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoking SuperAdmin...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Revoke SuperAdmin Privileges
                    </>
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Current Super Admins</h3>
              {isLoadingAdmins ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : fetchError ? (
                <Alert variant="destructive" className="bg-red-900 border-red-800 text-white">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
              ) : superAdminAddresses.length === 0 ? (
                <Alert className="bg-gray-800 border-gray-700 text-gray-300">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>No Super Admins</AlertTitle>
                  <AlertDescription>There are no super admins registered yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {superAdminAddresses.map((address, index) => {
                    // Find superadmin capability ID
                    const capabilityId = adminCapabilities.find(cap => 
                      cap.address === address && superAdminAddresses.includes(address)
                    )?.capId || "";
                    
                    // Determine if this is the deployer (first address in the list)
                    const isDeployer = index === 0 || (superAdminAddresses.length > 0 && address === superAdminAddresses[0]);
                    
                    return (
                      <div key={address} className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-mono text-gray-300">{truncateAddress(address)}</span>
                            {isDeployer && (
                              <Badge className="bg-green-600 text-white text-xs">Deployer</Badge>
                            )}
                          </div>
                          {capabilityId && (
                            <span className="text-xs text-gray-400 font-mono ml-6 mt-1">
                              Cap ID: {truncateAddress(capabilityId)}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-400"
                            onClick={() => copyToClipboard(address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-400"
                            onClick={() => openInExplorer(address)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-400"
                            onClick={() => {
                              revokeSuperAdminForm.setValue("address", address);
                            }}
                            disabled={isDeployer}
                            title={isDeployer ? "Package deployer cannot be revoked" : "Revoke super admin privileges"}
                          >
                            <UserMinus className={`h-4 w-4 ${isDeployer ? 'text-gray-500' : 'text-red-500'}`} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="text-gray-400 border-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-6" />
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Current Administrators</h3>
            {isLoadingAdmins ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span className="text-white">Loading administrators...</span>
              </div>
            ) : fetchError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fetchError}</AlertDescription>
              </Alert>
            ) : adminAddresses.length === 0 ? (
              <p className="text-gray-400">No administrators found</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {adminAddresses.map((address, index) => {
                  const capabilityId = getCapabilityId(address);
                  return (
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-800">
                      <div className="flex flex-col">
                        <span className="text-white break-all">{address}</span>
                        {capabilityId && (
                          <span className="text-xs text-gray-400 font-mono">
                            Cap ID: {truncateAddress(capabilityId)}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2 items-center">
                        {superAdminAddresses.includes(address) && (
                          <Badge className="bg-purple-600">SuperAdmin</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-400"
                          onClick={() => {
                            revokeAdminForm.setValue("address", address);
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminManagement; 