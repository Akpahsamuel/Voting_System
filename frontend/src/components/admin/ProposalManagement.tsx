import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect } from "react";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "sonner";
import { getObjectUrl, getTransactionUrl, openInExplorer } from "../../utils/explorerUtils";
import { format } from "date-fns";
import { 
  AlertCircle, 
  Check, 
  ExternalLink, 
  Eye, 
  Loader2, 
  MoreHorizontal, 
  Trash2, 
  Ban, 
  CheckCircle
} from "lucide-react";

// Import shadcn components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Progress } from "../../components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

interface ProposalListItem {
  id: string;
  title: string;
  description: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const ProposalManagement = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const packageId = useNetworkVariable("packageId");
  const { adminCapId } = useAdminCap();
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = useState<{ id: string; digest: string } | null>(null);

  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData, refetch: refetchDashboard } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Fetch all proposals
  const { data: proposalsData, isLoading: isLoadingProposals } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: getProposalIds(),
      options: {
        showContent: true,
      },
    }
  );

  // Process proposal data when it changes
  useEffect(() => {
    if (!proposalsData || !Array.isArray(proposalsData)) return;

    const parsedProposals = proposalsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;

        const fields = obj.content.fields as any;
        return {
          id: obj.objectId,
          title: fields.title,
          description: fields.description,
          votedYesCount: Number(fields.voted_yes_count),
          votedNoCount: Number(fields.voted_no_count),
          expiration: Number(fields.expiration),
          status: fields.status.variant,
        };
      })
      .filter(Boolean) as ProposalListItem[];

    setProposals(parsedProposals);
  }, [proposalsData]);

  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
  }

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "PPP p");
  };

  const isExpired = (timestamp: number) => {
    return new Date(timestamp) < new Date();
  };

  const getTotalVotes = (yes: number, no: number) => {
    return yes + no;
  };

  const getVotePercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const handleDelist = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::set_delisted_status`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal delisted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            toast.error(`Error delisting proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
    }
  };

  const handleActivate = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::set_active_status`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal activated successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            toast.error(`Error activating proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::remove`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal deleted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
            setDeleteConfirm(null);
          },
          onError: (error) => {
            toast.error(`Error deleting proposal: ${error.message}`);
            setLoading(null);
            setDeleteConfirm(null);
          },
        }
      );
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="border shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-between">
            <span>Manage Proposals</span>
            {isLoadingProposals && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            View and manage all governance proposals
          </CardDescription>
        </CardHeader>

        <CardContent>
          {lastTxDigest && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">Transaction Success</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                <p className="mb-2">Transaction successfully submitted to the blockchain!</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-800 dark:bg-blue-800/30 dark:hover:bg-blue-800/50 dark:border-blue-700 dark:text-blue-300"
                    onClick={() => openInExplorer(getTransactionUrl(lastTxDigest.digest))}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View Transaction
                  </Button>
                  <Button
                    size="sm"
                    variant="outline" 
                    className="bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-800 dark:bg-blue-800/30 dark:hover:bg-blue-800/50 dark:border-blue-700 dark:text-blue-300"
                    onClick={() => openInExplorer(getObjectUrl(lastTxDigest.id))}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Proposal
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isLoadingProposals ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">No proposals found</h3>
              <p className="text-sm text-muted-foreground/80">Create new proposals to see them listed here</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => {
                    const totalVotes = getTotalVotes(proposal.votedYesCount, proposal.votedNoCount);
                    const yesPercentage = getVotePercentage(proposal.votedYesCount, totalVotes);
                    const noPercentage = getVotePercentage(proposal.votedNoCount, totalVotes);
                    
                    return (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="font-semibold">{proposal.title}</div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => openInExplorer(getObjectUrl(proposal.id))}
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View on Scan
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={proposal.status === "Active" ? "default" : "secondary"}
                            className={proposal.status === "Active" 
                              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                            }
                          >
                            {proposal.status === "Active" ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <Ban className="mr-1 h-3 w-3" />
                            )}
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-green-600 dark:text-green-400">Yes: {proposal.votedYesCount}</span>
                              <span className="text-red-600 dark:text-red-400">No: {proposal.votedNoCount}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="flex h-full">
                                <div 
                                  className="bg-green-500 dark:bg-green-600" 
                                  style={{ width: `${yesPercentage}%` }}
                                />
                                <div 
                                  className="bg-red-500 dark:bg-red-600" 
                                  style={{ width: `${noPercentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-xs text-center text-muted-foreground">
                              {totalVotes} total votes
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={isExpired(proposal.expiration) ? "text-red-500 dark:text-red-400 font-medium" : ""}
                                >
                                  {formatDate(proposal.expiration)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                {isExpired(proposal.expiration) ? "Expired" : "Active expiration date"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog open={deleteConfirm === proposal.id} onOpenChange={(open) => {
                            if (!open) setDeleteConfirm(null);
                          }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={loading === proposal.id}>
                                  {loading === proposal.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {proposal.status === "Active" ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleDelist(proposal.id)}
                                    className="text-amber-600 dark:text-amber-400"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Delist Proposal
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => handleActivate(proposal.id)}
                                    className="text-green-600 dark:text-green-400"
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Activate Proposal
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirm(proposal.id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Proposal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this proposal? This action cannot be undone and will permanently remove the proposal and associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(proposal.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {loading === proposal.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProposalManagement;
