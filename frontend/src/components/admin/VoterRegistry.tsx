import { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { Loader2, PlusCircle, XCircle, Search, RefreshCw } from "lucide-react";

// Import shadcn components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";

type Proposal = {
  id: string;
  title: string;
  isPrivate: boolean;
};

type RegisteredVoter = {
  address: string;
};

const VoterRegistry = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [registeredVoters, setRegisteredVoters] = useState<RegisteredVoter[]>([]);
  const [newVoterAddress, setNewVoterAddress] = useState("");
  const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);

  // Use type assertion to handle the network variables
  const packageId = useNetworkVariable("packageId" as any) as string;
  const dashboardId = useNetworkVariable("dashboardId" as any) as string;
  const { adminCapId, hasAdminCap } = useAdminCap();
  const { superAdminCapId, hasSuperAdminCap } = useSuperAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const suiClient = useSuiClient();

  // Query for dashboard data
  const { data: dashboardData, refetch: refetchDashboard } = useSuiClientQuery('getObject', {
    id: dashboardId,
    options: {
      showContent: true,
      showType: true
    },
  });

  // Fetch all private proposals
  const fetchPrivateProposals = async () => {
    if (!suiClient || !dashboardData?.data?.content) return;
    
    setIsLoadingProposals(true);
    try {
      // Get the dashboard content
      const dashboardContent = dashboardData.data.content;
      
      // Safely access private_proposals field
      let privateProposalIds: string[] = [];
      
      if ('fields' in dashboardContent) {
        // Access the private_proposals field using the correct path based on type
        // Use type assertion to avoid TypeScript errors
        const fields = dashboardContent.fields as Record<string, any>;
        const privateProposalsField = fields.private_proposals;
        
        // In the Sui data model, VecSet is represented differently
        if (privateProposalsField && typeof privateProposalsField === 'object') {
          // Check different possible structures based on Sui's serialization
          if ('fields' in privateProposalsField && privateProposalsField.fields) {
            if (Array.isArray(privateProposalsField.fields.contents)) {
              privateProposalIds = privateProposalsField.fields.contents;
            } else if (Array.isArray(privateProposalsField.fields.items)) {
              privateProposalIds = privateProposalsField.fields.items;
            } else if (privateProposalsField.fields.vec && Array.isArray(privateProposalsField.fields.vec)) {
              privateProposalIds = privateProposalsField.fields.vec;
            }
          } else if (Array.isArray(privateProposalsField)) {
            privateProposalIds = privateProposalsField;
          }
        }
      }
      
      console.log("Private proposal IDs found:", privateProposalIds);
      
      if (privateProposalIds.length === 0) {
        setProposals([]);
        setIsLoadingProposals(false);
        return;
      }

      // Fetch each proposal
      const privateProposals: Proposal[] = [];
      const fetchPromises = privateProposalIds.map(async (id: string) => {
        try {
          const proposalObj = await suiClient.getObject({
            id,
            options: {
              showContent: true,
            }
          });

          if (proposalObj.data && proposalObj.data.content && 'fields' in proposalObj.data.content) {
            const fields = proposalObj.data.content.fields as any;
            privateProposals.push({
              id,
              title: fields.title,
              isPrivate: fields.is_private,
            });
          }
        } catch (error) {
          console.error("Error fetching proposal:", error);
        }
      });

      await Promise.all(fetchPromises);
      console.log("Fetched private proposals:", privateProposals);
      setProposals(privateProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to load private proposals");
    } finally {
      setIsLoadingProposals(false);
    }
  };

  // Use effect to fetch proposals when dashboard data changes
  useEffect(() => {
    if (dashboardData?.data) {
      fetchPrivateProposals();
    }
  }, [dashboardData]);

  // Fetch registered voters for a specific proposal
  const fetchRegisteredVoters = async (proposalId: string) => {
    if (!suiClient) return;

    setIsLoadingVoters(true);
    try {
      // Build transaction to call get_registered_voters
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::get_registered_voters`,
        arguments: [
          tx.object(dashboardId),
          tx.pure.id(proposalId),
        ],
      });
      
      // Execute the transaction in dev inspect mode
      const result = await suiClient.devInspectTransactionBlock({
        transactionBlock: tx.serialize(),
        sender: "0x0", // Doesn't matter for view functions
      });

      console.log("Registered voters result:", result);

      // Process the result
      if (result.results && result.results[0] && result.results[0].returnValues) {
        // Get the return value from the transaction result
        const returnValue = result.results[0].returnValues[0];
        console.log("Return value:", returnValue);
        
        // The return value structure might vary depending on the serialization
        const voters: RegisteredVoter[] = [];
        
        try {
          // Add explicit type assertions for safety
          const anyReturnValue = returnValue as any;
          
          if (Array.isArray(anyReturnValue)) {
            // Direct array of addresses
            anyReturnValue.forEach((address: any) => {
              if (address) {
                voters.push({
                  address: typeof address === 'string' ? address : String(address)
                });
              }
            });
          } else if (anyReturnValue[0] && Array.isArray(anyReturnValue[0])) {
            // Nested array of addresses
            anyReturnValue[0].forEach((address: any) => {
              if (address) {
                voters.push({
                  address: typeof address === 'string' ? address : String(address)
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing voter addresses:", e);
        }
        
        console.log("Processed voters:", voters);
        setRegisteredVoters(voters);
      } else {
        console.log("No registered voters found or invalid result format");
        setRegisteredVoters([]);
      }
    } catch (error) {
      console.error("Error fetching registered voters:", error);
      toast.error("Failed to load registered voters");
      setRegisteredVoters([]);
    } finally {
      setIsLoadingVoters(false);
    }
  };

  // Select a proposal and fetch its registered voters
  const selectProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    fetchRegisteredVoters(proposal.id);
  };

  // Register a voter for the selected proposal
  const registerVoter = async () => {
    if (!selectedProposal || !newVoterAddress) return;
    
    // Validate address format
    if (!newVoterAddress.startsWith("0x") || newVoterAddress.length < 42) {
      toast.error("Invalid address format");
      return;
    }
    
    setIsLoading(true);
    try {
      // Determine which function to call based on admin status
      const functionName = hasSuperAdminCap 
        ? "register_voter_for_private_proposal_super" 
        : "register_voter_for_private_proposal";
      
      const tx = new Transaction();
      
      // Add the appropriate cap as the first argument
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::${functionName}`,
          arguments: [
            tx.object(superAdminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(newVoterAddress),
          ],
        });
      } else if (hasAdminCap && adminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::${functionName}`,
          arguments: [
            tx.object(adminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(newVoterAddress),
          ],
        });
      } else {
        toast.error("You don't have the required admin permissions");
        setIsLoading(false);
        return;
      }
      
      // Execute the transaction - fix compatible with dapp-kit SDK
      signAndExecute(
        {
          transaction: tx as any,
        },
        {
          onSuccess: (result) => {
            toast.success(`Voter ${newVoterAddress} registered successfully`);
            setNewVoterAddress("");
            setIsAddVoterModalOpen(false);
            // Refresh the list of registered voters
            fetchRegisteredVoters(selectedProposal.id);
          },
          onError: (error) => {
            console.error("Error registering voter:", error);
            toast.error("Failed to register voter");
          },
        }
      );
    } catch (error) {
      console.error("Error registering voter:", error);
      toast.error("Failed to register voter");
    } finally {
      setIsLoading(false);
    }
  };

  // Unregister a voter from the selected proposal
  const unregisterVoter = async (voterAddress: string) => {
    if (!selectedProposal) return;
    
    setIsLoading(true);
    try {
      // Determine which function to call based on admin status
      const functionName = hasSuperAdminCap 
        ? "unregister_voter_for_private_proposal_super" 
        : "unregister_voter_for_private_proposal";
      
      const tx = new Transaction();
      
      // Add the appropriate cap as the first argument
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::${functionName}`,
          arguments: [
            tx.object(superAdminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(voterAddress),
          ],
        });
      } else if (hasAdminCap && adminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::${functionName}`,
          arguments: [
            tx.object(adminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(voterAddress),
          ],
        });
      } else {
        toast.error("You don't have the required admin permissions");
        setIsLoading(false);
        return;
      }
      
      // Execute the transaction - fix compatible with dapp-kit SDK
      signAndExecute(
        {
          transaction: tx as any,
        },
        {
          onSuccess: (result) => {
            toast.success(`Voter ${voterAddress} unregistered successfully`);
            // Refresh the list of registered voters
            fetchRegisteredVoters(selectedProposal.id);
          },
          onError: (error) => {
            console.error("Error unregistering voter:", error);
            toast.error("Failed to unregister voter");
          },
        }
      );
    } catch (error) {
      console.error("Error unregistering voter:", error);
      toast.error("Failed to unregister voter");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all data
  const refreshData = () => {
    refetchDashboard();
    if (selectedProposal) {
      fetchRegisteredVoters(selectedProposal.id);
    }
  };

  // Filter proposals based on search query
  const filteredProposals = proposals.filter(proposal => 
    proposal.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <Card className="border shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold tracking-tight">Private Proposal Voter Registry</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoadingProposals}
            >
              {isLoadingProposals ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          <CardDescription>
            Manage registered voters for private proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Proposals List */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>
              
              <div className="border rounded-md">
                <div className="p-2 bg-muted/50 border-b">
                  <h3 className="font-medium">Private Proposals</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {isLoadingProposals ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProposals.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No private proposals found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProposals.map((proposal) => (
                        <button
                          key={proposal.id}
                          onClick={() => selectProposal(proposal)}
                          className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                            selectedProposal?.id === proposal.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="font-medium truncate">{proposal.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            ID: {proposal.id}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Registered Voters */}
            <div className="md:col-span-2 space-y-4">
              {!selectedProposal ? (
                <Alert>
                  <AlertDescription>
                    Select a private proposal to view and manage registered voters
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Registered Voters for: <span className="font-bold">{selectedProposal.title}</span>
                    </h3>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsAddVoterModalOpen(true)}
                      disabled={!hasAdminCap && !hasSuperAdminCap}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Voter
                    </Button>
                  </div>
                  
                  {isLoadingVoters ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Voter Address</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registeredVoters.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center h-32 text-muted-foreground">
                                No registered voters for this proposal
                              </TableCell>
                            </TableRow>
                          ) : (
                            registeredVoters.map((voter, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-sm">
                                  {voter.address}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => unregisterVoter(voter.address)}
                                    disabled={isLoading || (!hasAdminCap && !hasSuperAdminCap)}
                                    title="Unregister voter"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Voter Dialog */}
      <Dialog open={isAddVoterModalOpen} onOpenChange={setIsAddVoterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Registered Voter</DialogTitle>
            <DialogDescription>
              Add a new voter to the private proposal registry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="voterAddress" className="text-sm font-medium">
                Voter Address
              </label>
              <Input
                id="voterAddress"
                placeholder="0x..."
                value={newVoterAddress}
                onChange={(e) => setNewVoterAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full Sui address of the voter you want to register
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVoterModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={registerVoter} disabled={isLoading || !newVoterAddress}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Register Voter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoterRegistry;