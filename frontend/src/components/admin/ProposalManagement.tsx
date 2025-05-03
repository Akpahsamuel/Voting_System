import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect } from "react";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
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
  CheckCircle,
  Clock
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { motion } from "framer-motion";

interface ProposalListItem {
  id: string;
  title: string;
  description: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
  is_private: boolean;
}

interface ProposalManagementProps {
  adminCapId?: string;
}

const ProposalManagement: React.FC<ProposalManagementProps> = ({ adminCapId: providedAdminCapId }) => {
  const dashboardId = useNetworkVariable("dashboardId");
  const packageId = useNetworkVariable("packageId");
  const { adminCapId: hookAdminCapId, hasAdminCap } = useAdminCap();
  const { superAdminCapId, hasSuperAdminCap } = useSuperAdminCap();
  const adminCapId = providedAdminCapId || hookAdminCapId;
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = useState<{ id: string; digest: string } | null>(null);
  const [expirationModalOpen, setExpirationModalOpen] = useState<string | null>(null);
  const [newExpiration, setNewExpiration] = useState<string>("");

  // Log available capabilities
  useEffect(() => {
    console.log("ProposalManagement - AdminCap:", adminCapId);
    console.log("ProposalManagement - Has AdminCap:", hasAdminCap);
    console.log("ProposalManagement - SuperAdminCap:", superAdminCapId);
    console.log("ProposalManagement - Has SuperAdminCap:", hasSuperAdminCap);
  }, [adminCapId, hasAdminCap, superAdminCapId, hasSuperAdminCap]);

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
          is_private: fields.is_private,
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
    console.log("Attempting to delist proposal:", proposalId);
    
    // First decide which capability and function to use
    const capId = hasSuperAdminCap ? superAdminCapId : adminCapId;
    const functionTarget = hasSuperAdminCap 
      ? `${packageId}::proposal::set_delisted_status_super`
      : `${packageId}::proposal::set_delisted_status`;
      
    if (!capId) {
      toast.error("No admin capability found");
      return;
    }
    
    console.log("Using capability:", capId);
    console.log("Using function:", functionTarget);
    
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: functionTarget,
        arguments: [
          tx.object(proposalId),
          tx.object(capId)
        ],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            console.log("Delist transaction successful:", digest);
            toast.success("Proposal delisted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            console.error("Delist transaction failed:", error);
            toast.error(`Error delisting proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error: any) {
      console.error("Error in delist transaction:", error);
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
    }
  };

  const handleActivate = async (proposalId: string) => {
    console.log("Attempting to activate proposal:", proposalId);
    
    // First decide which capability and function to use
    const capId = hasSuperAdminCap ? superAdminCapId : adminCapId;
    const functionTarget = hasSuperAdminCap 
      ? `${packageId}::proposal::set_active_status_super`
      : `${packageId}::proposal::set_active_status`;
      
    if (!capId) {
      toast.error("No admin capability found");
      return;
    }
    
    console.log("Using capability:", capId);
    console.log("Using function:", functionTarget);
    
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: functionTarget,
        arguments: [
          tx.object(proposalId),
          tx.object(capId)
        ],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            console.log("Activate transaction successful:", digest);
            toast.success("Proposal activated successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            console.error("Activate transaction failed:", error);
            toast.error(`Error activating proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error: any) {
      console.error("Error in activate transaction:", error);
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
    }
  };

  const handleDelete = async (proposalId: string) => {
    console.log("Attempting to delete proposal:", proposalId);
    
    // First decide which capability and function to use
    const capId = hasSuperAdminCap ? superAdminCapId : adminCapId;
    const functionTarget = hasSuperAdminCap 
      ? `${packageId}::proposal::remove_super`
      : `${packageId}::proposal::remove`;
      
    if (!capId) {
      toast.error("No admin capability found");
      return;
    }
    
    console.log("Using capability:", capId);
    console.log("Using function:", functionTarget);
    
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: functionTarget,
        arguments: [
          tx.object(proposalId),
          tx.object(capId)
        ],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            console.log("Delete transaction successful:", digest);
            toast.success("Proposal deleted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
            setDeleteConfirm(null);
          },
          onError: (error) => {
            console.error("Delete transaction failed:", error);
            toast.error(`Error deleting proposal: ${error.message}`);
            setLoading(null);
            setDeleteConfirm(null);
          },
        }
      );
    } catch (error: any) {
      console.error("Error in delete transaction:", error);
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
      setDeleteConfirm(null);
    }
  };

  const handleChangeExpiration = async (proposalId: string) => {
    if (!newExpiration) return;
    
    const newExpirationMs = new Date(newExpiration).getTime();
    
    // First decide which capability and function to use
    const capId = hasSuperAdminCap ? superAdminCapId : adminCapId;
    const functionTarget = hasSuperAdminCap 
      ? `${packageId}::proposal::change_expiration_date`
      : `${packageId}::proposal::change_expiration_date`;
      
    if (!capId) {
      toast.error("No admin capability found");
      return;
    }
    
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: functionTarget,
        arguments: [
          tx.object(proposalId),
          tx.object(capId),
          tx.pure.u64(newExpirationMs)
        ],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            console.log("Change expiration transaction successful:", digest);
            toast.success("Proposal expiration date changed successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
            setExpirationModalOpen(null);
            setNewExpiration("");
          },
          onError: (error) => {
            console.error("Change expiration transaction failed:", error);
            toast.error(`Error changing expiration date: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error: any) {
      console.error("Error in change expiration transaction:", error);
      toast.error(`Error: ${error.message || error}`);
      setLoading(null);
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
                            <div className="font-semibold flex items-center gap-2">
                              {proposal.title}
                              {proposal.is_private ? (
                                <Badge className="bg-amber-600 text-white ml-2">Private</Badge>
                              ) : (
                                <Badge className="bg-blue-600 text-white ml-2">Public</Badge>
                              )}
                            </div>
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
                            variant={proposal.status === "Active" ? "default" : proposal.status === "Expired" ? "outline" : "secondary"}
                            className={proposal.status === "Active" 
                              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" 
                              : proposal.status === "Expired"
                                ? "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                            }
                          >
                            {proposal.status === "Active" ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : proposal.status === "Expired" ? (
                              <Clock className="mr-1 h-3 w-3" />
                            ) : (
                              <Ban className="mr-1 h-3 w-3" />
                            )}
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-3">
                            {/* Vote Counts */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">Yes Votes</span>
                                  <span className="font-medium text-green-400">{proposal.votedYesCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">No Votes</span>
                                  <span className="font-medium text-red-400">{proposal.votedNoCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">Total Votes</span>
                                  <span className="font-medium text-white">{totalVotes}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">Yes %</span>
                                  <span className="font-medium text-green-400">{yesPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">No %</span>
                                  <span className="font-medium text-red-400">{noPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/60">Turnout</span>
                                  <span className="font-medium text-white">
                                    {totalVotes > 0 ? ((totalVotes / 1000) * 100).toFixed(1) : 0}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Vote Progress Bar */}
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${yesPercentage}%` }}
                                transition={{ duration: 1.2, type: "spring", stiffness: 40 }}
                                className="h-full relative overflow-hidden"
                                style={{
                                  background: "linear-gradient(90deg, rgba(74,222,128,0.7) 0%, rgba(34,197,94,0.9) 100%)",
                                  boxShadow: "0 0 10px rgba(74,222,128,0.5)"
                                }}
                              >
                                {yesPercentage > 10 && (
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white"
                                  >
                                    {yesPercentage.toFixed(1)}%
                                  </motion.div>
                                )}
                              </motion.div>
                            </div>

                            {/* Vote Distribution Chart */}
                            <div className="relative h-24 w-full">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-20 h-20">
                                  {/* Background Circle */}
                                  <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="45"
                                      fill="none"
                                      stroke="rgba(255,255,255,0.1)"
                                      strokeWidth="10"
                                    />
                                  </svg>
                                  
                                  {/* Yes Votes Arc */}
                                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                                    <motion.circle
                                      cx="50"
                                      cy="50"
                                      r="45"
                                      fill="none"
                                      stroke="rgba(74,222,128,0.7)"
                                      strokeWidth="10"
                                      strokeDasharray={`${yesPercentage * 2.827} 282.7`}
                                      strokeDashoffset="70.7"
                                      initial={{ strokeDasharray: "0 282.7" }}
                                      animate={{ strokeDasharray: `${yesPercentage * 2.827} 282.7` }}
                                      transition={{ duration: 1.2, type: "spring", stiffness: 40 }}
                                    />
                                  </svg>

                                  {/* No Votes Arc */}
                                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                                    <motion.circle
                                      cx="50"
                                      cy="50"
                                      r="45"
                                      fill="none"
                                      stroke="rgba(248,113,113,0.7)"
                                      strokeWidth="10"
                                      strokeDasharray={`${noPercentage * 2.827} 282.7`}
                                      strokeDashoffset={70.7 - (yesPercentage * 2.827)}
                                      initial={{ strokeDasharray: "0 282.7" }}
                                      animate={{ strokeDasharray: `${noPercentage * 2.827} 282.7` }}
                                      transition={{ duration: 1.2, type: "spring", stiffness: 40 }}
                                    />
                                  </svg>

                                  {/* Center Text */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-sm font-medium text-white">
                                        {totalVotes}
                                      </div>
                                      <div className="text-xs text-white/60">
                                        votes
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
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
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => setExpirationModalOpen(proposal.id)}
                                      className="text-blue-600 dark:text-blue-400"
                                    >
                                      <Clock className="mr-2 h-4 w-4" />
                                      Change Expiration
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDelist(proposal.id)}
                                      className="text-amber-600 dark:text-amber-400"
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Delist Proposal
                                    </DropdownMenuItem>
                                  </>
                                ) : proposal.status === "Expired" ? (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => setExpirationModalOpen(proposal.id)}
                                      className="text-blue-600 dark:text-blue-400"
                                    >
                                      <Clock className="mr-2 h-4 w-4" />
                                      Change Expiration
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleActivate(proposal.id)}
                                      className="text-green-600 dark:text-green-400"
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      Activate Proposal
                                    </DropdownMenuItem>
                                  </>
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

      <Dialog open={!!expirationModalOpen} onOpenChange={(open) => {
        if (!open) {
          setExpirationModalOpen(null);
          setNewExpiration("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Proposal Expiration Date</DialogTitle>
            <DialogDescription>
              Set a new expiration date for the proposal
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expiration">New Expiration Date</Label>
              <Input
                id="expiration"
                type="datetime-local"
                value={newExpiration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpiration(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExpirationModalOpen(null);
                setNewExpiration("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => expirationModalOpen && handleChangeExpiration(expirationModalOpen)}
              disabled={!newExpiration || loading === expirationModalOpen}
            >
              {loading === expirationModalOpen ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Expiration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalManagement;
