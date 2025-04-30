import React, { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery, useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
import { useNetworkVariable } from "../../config/networkConfig";
import { toast } from "sonner";
import { Loader2, PlusCircle, XCircle, Search, RefreshCw } from "lucide-react";

// Import shadcn components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
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
  const [voterRemovalHistory, setVoterRemovalHistory] = useState<Array<{address: string, timestamp: number}>>([]);
  const [voterRegistrationHistory, setVoterRegistrationHistory] = useState<Array<{address: string, timestamp: number}>>([]);

  // Use type assertion to handle the network variables
  const packageId = useNetworkVariable("packageId" as any) as string;
  const dashboardId = useNetworkVariable("dashboardId" as any) as string;
  const { adminCapId, hasAdminCap } = useAdminCap();
  const { superAdminCapId, hasSuperAdminCap } = useSuperAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();

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
      console.log("Dashboard content:", dashboardContent);
      
      // Safely access private_proposals field
      let privateProposalIds: string[] = [];
      
      if ('fields' in dashboardContent) {
        // Access the private_proposals field using the correct path based on type
        // Use type assertion to avoid TypeScript errors
        const fields = dashboardContent.fields as Record<string, any>;
        console.log("Dashboard fields:", fields);
        
        // Try to find private_proposals field in different formats
        if (fields.private_proposals) {
          const privateProposalsField = fields.private_proposals;
          console.log("Private proposals field:", privateProposalsField);
          
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
            } else if (privateProposalsField.vec && Array.isArray(privateProposalsField.vec)) {
              privateProposalIds = privateProposalsField.vec;
            }
          }
        } else {
          // Try to find all proposals and filter for private ones
          console.log("No private_proposals field found, trying to get all proposals");
          if (fields.proposals_ids && Array.isArray(fields.proposals_ids)) {
            // We'll need to check each proposal to see if it's private
            const allProposalIds = fields.proposals_ids;
            console.log("All proposal IDs:", allProposalIds);
            
            // Fetch each proposal to check if it's private
            const checkPromises = allProposalIds.map(async (id: string) => {
              try {
                const proposalObj = await suiClient.getObject({
                  id,
                  options: {
                    showContent: true,
                  }
                });
                
                if (proposalObj.data?.content?.dataType === "moveObject") {
                  const fields = proposalObj.data.content.fields as any;
                  if (fields.is_private === true) {
                    return id;
                  }
                }
              } catch (error) {
                console.error("Error checking if proposal is private:", error);
              }
              return null;
            });
            
            const results = await Promise.all(checkPromises);
            privateProposalIds = results.filter(id => id !== null) as string[];
            console.log("Filtered private proposal IDs:", privateProposalIds);
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
              title: fields.title || "Untitled Proposal",
              isPrivate: fields.is_private === true,
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
    if (!proposalId) return;
    
    setIsLoadingVoters(true);
    
    try {
      console.log(`Fetching registered voters for proposal: ${proposalId}`);
      
      // Simplify our approach: go directly to dynamic field query
      console.log("Querying voter registry using dynamic field");
      try {
        // Create the VoterRegistryKey structure
        const registryKeyType = `${packageId}::dashboard::VoterRegistryKey`;
        const registryKey = { 
          proposal_id: proposalId 
        };

        // Get the dynamic field
        const dynamicFieldResult = await suiClient.getDynamicFieldObject({
          parentId: dashboardId,
          name: {
            type: registryKeyType,
            value: registryKey
          }
        });

        console.log("Dynamic field result:", JSON.stringify(dynamicFieldResult, null, 2));

        // Extract voter addresses directly from the dynamic field result
        if (dynamicFieldResult.data?.content?.dataType === "moveObject") {
          const registryFields = dynamicFieldResult.data.content.fields as any;
          console.log("Registry fields:", registryFields);
          
          // Check if we have the voter registry structure
          if (registryFields.value && 
              registryFields.value.fields && 
              registryFields.value.fields.registered_voters && 
              registryFields.value.fields.registered_voters.fields && 
              registryFields.value.fields.registered_voters.fields.contents) {
            
            // Get the contents array which contains the voter addresses
            const voterAddresses = registryFields.value.fields.registered_voters.fields.contents;
            console.log("Voter addresses from dynamic field:", voterAddresses);
            
            if (Array.isArray(voterAddresses)) {
              const voters = voterAddresses.map(addr => ({ address: String(addr) }));
              console.log("Processed voters:", voters);
              setRegisteredVoters(voters);
              setIsLoadingVoters(false);
              return;
            }
          }
        }
        
        // If we couldn't find the voter registry or it was empty
        console.log("No registered voters found in dynamic field");
        setRegisteredVoters([]);
        setIsLoadingVoters(false);
        
      } catch (error) {
        console.error("Error querying dynamic field:", error);
        toast.error("Failed to load registered voters");
        setRegisteredVoters([]);
        setIsLoadingVoters(false);
      }
    } catch (error) {
      console.error("Error fetching registered voters:", error);
      toast.error("Failed to load registered voters");
      setRegisteredVoters([]);
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
      // Show a toast to indicate the process is starting
      toast.info(`Registering voter ${newVoterAddress}...`);

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
      
      // Log the transaction details for debugging
      console.log("Register transaction details:", {
        packageId,
        dashboardId,
        proposalId: selectedProposal.id,
        voterAddress: newVoterAddress,
        functionName,
        capId: hasSuperAdminCap ? superAdminCapId : adminCapId
      });
      
      const serializedTx = tx.serialize();
      console.log("Serialized transaction:", serializedTx);
      
      // Execute the transaction with proper serialization
      signAndExecute(
        {
          transaction: serializedTx,
        },
        {
          onSuccess: (result) => {
            console.log("Register success:", result);
            toast.success(`Voter ${newVoterAddress} registered successfully`);
            
            // Add to registration history
            setVoterRegistrationHistory(prev => [
              { address: newVoterAddress, timestamp: Date.now() },
              ...prev
            ]);
            
            setNewVoterAddress("");
            setIsAddVoterModalOpen(false);
            
            // Add a small delay before refreshing to allow blockchain state to update
            setTimeout(() => {
              // Refresh the list of registered voters
              fetchRegisteredVoters(selectedProposal.id);
              setIsLoading(false);
            }, 2000); // 2 second delay
          },
          onError: (error) => {
            console.error("Error registering voter:", error);
            
            // Check for specific error messages
            const errorMsg = error.message || 'Unknown error';
            if (errorMsg.toLowerCase().includes('already registered')) {
              toast.error(`Voter ${newVoterAddress} is already registered for this proposal`);
            } else {
              toast.error(`Failed to register voter: ${errorMsg}`);
            }
            
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Error registering voter:", error);
      toast.error(`Failed to register voter: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Unregister a voter from the selected proposal
  const unregisterVoter = async (voterAddress: string) => {
    if (!selectedProposal) return;
    
    setIsLoading(true);
    try {
      // Show a toast to indicate the process is starting
      toast.info(`Removing voter ${voterAddress}...`);
      
      // Determine which function to call based on admin status
      const functionName = hasSuperAdminCap 
        ? "unregister_voter_from_private_proposal_super" 
        : "unregister_voter_from_private_proposal";
      
      console.log(`Using function: ${functionName}`);
      
      const tx = new Transaction();
      
      // Add the appropriate cap as the first argument
      if (hasSuperAdminCap && superAdminCapId) {
        console.log(`Using SuperAdminCap: ${superAdminCapId}`);
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
        console.log(`Using AdminCap: ${adminCapId}`);
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
        console.error("No admin capabilities available");
        toast.error("You don't have the required admin permissions");
        setIsLoading(false);
        return;
      }
      
      // Log the transaction details for debugging
      console.log("Unregister transaction details:", {
        packageId,
        dashboardId,
        proposalId: selectedProposal.id,
        voterAddress,
        functionName,
        capId: hasSuperAdminCap ? superAdminCapId : adminCapId,
        fullTarget: `${packageId}::dashboard::${functionName}`
      });
      
      const serializedTx = tx.serialize();
      console.log("Serialized transaction:", serializedTx);
      
      // Execute the transaction with proper serialization
      signAndExecute(
        {
          transaction: serializedTx,
        },
        {
          onSuccess: (result) => {
            console.log("Unregister success:", result);
            toast.success(`Voter ${voterAddress} unregistered successfully`);
            
            // Add to removal history
            setVoterRemovalHistory(prev => [
              { address: voterAddress, timestamp: Date.now() },
              ...prev
            ]);
            
            // Add a small delay before refreshing to allow blockchain state to update
            setTimeout(() => {
              // Refresh the list of registered voters
              fetchRegisteredVoters(selectedProposal.id);
              setIsLoading(false);
            }, 2000); // 2 second delay
          },
          onError: (error) => {
            console.error("Error unregistering voter:", error);
            
            // Check for specific error messages
            const errorMsg = error.message || 'Unknown error';
            console.log("Error message:", errorMsg);
            
            if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('not registered')) {
              toast.error(`Voter ${voterAddress} is not registered for this proposal`);
            } else {
              toast.error(`Failed to unregister voter: ${errorMsg}`);
            }
            
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Error unregistering voter:", error);
      toast.error(`Failed to unregister voter: ${error.message || 'Unknown error'}`);
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

  // Load history from localStorage when component mounts
  useEffect(() => {
    try {
      const savedRegistrationHistory = localStorage.getItem(`voter_registration_history_${selectedProposal?.id}`);
      if (savedRegistrationHistory) {
        setVoterRegistrationHistory(JSON.parse(savedRegistrationHistory));
      }
      
      const savedRemovalHistory = localStorage.getItem(`voter_removal_history_${selectedProposal?.id}`);
      if (savedRemovalHistory) {
        setVoterRemovalHistory(JSON.parse(savedRemovalHistory));
      }
    } catch (error) {
      console.error("Error loading voter history from localStorage:", error);
    }
  }, [selectedProposal?.id]);

  // Save registration history to localStorage when it changes
  useEffect(() => {
    if (selectedProposal?.id && voterRegistrationHistory.length > 0) {
      try {
        localStorage.setItem(
          `voter_registration_history_${selectedProposal.id}`, 
          JSON.stringify(voterRegistrationHistory.slice(0, 20)) // Limit to 20 entries
        );
      } catch (error) {
        console.error("Error saving registration history to localStorage:", error);
      }
    }
  }, [voterRegistrationHistory, selectedProposal?.id]);

  // Save removal history to localStorage when it changes
  useEffect(() => {
    if (selectedProposal?.id && voterRemovalHistory.length > 0) {
      try {
        localStorage.setItem(
          `voter_removal_history_${selectedProposal.id}`, 
          JSON.stringify(voterRemovalHistory.slice(0, 20)) // Limit to 20 entries
        );
      } catch (error) {
        console.error("Error saving removal history to localStorage:", error);
      }
    }
  }, [voterRemovalHistory, selectedProposal?.id]);

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

      {/* Statistics Section */}
      {selectedProposal && (
        <Card className="border shadow-md mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Voter Registry Statistics</CardTitle>
            <CardDescription>
              Statistics about registered voters for this proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Current Registered Voters</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{registeredVoters.length}</span>
                  <span className="text-sm text-muted-foreground">voters</span>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Recently Added Voters</h4>
                <div>
                  {voterRegistrationHistory.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No recent registrations</span>
                  ) : (
                    <div className="max-h-[100px] overflow-y-auto space-y-2">
                      {voterRegistrationHistory.slice(0, 5).map((item, index) => (
                        <div key={index} className="text-xs bg-background/40 p-2 rounded flex justify-between">
                          <span className="font-mono">{item.address.substring(0, 10)}...{item.address.substring(item.address.length - 6)}</span>
                          <span className="text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Recently Removed Voters</h4>
                <div>
                  {voterRemovalHistory.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No voters have been removed</span>
                  ) : (
                    <div className="max-h-[100px] overflow-y-auto space-y-2">
                      {voterRemovalHistory.slice(0, 5).map((item, index) => (
                        <div key={index} className="text-xs bg-background/40 p-2 rounded flex justify-between">
                          <span className="font-mono">{item.address.substring(0, 10)}...{item.address.substring(item.address.length - 6)}</span>
                          <span className="text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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