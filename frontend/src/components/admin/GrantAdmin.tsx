import { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, UserPlus, ShieldCheck, ExternalLink, Copy, RefreshCw, ChevronDown, AlertTriangle } from "lucide-react";
import { SuiObjectData } from "@mysten/sui/client";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { getNetwork } from "../../utils/networkUtils";

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string>('mainnet');
  const [explorerNetwork, setExplorerNetwork] = useState<string>('devnet');
  // New state to control dropdown open/closed state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { adminCapId } = useAdminCap();
  const { hasSuperAdminCap, superAdminCapId } = useSuperAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
  // Detect the current network
  useEffect(() => {
    const detectNetwork = async () => {
      try {
        // Try to get network info from the Sui client
        // First, try getting the system state
        const systemState = await suiClient.getLatestSuiSystemState();
        console.log("System state for network detection:", systemState);
        
        // Try to determine network from various system state properties
        if (systemState) {
          // Look for known chain identifiers or characteristic values
          const stateData = JSON.stringify(systemState).toLowerCase();
          
          if (stateData.includes('testnet')) {
            console.log("Detected testnet from system state");
            setCurrentNetwork('testnet');
            return;
          } else if (stateData.includes('devnet')) {
            console.log("Detected devnet from system state");
            setCurrentNetwork('devnet');
            return;
          }
        }
        
        // If we get here, try a different approach:
        // Use window.location to check if we're on a known testnet/devnet domain
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        
        console.log("URL for network detection:", { hostname, pathname, search });
        
        // Check URL for network indicators
        if (hostname.includes('testnet') || pathname.includes('testnet') || search.includes('testnet')) {
          console.log("Detected testnet from URL");
          setCurrentNetwork('testnet');
        } else if (hostname.includes('devnet') || pathname.includes('devnet') || search.includes('devnet')) {
          console.log("Detected devnet from URL");
          setCurrentNetwork('devnet');
        } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
          console.log("Detected local development environment");
          // For local development, default to testnet for better explorer support
          setCurrentNetwork('testnet');
        } else {
          console.log("No specific network detected, defaulting to mainnet");
          setCurrentNetwork('mainnet');
        }
        
      } catch (error) {
        console.error("Error in network detection:", error);
        // Default to checking location
        if (window.location.hostname.includes('testnet')) {
          setCurrentNetwork('testnet');
        } else if (window.location.hostname.includes('devnet')) {
          setCurrentNetwork('devnet');
        } else if (window.location.hostname.includes('localhost')) {
          // For local development, use testnet for better explorer support
          setCurrentNetwork('testnet');
        } else {
          setCurrentNetwork('mainnet');
        }
      }
    };
    
    detectNetwork();
  }, [suiClient]);

  // Helper function to determine which network to use for explorer links
  const getExplorerNetwork = () => {
    // If user has manually selected a network, use that
    if (explorerNetwork) {
      return explorerNetwork;
    }
    // Otherwise use the current app network from networkUtils
    return getNetwork();
  };

  // Fetch dashboard data to get admin addresses
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  // Fetch admin addresses directly using the contract view function
  const fetchAdminAddresses = async () => {
    setIsLoadingAdmins(true);
    setFetchError(null);
    
    try {
      // For now, just rely on the dashboard data
      parseAddressesFromDashboard();
    } catch (error) {
      console.error("Error fetching admin addresses:", error);
      setFetchError("Failed to fetch administrators. Please try refreshing.");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Parse addresses from dashboard data
  const parseAddressesFromDashboard = () => {
    if (!dashboardData?.data) return;
    
    try {
      const dashboardObj = dashboardData.data as SuiObjectData;
      if (dashboardObj.content?.dataType !== "moveObject") return;
      
      console.log("Dashboard data for admin parsing:", dashboardObj.content.fields);
      
      const fields = dashboardObj.content.fields as any;
      
      // Parse both admin and super admin addresses
      const rawAdminData = fields?.admin_addresses;
      const rawSuperAdminData = fields?.super_admin_addresses;
      
      console.log("Raw admin_addresses field:", rawAdminData);
      console.log("Raw super_admin_addresses field:", rawSuperAdminData);
      
      // Helper function to extract addresses from data
      const extractAddresses = (data: any): string[] => {
        if (!data) return [];
        
        // Handle different possible formats
        if (Array.isArray(data)) {
          return data.filter(addr => typeof addr === 'string' && addr.startsWith('0x'));
        }
        
        // Try to extract from JSON string if it's not an array
        const dataString = JSON.stringify(data);
        const addressMatches = dataString.match(/0x[a-fA-F0-9]{40,}/g);
        return addressMatches || [];
      };
      
      // Extract admin addresses
      const adminAddrs = extractAddresses(rawAdminData);
      console.log("Extracted admin addresses:", adminAddrs);
      setAdminAddresses(adminAddrs);
      
      // If no admin addresses found, set appropriate error
      if (adminAddrs.length === 0) {
        if (typeof rawAdminData === 'object') {
          setFetchError(`No admin addresses found. Raw data available in console (type: ${typeof rawAdminData}).`);
        } else if (Array.isArray(rawAdminData)) {
          setFetchError(`No admin addresses found in array of ${rawAdminData.length} items.`);
        } else if (!rawAdminData) {
          setFetchError("No admin_addresses field found in dashboard data");
        } else {
          setFetchError(`No admin addresses found in data of type ${typeof rawAdminData}`);
        }
      } else {
        setFetchError(null);
      }
      
      // For super admin verification, extract super admin addresses
      const superAdminAddrs = extractAddresses(rawSuperAdminData);
      console.log("Extracted super admin addresses:", superAdminAddrs);
      
    } catch (error) {
      console.error("Error parsing addresses from dashboard:", error);
      setFetchError("Error parsing administrator data");
    }
  };
  
  // Initialize by fetching admin addresses
  useEffect(() => {
    if (dashboardId) {
      fetchAdminAddresses();
    }
  }, [dashboardId, dashboardData]);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      if (!superAdminCapId) {
        toast.error("No SuperAdminCap found in your wallet");
        return;
      }
      
      // Create transaction for granting admin capability
      const tx = new Transaction();
      
      // Call the grant_admin_super function
      tx.moveCall({
        target: `${packageId}::dashboard::grant_admin_super`,
        arguments: [
          tx.object(superAdminCapId),
          tx.object(dashboardId),
          tx.pure.address(values.address)
        ],
      });
      
      // Sign and execute the transaction
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: (result) => {
          console.log("Grant admin transaction successful:", result);
          toast.success(`Admin capability granted to ${values.address}`);
          form.reset();
          fetchAdminAddresses();
        },
        onError: (error) => {
          console.error("Grant admin transaction failed:", error);
          toast.error(`Failed to grant admin capability: ${error.message}`);
        },
      });
      
    } catch (error) {
      console.error("Error in grant admin:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
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

  const openInExplorer = (address: string, explorerIndex = 0) => {
    // Get the current network for explorer links
    const network = getExplorerNetwork();
    
    // Create URLs for multiple explorers based on network
    let explorers = [];
    
    // Different URLs based on network
    if (network === 'testnet') {
      explorers = [
        {
          name: 'SuiScan',
          url: `https://suiscan.xyz/testnet/account/${address}`
        },
        {
          name: 'Sui Explorer',
          url: `https://explorer.sui.io/address/${address}?network=testnet`
        },
        {
          name: 'SuiVision',
          url: `https://suivision.xyz/accounts/${address}?network=testnet`
        }
      ];
    } else if (network === 'devnet') {
      explorers = [
        {
          name: 'Sui Explorer',
          url: `https://explorer.sui.io/address/${address}?network=devnet`
        },
        {
          name: 'SuiVision',
          url: `https://suivision.xyz/accounts/${address}?network=devnet`
        }
      ];
    } else if (network === 'localnet') {
      explorers = [
        {
          name: 'Sui Explorer',
          url: `https://explorer.sui.io/address/${address}?network=localnet`
        }
      ];
    } else {
      // Default to mainnet
      explorers = [
        {
          name: 'SuiScan',
          url: `https://suiscan.xyz/mainnet/account/${address}`
        },
        {
          name: 'Sui Explorer',
          url: `https://explorer.sui.io/address/${address}?network=mainnet`
        },
        {
          name: 'SuiVision',
          url: `https://suivision.xyz/accounts/${address}?network=mainnet`
        }
      ];
    }
    
    // Get the appropriate explorer
    let explorer;
    if (explorerIndex < explorers.length) {
      explorer = explorers[explorerIndex];
    } else {
      explorer = explorers[0];
    }
    
    console.log(`Opening explorer: ${explorer.name} at ${explorer.url} (Network: ${network})`);
    
    window.open(explorer.url, '_blank');
  };
  
  return (
    <div className="space-y-8">
      {/* Add information alert about the authorization system */}
      <Alert className="bg-blue-900/30 border-blue-800/50">
        <AlertTitle className="text-blue-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Authorization System
        </AlertTitle>
        <AlertDescription className="text-blue-200/80">
          This dashboard now verifies that your admin/superadmin capability is in the authorized set before allowing actions. 
          Even if you have a capability object, it must be registered in the dashboard's authorized list to perform operations.
        </AlertDescription>
      </Alert>
      
      {!hasSuperAdminCap ? (
        <Card className="bg-red-900/30 border-red-800/50">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="h-6 w-6" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-white/70">
              Only SuperAdmin users can grant admin access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-4">
              You need to have a SuperAdminCap capability to grant admin access to other users.
              Regular AdminCap holders cannot perform this action.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-black/30 border-white/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-400" />
                Grant Admin Access <Badge className="ml-2 bg-purple-600">SuperAdmin Only</Badge>
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
                      disabled={isLoading || !form.formState.isValid || !superAdminCapId}
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
                  
                  {superAdminCapId ? (
                    <Alert className="mt-4 bg-blue-900/20 border-blue-800/30">
                      <AlertDescription className="text-blue-300 text-sm">
                        You are using SuperAdminCap: {truncateAddress(superAdminCapId)}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mt-4 bg-amber-900/20 border-amber-800/30">
                      <AlertDescription className="text-amber-300 text-sm">
                        SuperAdminCap not found in your wallet. You cannot grant admin access.
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="bg-black/30 border-white/20">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Current Administrators
                </CardTitle>
                <div className="flex items-center gap-2">
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-300 border-blue-500/30 bg-blue-900/20 hover:bg-blue-900/30"
                        onClick={(e) => {
                          e.preventDefault();
                          setDropdownOpen(!dropdownOpen);
                        }}
                      >
                        {explorerNetwork.toUpperCase()}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-blue-950 border-blue-900 text-white">
                      <DropdownMenuLabel>Explorer Network</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-blue-900" />
                      <DropdownMenuItem 
                        className={`hover:bg-blue-900/50 cursor-pointer ${explorerNetwork === 'mainnet' ? 'bg-blue-800/50' : ''}`}
                        onClick={() => {
                          setExplorerNetwork('mainnet');
                          setDropdownOpen(false);
                        }}
                      >
                        MAINNET
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`hover:bg-blue-900/50 cursor-pointer ${explorerNetwork === 'testnet' ? 'bg-blue-800/50' : ''}`}
                        onClick={() => {
                          setExplorerNetwork('testnet');
                          setDropdownOpen(false);
                        }}
                      >
                        TESTNET
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`hover:bg-blue-900/50 cursor-pointer ${explorerNetwork === 'devnet' ? 'bg-blue-800/50' : ''}`}
                        onClick={() => {
                          setExplorerNetwork('devnet');
                          setDropdownOpen(false);
                        }}
                      >
                        DEVNET
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-400 border-blue-500/30 hover:bg-blue-900/30"
                    onClick={fetchAdminAddresses}
                    disabled={isLoadingAdmins}
                  >
                    {isLoadingAdmins ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
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
              ) : fetchError ? (
                <Alert className="bg-red-900/20 border-red-800/30 text-red-300">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {fetchError}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                              title="View in explorer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-blue-950 border-blue-900 text-white">
                            <DropdownMenuLabel>View in Explorer</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-blue-900" />
                            <DropdownMenuItem 
                              className="hover:bg-blue-900/50 cursor-pointer"
                              onClick={() => openInExplorer(address, 0)}
                            >
                              SuiScan
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-blue-900/50 cursor-pointer"
                              onClick={() => openInExplorer(address, 1)}
                            >
                              Sui Explorer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-blue-900/50 cursor-pointer"
                              onClick={() => openInExplorer(address, 2)}
                            >
                              SuiVision
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
        </>
      )}
    </div>
  );
};

export default GrantAdmin; 