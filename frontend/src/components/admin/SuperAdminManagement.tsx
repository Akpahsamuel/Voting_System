import React, { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, UserPlus, UserMinus, ShieldCheck, RefreshCw } from "lucide-react";
import { SuiObjectData } from "@mysten/sui/client";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// Form schema validation
const formSchema = z.object({
  address: z.string().min(1, { message: "Address is required" })
    .refine(
      (val) => val.startsWith("0x") && val.length >= 20,
      { message: "Invalid Sui address format. Address must start with '0x' and be at least 20 characters long." }
    ),
});

interface SuperAdminManagementProps {
  superAdminCapId: string;
  onRefresh?: () => void;
}

const SuperAdminManagement: React.FC<SuperAdminManagementProps> = ({ superAdminCapId, onRefresh }) => {
  const [isLoadingGrantAdmin, setIsLoadingGrantAdmin] = useState(false);
  const [isLoadingGrantSuperAdmin, setIsLoadingGrantSuperAdmin] = useState(false);
  const [isLoadingRevokeAdmin, setIsLoadingRevokeAdmin] = useState(false);
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [superAdminAddresses, setSuperAdminAddresses] = useState<string[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

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

  const handleRevokeAdmin = async (values: z.infer<typeof formSchema>) => {
    if (!superAdminCapId) {
      toast.error("SuperAdmin capability not found");
      return;
    }
    
    try {
      setIsLoadingRevokeAdmin(true);
      
      // Create a transaction to revoke admin privileges
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::revoke_admin`,
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

  const refreshData = async () => {
    try {
      setIsLoadingAdmins(true);
      await refetchDashboard();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    }
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
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="grant-admin">Grant Admin</TabsTrigger>
            <TabsTrigger value="grant-superadmin">Grant SuperAdmin</TabsTrigger>
            <TabsTrigger value="revoke-admin">Revoke Admin</TabsTrigger>
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
                {adminAddresses.map((address, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-800">
                    <div className="flex items-center">
                      <span className="text-white break-all">{address}</span>
                    </div>
                    {superAdminAddresses.includes(address) && (
                      <Badge className="ml-2 bg-purple-600">SuperAdmin</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminManagement; 