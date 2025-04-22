import { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, UserPlus, ShieldCheck, ExternalLink, Copy } from "lucide-react";
import { SuiObjectData } from "@mysten/sui/client";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";

// Form schema validation
const formSchema = z.object({
  address: z.string().min(1, { message: "Address is required" })
    .refine(
      (val) => val.startsWith("0x") && val.length >= 20,
      { message: "Invalid Sui address format. Address must start with '0x' and be at least 20 characters long." }
    ),
});

const GrantAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { adminCapId } = useAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Fetch dashboard data to get admin addresses
  const { data: dashboardData, refetch: refetchDashboard } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  // Extract admin addresses from dashboard data
  useEffect(() => {
    if (!dashboardData?.data) return;
    
    try {
      const dashboardObj = dashboardData.data as SuiObjectData;
      if (dashboardObj.content?.dataType !== "moveObject") return;
      
      const fields = dashboardObj.content.fields as any;
      
      // Dashboard.admin_addresses is a VecSet<address>
      // Try to extract it in different possible formats
      let addresses: string[] = [];
      
      if (fields?.admin_addresses) {
        const adminSet = fields.admin_addresses;
        
        // Handle different VecSet serialization formats
        if (Array.isArray(adminSet)) {
          // Direct array format
          addresses = adminSet;
        } else if (adminSet.contents && Array.isArray(adminSet.contents)) {
          // VecSet with contents field
          addresses = adminSet.contents;
        } else if (typeof adminSet === 'object') {
          // Try to extract keys from object representation
          addresses = Object.values(adminSet).filter(val => 
            typeof val === 'string' && val.startsWith('0x')
          ) as string[];
        }
      }
      
      console.log("Extracted admin addresses:", addresses);
      setAdminAddresses(addresses);
    } catch (error) {
      console.error("Error parsing admin addresses:", error);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [dashboardData]);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminCapId) {
      toast.error("Admin capability not found");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Starting grant admin transaction with:", {
        packageId,
        dashboardId,
        adminCapId,
        recipientAddress: values.address
      });
      
      // Create a transaction to grant admin privileges
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::grant_admin`,
        arguments: [
          tx.object(adminCapId),
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
          form.reset();
          await refetchDashboard();
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Grant admin transaction failed:", error);
          let errorMessage = error.message;
          
          // Check for common contract errors
          if (errorMessage.includes("EInvalidOtw")) {
            errorMessage = "Invalid one-time witness error. Please contact the developer.";
          } else if (errorMessage.includes("AdminCap")) {
            errorMessage = "Admin capability error. You may not have permission to perform this action.";
          }
          
          toast.error(`Error granting admin capability: ${errorMessage}`);
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      console.error("Exception in grant admin:", error);
      toast.error(`Error: ${error.message || error}`);
      setIsLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

  const openInExplorer = (address: string) => {
    const network = window.location.hostname.includes('testnet') ? 'testnet' : 'mainnet';
    const url = `https://explorer.sui.io/address/${address}?network=${network}`;
    window.open(url, '_blank');
  };
  
  return (
    <div className="space-y-8">
      <Card className="bg-black/30 border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-400" />
            Grant Admin Access
          </CardTitle>
          <CardDescription>
            Provide a Sui address to grant administrator privileges to another user
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0x..." 
                        {...field} 
                        className="w-full font-mono" 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the complete Sui wallet address that will receive admin privileges
                    </FormDescription>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto ml-auto bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={isLoading || !form.formState.isValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting access...
                    </>
                  ) : (
                    "Grant Admin Capability"
                  )}
                </Button>
              </div>
              
              {adminCapId ? (
                <Alert className="mt-4 bg-blue-900/20 border-blue-800/30">
                  <AlertDescription className="text-blue-300 text-sm">
                    You are granting admin access using AdminCap: {truncateAddress(adminCapId)}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mt-4 bg-amber-900/20 border-amber-800/30">
                  <AlertDescription className="text-amber-300 text-sm">
                    AdminCap not found in your wallet. You may not have permission to grant admin access.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-black/30 border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Current Administrators
          </CardTitle>
          <CardDescription>
            Addresses with administrator privileges on the dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="ml-2 text-white/70">Loading administrators...</span>
            </div>
          ) : dashboardData?.error ? (
            <Alert className="bg-red-900/20 border-red-800/30 text-red-300">
              <AlertTitle>Error loading administrators</AlertTitle>
              <AlertDescription>
                {dashboardData.error?.toString() || "Failed to load administrator data"}
              </AlertDescription>
            </Alert>
          ) : adminAddresses.length === 0 ? (
            <Alert className="bg-amber-900/20 border-amber-800/30 text-amber-300">
              <AlertTitle>No administrators found</AlertTitle>
              <AlertDescription>
                There are no addresses with administrator privileges registered in the dashboard.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {adminAddresses.map((address, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 mr-2" />
                    <span className="text-white font-mono break-all">
                      {truncateAddress(address)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => copyToClipboard(address)}
                      title="Copy address"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => openInExplorer(address)}
                      title="View in explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4 bg-white/10" />
          
          <div className="text-sm text-white/60">
            <p>
              Note: Granting admin access will transfer an AdminCap object to the recipient's address
              and register them in the dashboard's admin registry. This operation cannot be reversed directly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrantAdmin; 