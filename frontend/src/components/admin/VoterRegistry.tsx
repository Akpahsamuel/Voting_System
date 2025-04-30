import { useState, useEffect } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SuiObjectData } from "@mysten/sui/client";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
import { toast } from "sonner";
import { Loader2, PlusCircle, XCircle, Search } from "lucide-react";

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

  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { adminCapId, hasAdminCap } = useAdminCap();
  const { superAdminCapId, hasSuperAdminCap } = useSuperAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const suiClient = useSuiClient();

  // Fetch all proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!suiClient) return;
      
      setIsLoadingProposals(true);
      try {
        // Fetch proposals from the dashboard
        const dashboard = await suiClient.getObject({
          id: dashboardId,
          options: {
            showContent: true,
          }
        });

        if (!dashboard.data || !dashboard.data.content) {
          throw new Error("Dashboard not found");
        }

        // Get private proposals IDs
        const privateProposalIds = dashboard.data.content.fields?.private_proposals?.fields?.items || [];
        
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

            if (proposalObj.data && proposalObj.data.content) {
              const fields = proposalObj.data.content.fields;
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
        setProposals(privateProposals);
      } catch (error) {
        console.error("Error fetching proposals:", error);
        toast.error("Failed to load private proposals");
      } finally {
        setIsLoadingProposals(false);
      }
    };

    fetchProposals();
  }, [suiClient, dashboardId]);

  // Fetch registered voters for a specific proposal
  const fetchRegisteredVoters = async (proposalId: string) => {
    if (!suiClient) return;

    setIsLoadingVoters(true);
    try {
      // Call dashboard function to get registered voters
      const tx = new Transaction();
      
      // Call get_registered_voters to fetch the voters list
      const votersList = await suiClient.devInspectTransactionBlock({
        transactionBlock: tx.moveCall({
          target: `${packageId}::dashboard::get_registered_voters`,
          arguments: [
            tx.object(dashboardId),
            tx.pure.id(proposalId),
          ],
        }).serialize(),
        sender: "0x0", // Doesn't matter for view functions
      });

      // Parse the result
      if (votersList.results?.[0]?.returnValues) {
        // Parse BCS data to get addresses
        const returnData = votersList.results[0].returnValues[0];
        
        // This is simplified - in a real app, you'd need to decode the BCS data
        // For this example, let's assume we can get the addresses from the return value
        const voters = returnData ? JSON.parse(returnData) : [];
        
        setRegisteredVoters(voters.map((address: string) => ({ address })));
      } else {
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

  // Select a proposal to view its registered voters
  const selectProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    fetchRegisteredVoters(proposal.id);
  };

  // Register a new voter for the selected proposal
  const registerVoter = async () => {
    if (!selectedProposal || !newVoterAddress) return;
    
    // Basic validation for a Sui address
    if (!newVoterAddress.startsWith('0x') || newVoterAddress.length !== 66) {
      toast.error("Invalid Sui address format");
      return;
    }
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      // Determine which register function to call based on admin capability
      if (hasAdminCap && adminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::register_voter_for_private_proposal`,
          arguments: [
            tx.object(adminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(newVoterAddress),
          ],
        });
      } else if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::register_voter_for_private_proposal_super`,
          arguments: [
            tx.object(superAdminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(newVoterAddress),
          ],
        });
      } else {
        throw new Error("Admin capabilities required");
      }
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: () => {
          toast.success(`Voter ${newVoterAddress} registered successfully!`);
          setNewVoterAddress("");
          setIsAddVoterModalOpen(false);
          fetchRegisteredVoters(selectedProposal.id); // Refresh voter list
        },
        onError: (error) => {
          toast.error(`Error registering voter: ${error.message}`);
        }
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unregister a voter from the selected proposal
  const unregisterVoter = async (voterAddress: string) => {
    if (!selectedProposal) return;
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      // Determine which unregister function to call based on admin capability
      if (hasAdminCap && adminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::unregister_voter_from_private_proposal`,
          arguments: [
            tx.object(adminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(voterAddress),
          ],
        });
      } else if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::dashboard::unregister_voter_from_private_proposal_super`,
          arguments: [
            tx.object(superAdminCapId),
            tx.object(dashboardId),
            tx.pure.id(selectedProposal.id),
            tx.pure.address(voterAddress),
          ],
        });
      } else {
        throw new Error("Admin capabilities required");
      }
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: () => {
          toast.success(`Voter ${voterAddress} unregistered`);
          fetchRegisteredVoters(selectedProposal.id); // Refresh voter list
        },
        onError: (error) => {
          toast.error(`Error unregistering voter: ${error.message}`);
        }
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter proposals based on search query
  const filteredProposals = proposals.filter(
    proposal => proposal.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the user has admin privileges
  const hasAdminPrivileges = hasAdminCap || hasSuperAdminCap;

  if (!hasAdminPrivileges) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
          <AlertDescription>
            You need admin or super admin capability to access the voter registry.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <Card className="border shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Private Proposal Voter Registry</CardTitle>
          <CardDescription>
            Manage registered voters for private proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Proposals List */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            
            {isLoadingProposals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading proposals...</span>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No private proposals found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProposals.map((proposal) => (
                  <Card 
                    key={proposal.id}
                    onClick={() => selectProposal(proposal)}
                    className={`cursor-pointer border transition-all ${
                      selectedProposal?.id === proposal.id 
                        ? "border-primary shadow-md" 
                        : "hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="py-4">
                      <CardTitle className="text-base font-medium">{proposal.title}</CardTitle>
                      <div className="flex items-center mt-1">
                        <Badge>Private</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Registered Voters Section */}
          {selectedProposal && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Registered Voters for "{selectedProposal.title}"
                </h3>
                <Button
                  size="sm"
                  onClick={() => setIsAddVoterModalOpen(true)}
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  Add Voter
                </Button>
              </div>
              
              {isLoadingVoters ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading registered voters...</span>
                </div>
              ) : registeredVoters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No registered voters for this proposal
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voter Address</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredVoters.map((voter) => (
                      <TableRow key={voter.address}>
                        <TableCell className="font-mono text-sm truncate max-w-sm">
                          {voter.address}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unregisterVoter(voter.address)}
                            disabled={isLoading}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Voter Dialog */}
      <Dialog open={isAddVoterModalOpen} onOpenChange={setIsAddVoterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Registered Voter</DialogTitle>
            <DialogDescription>
              Enter the Sui address of the voter you want to register for this proposal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="0x..."
              value={newVoterAddress}
              onChange={(e) => setNewVoterAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter a valid Sui wallet address
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddVoterModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={registerVoter}
              disabled={isLoading || !newVoterAddress}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Voter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoterRegistry;