import { useState, useEffect, useMemo } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData } from "@mysten/sui/client";
import { toast } from "sonner";
import { Candidate } from "../../pages/BallotPage";
import { 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye, 
  UserPlus, 
  Ban, 
  Plus,
  Loader2,
  Clock,
  Check,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDate, normalizeTimestamp } from "../../utils/formatUtils";
import { Ballot, fetchBallotsOptimized, clearBallotCache } from "../../utils/ballotUtils";

// Import shadcn components
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface BallotManagementProps {
  ballots?: Ballot[];
  isLoading?: boolean;
  adminCapId: string | undefined;
  superAdminCapId: string | undefined;
  hasSuperAdminCap: boolean;
}

// Cache for ballots to avoid refetching
let ballotCache: {
  ballots: Ballot[],
  timestamp: number
} | null = null;

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Items per page for pagination
const ITEMS_PER_PAGE = 10;

const BallotManagement = ({ 
  ballots: propsBallots,
  isLoading: propsIsLoading = false, 
  adminCapId, 
  superAdminCapId, 
  hasSuperAdminCap 
}: BallotManagementProps) => {
  // Use internal state when ballots aren't passed as props
  const [internalBallots, setInternalBallots] = useState<Ballot[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{current: number, total: number} | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBallots, setTotalBallots] = useState(0);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Determine whether to use props or internal state
  const ballots = propsBallots || internalBallots;
  const isLoading = propsIsLoading || internalLoading;
  
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [showCandidatesDialog, setShowCandidatesDialog] = useState(false);
  const [showRemoveCandidateDialog, setShowRemoveCandidateDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDelistDialog, setShowDelistDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateDescription, setNewCandidateDescription] = useState("");
  const [newCandidateImageUrl, setNewCandidateImageUrl] = useState("");
  const [showAddCandidateDialog, setShowAddCandidateDialog] = useState(false);

  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // State to trigger refreshes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter ballots based on status and search query
  const filteredBallots = useMemo(() => {
    return ballots.filter(ballot => {
      // Apply status filter
      if (statusFilter !== "all" && ballot.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ballot.title.toLowerCase().includes(query) ||
          ballot.description.toLowerCase().includes(query) ||
          ballot.candidates.some(c => c.name.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [ballots, statusFilter, searchQuery]);
  
  // Calculate paginated ballots
  const paginatedBallots = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBallots.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBallots, currentPage]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredBallots.length / ITEMS_PER_PAGE);
  }, [filteredBallots]);

  // Fetch ballots if they aren't passed as props
  useEffect(() => {
    if (!propsBallots) {
      fetchBallots();
    } else {
      setTotalBallots(propsBallots.length);
    }
  }, [propsBallots, dashboardId, refreshTrigger]);
  
  const fetchBallots = async () => {
    if (!dashboardId) {
      toast.error("Dashboard ID not found in network config");
      return;
    }

    setInternalLoading(true);
    setLoadingProgress(0);
    setBatchStatus(null);
    
    try {
      // Use the optimized ballot fetching utility
      const fetchedBallots = await fetchBallotsOptimized(
        suiClient as any, // Use type assertion to avoid SuiClient version mismatch 
        dashboardId as string, 
        {
          // Set force fresh if this is a manual refresh
          forceFresh: refreshTrigger > 0,
          
          // Track loading progress
          onProgress: (progress) => {
            setLoadingProgress(progress);
          },
          
          // Track batch loading
          onLoadingBatch: (current, total) => {
            setIsFetchingMore(current > 1);
            setBatchStatus({ current, total });
          }
        }
      );
      
      console.log(`Successfully loaded ${fetchedBallots.length} ballots`);
      setInternalBallots(fetchedBallots);
      setTotalBallots(fetchedBallots.length);
      
    } catch (err) {
      console.error("Error fetching ballots:", err);
      toast.error("Failed to load ballots");
    } finally {
      setInternalLoading(false);
      setIsFetchingMore(false);
      setBatchStatus(null);
    }
  };

  const handleViewCandidates = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowCandidatesDialog(true);
  };

  const handleRemoveCandidate = (ballot: Ballot, candidate: Candidate) => {
    setSelectedBallot(ballot);
    setSelectedCandidate(candidate);
    setShowRemoveCandidateDialog(true);
  };

  const confirmRemoveCandidate = async () => {
    if (!selectedBallot || !selectedCandidate || (!adminCapId && !superAdminCapId)) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();
      
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::remove_candidate_super`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(superAdminCapId),
            tx.pure.u64(selectedCandidate.id),
          ],
        });
      } else if (adminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::remove_candidate`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(adminCapId),
            tx.pure.u64(selectedCandidate.id),
          ],
        });
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: () => {
            toast.success(`Removed candidate ${selectedCandidate.name}`);
            setShowRemoveCandidateDialog(false);
            setIsProcessing(false);
            
            // Update the UI by removing the candidate
            if (selectedBallot) {
              const updatedCandidates = selectedBallot.candidates.filter(
                c => c.id !== selectedCandidate.id
              );
              setSelectedBallot({
                ...selectedBallot,
                candidates: updatedCandidates
              });
              
              // Refresh data after a short delay
              setTimeout(() => triggerRefresh(), 1000);
            }
          },
          onError: (error) => {
            console.error("Failed to remove candidate:", error);
            toast.error("Failed to remove candidate");
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error removing candidate:", error);
      toast.error("An error occurred while removing the candidate");
      setIsProcessing(false);
    }
  };

  const handleDelistBallot = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowDelistDialog(true);
  };

  const handleActivateBallot = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowActivateDialog(true);
  };

  const handleDeleteBallot = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowDeleteDialog(true);
  };

  const confirmDelistBallot = async () => {
    if (!selectedBallot || (!adminCapId && !superAdminCapId)) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();
      
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::set_ballot_delisted_status_super`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(superAdminCapId),
          ],
        });
      } else if (adminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::set_ballot_delisted_status`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(adminCapId),
          ],
        });
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: () => {
            toast.success(`Delisted ballot: ${selectedBallot.title}`);
            setShowDelistDialog(false);
            setIsProcessing(false);
            // Update the selectedBallot status immediately
            if (selectedBallot) {
              setSelectedBallot({
                ...selectedBallot,
                status: 'Delisted'
              });
            }
            // Update the ballots list immediately
            setInternalBallots(prevBallots =>
              prevBallots.map(b =>
                b.id === selectedBallot?.id ? { ...b, status: 'Delisted' } : b
              )
            );
            // Always trigger a refresh after delisting
            triggerRefresh();
          },
          onError: (error) => {
            console.error("Failed to delist ballot:", error);
            toast.error("Failed to delist ballot");
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error delisting ballot:", error);
      toast.error("An error occurred while delisting the ballot");
      setIsProcessing(false);
    }
  };

  const confirmActivateBallot = async () => {
    if (!selectedBallot || (!adminCapId && !superAdminCapId)) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();
      
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::set_ballot_active_status_super`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(superAdminCapId),
          ],
        });
      } else if (adminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::set_ballot_active_status`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(adminCapId),
          ],
        });
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: () => {
            toast.success(`Activated ballot: ${selectedBallot.title}`);
            setShowActivateDialog(false);
            setIsProcessing(false);
            
            // Update the UI by changing the ballot status
            if (selectedBallot) {
              setSelectedBallot({
                ...selectedBallot,
                status: 'Active'
              });
              
              // Update the ballots list
              if (propsBallots) {
                // If using props, we can't update the parent state directly
                toast.success("Ballot status updated successfully");
              } else {
                // Update our internal state
                setInternalBallots(prevBallots => 
                  prevBallots.map(b => 
                    b.id === selectedBallot.id ? {...b, status: 'Active'} : b
                  )
                );
                // Refresh data after a short delay
                setTimeout(() => triggerRefresh(), 1000);
              }
            }
          },
          onError: (error) => {
            console.error("Failed to activate ballot:", error);
            toast.error("Failed to activate ballot");
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error activating ballot:", error);
      toast.error("An error occurred while activating the ballot");
      setIsProcessing(false);
    }
  };

  const confirmDeleteBallot = async () => {
    if (!selectedBallot || !superAdminCapId) {
      toast.error("Only super admins can delete ballots");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();
      
      // Only super admins can remove ballots
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::remove_ballot`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(superAdminCapId),
          ],
        });
      } else {
        toast.error("Only super admins can delete ballots");
        setIsProcessing(false);
        return;
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: () => {
            toast.success(`Deleted ballot: ${selectedBallot.title}`);
            setShowDeleteDialog(false);
            setIsProcessing(false);
            
            // Update the UI by removing the ballot
            if (propsBallots) {
              // If using props, we can't update the parent state directly
              toast.success("Ballot deleted successfully");
            } else {
              // Update our internal state
              setInternalBallots(prevBallots => 
                prevBallots.filter(b => b.id !== selectedBallot.id)
              );
              // Refresh data after a short delay
              setTimeout(() => triggerRefresh(), 1000);
            }
          },
          onError: (error) => {
            console.error("Failed to delete ballot:", error);
            toast.error("Failed to delete ballot");
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error deleting ballot:", error);
      toast.error("An error occurred while deleting the ballot");
      setIsProcessing(false);
    }
  };

  const handleAddCandidate = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setNewCandidateName("");
    setNewCandidateDescription("");
    setNewCandidateImageUrl("");
    setShowAddCandidateDialog(true);
  };

  const confirmAddCandidate = async () => {
    if (!selectedBallot || (!adminCapId && !superAdminCapId) || !newCandidateName || !newCandidateDescription) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();
      
      if (newCandidateImageUrl && newCandidateImageUrl.trim() !== "") {
        // Add candidate with image URL
        if (hasSuperAdminCap && superAdminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate_with_image_super`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(superAdminCapId),
              tx.pure.string(newCandidateName),
              tx.pure.string(newCandidateDescription),
              tx.pure.string(newCandidateImageUrl),
            ],
          });
        } else if (adminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate_with_image`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(adminCapId),
              tx.pure.string(newCandidateName),
              tx.pure.string(newCandidateDescription),
              tx.pure.string(newCandidateImageUrl),
            ],
          });
        }
      } else {
        // Add candidate without image URL
        if (hasSuperAdminCap && superAdminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate_super`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(superAdminCapId),
              tx.pure.string(newCandidateName),
              tx.pure.string(newCandidateDescription),
            ],
          });
        } else if (adminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(adminCapId),
              tx.pure.string(newCandidateName),
              tx.pure.string(newCandidateDescription),
            ],
          });
        }
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: () => {
            toast.success(`Added candidate: ${newCandidateName}`);
            setShowAddCandidateDialog(false);
            setIsProcessing(false);
            
            // Update the UI by adding the new candidate
            // In a real implementation, we would fetch the updated ballot data
            // For now, we'll simulate it with a mock ID
            if (selectedBallot) {
              const newCandidate: Candidate = {
                id: Math.max(...selectedBallot.candidates.map(c => c.id), 0) + 1,
                name: newCandidateName,
                description: newCandidateDescription,
                votes: 0,
                imageUrl: newCandidateImageUrl || undefined
              };
              
              setSelectedBallot({
                ...selectedBallot,
                candidates: [...selectedBallot.candidates, newCandidate]
              });
              
              // Refresh data after a short delay
              setTimeout(() => triggerRefresh(), 1000);
            }
          },
          onError: (error) => {
            console.error("Failed to add candidate:", error);
            toast.error("Failed to add candidate");
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("An error occurred while adding the candidate");
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'Delisted':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Delisted</Badge>;
      case 'Expired':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRefreshBallots = () => {
    clearBallotCache(dashboardId as string);
    fetchBallots();
  };

  // Helper function to trigger a refresh
  const triggerRefresh = () => {
    clearBallotCache(dashboardId as string);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && !isFetchingMore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ballot Management</CardTitle>
          <CardDescription>
            Loading ballots...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          
          {loadingProgress > 0 && (
            <div className="w-full max-w-xs mt-2">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="text-xs text-white/60 mt-1 text-center">
                {batchStatus ? (
                  <>Loading batch {batchStatus.current} of {batchStatus.total}</>
                ) : (
                  <>Loading... {loadingProgress}%</>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ballot Management</CardTitle>
            <CardDescription>
              Manage existing ballots and their candidates
            </CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshBallots}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="flex-1">
              <Input 
                placeholder="Search ballots..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="delisted">Delisted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isFetchingMore && (
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more ballots...</span>
              </div>
            </div>
          )}
          
          {filteredBallots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No ballots found</p>
            </div>
          ) :
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBallots.map((ballot) => (
                  <TableRow key={ballot.id}>
                    <TableCell className="font-medium">{ballot.title}</TableCell>
                    <TableCell>{getStatusBadge(ballot.status === 'Active' && ballot.expiration < Date.now() ? 'Expired' : ballot.status)}</TableCell>
                    <TableCell>
                      {formatDate(ballot.expiration)}
                    </TableCell>
                    <TableCell>{ballot.candidates.length}</TableCell>
                    <TableCell>{(ballot.status === 'Active' && ballot.expiration < Date.now()) || ballot.status !== 'Active' ? ballot.totalVotes : '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewCandidates(ballot)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Candidates
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleAddCandidate(ballot)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Candidate
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {ballot.status === 'Active' ? (
                            <DropdownMenuItem onClick={() => handleDelistBallot(ballot)}>
                              <Ban className="mr-2 h-4 w-4" />
                              Delist Ballot
                            </DropdownMenuItem>
                          ) : ballot.status === 'Delisted' ? (
                            <DropdownMenuItem onClick={() => handleActivateBallot(ballot)}>
                              <Check className="mr-2 h-4 w-4" />
                              Activate Ballot
                            </DropdownMenuItem>
                          ) : null}
                          
                          <DropdownMenuItem 
                            onClick={() => handleDeleteBallot(ballot)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Ballot
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-white/40 flex justify-between">
          <div>Total: {totalBallots} ballots</div>
          <div>Showing: {paginatedBallots.length} results</div>
        </CardFooter>
      </Card>

      {/* View Candidates Dialog */}
      <Dialog open={showCandidatesDialog} onOpenChange={setShowCandidatesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedBallot?.title} - Candidates</DialogTitle>
            <DialogDescription>
              {selectedBallot?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedBallot?.candidates.map((candidate) => (
              <Card key={candidate.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {candidate.imageUrl && (
                    <div className="w-full md:w-1/4">
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name}
                        className="w-full h-40 md:h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`p-4 ${candidate.imageUrl ? 'md:w-3/4' : 'w-full'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">ID: {candidate.id}</p>
                      </div>
                      {selectedBallot.status === 'Active' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveCandidate(selectedBallot, candidate)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-2">{candidate.description}</p>
                    {selectedBallot.status !== 'Active' && (
                      <div className="mt-4 flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {candidate.votes} votes
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCandidatesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Candidate Confirmation Dialog */}
      <AlertDialog open={showRemoveCandidateDialog} onOpenChange={setShowRemoveCandidateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedCandidate?.name} from the ballot?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveCandidate}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delist Ballot Dialog */}
      <AlertDialog open={showDelistDialog} onOpenChange={setShowDelistDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delist Ballot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delist this ballot? 
              This will prevent users from voting on it, but existing votes will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelistBallot} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Delist Ballot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Ballot Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Ballot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate this ballot? 
              This will make it available for users to vote on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmActivateBallot} 
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Activate Ballot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Ballot Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ballot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this ballot? 
              This action cannot be undone and all votes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteBallot} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Delete Ballot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Candidate Dialog */}
      <Dialog open={showAddCandidateDialog} onOpenChange={setShowAddCandidateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Add a new candidate to {selectedBallot?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                placeholder="Candidate name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={newCandidateDescription}
                onChange={(e) => setNewCandidateDescription(e.target.value)}
                placeholder="Candidate description"
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="imageUrl" className="text-sm font-medium">
                Image URL (Optional)
              </label>
              <Input
                id="imageUrl"
                value={newCandidateImageUrl}
                onChange={(e) => setNewCandidateImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                A URL to an image representing this candidate
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCandidateDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAddCandidate}
              disabled={isProcessing || !newCandidateName || !newCandidateDescription}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Candidate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BallotManagement;
