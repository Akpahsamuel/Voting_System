import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { Ballot, Candidate } from "../../pages/BallotPage";
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
  X
} from "lucide-react";
import { format } from "date-fns";

// Import shadcn components
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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

interface BallotManagementProps {
  ballots: Ballot[];
  isLoading: boolean;
  adminCapId: string | undefined;
  superAdminCapId: string | undefined;
  hasSuperAdminCap: boolean;
}

const BallotManagement = ({ 
  ballots, 
  isLoading, 
  adminCapId, 
  superAdminCapId, 
  hasSuperAdminCap 
}: BallotManagementProps) => {
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [showCandidatesDialog, setShowCandidatesDialog] = useState(false);
  const [showRemoveCandidateDialog, setShowRemoveCandidateDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDelistDialog, setShowDelistDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateDescription, setNewCandidateDescription] = useState("");
  const [newCandidateImageUrl, setNewCandidateImageUrl] = useState("");
  const [showAddCandidateDialog, setShowAddCandidateDialog] = useState(false);

  const packageId = useNetworkVariable("packageId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

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
            tx.pure(selectedCandidate.id),
          ],
        });
      } else if (adminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::remove_candidate`,
          arguments: [
            tx.object(selectedBallot.id),
            tx.object(adminCapId),
            tx.pure(selectedCandidate.id),
          ],
        });
      }

      signAndExecute(
        {
          transaction: tx,
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
          transaction: tx,
        },
        {
          onSuccess: () => {
            toast.success(`Delisted ballot: ${selectedBallot.title}`);
            setShowDelistDialog(false);
            setIsProcessing(false);
            
            // Update the UI by changing the ballot status
            if (selectedBallot) {
              setSelectedBallot({
                ...selectedBallot,
                status: 'Delisted'
              });
            }
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
              tx.pure(newCandidateName),
              tx.pure(newCandidateDescription),
              tx.pure(newCandidateImageUrl),
            ],
          });
        } else if (adminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate_with_image`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(adminCapId),
              tx.pure(newCandidateName),
              tx.pure(newCandidateDescription),
              tx.pure(newCandidateImageUrl),
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
              tx.pure(newCandidateName),
              tx.pure(newCandidateDescription),
            ],
          });
        } else if (adminCapId) {
          tx.moveCall({
            target: `${packageId}::ballot::add_candidate`,
            arguments: [
              tx.object(selectedBallot.id),
              tx.object(adminCapId),
              tx.pure(newCandidateName),
              tx.pure(newCandidateDescription),
            ],
          });
        }
      }

      signAndExecute(
        {
          transaction: tx,
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ballot Management</CardTitle>
          <CardDescription>
            Loading ballots...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ballot Management</CardTitle>
          <CardDescription>
            Manage existing ballots and their candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ballots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No ballots found</p>
            </div>
          ) : (
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
                {ballots.map((ballot) => (
                  <TableRow key={ballot.id}>
                    <TableCell className="font-medium">{ballot.title}</TableCell>
                    <TableCell>{getStatusBadge(ballot.status)}</TableCell>
                    <TableCell>
                      {new Date(ballot.expiration).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{ballot.candidates.length}</TableCell>
                    <TableCell>{ballot.totalVotes}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewCandidates(ballot)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Candidates
                          </DropdownMenuItem>
                          {ballot.status === 'Active' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAddCandidate(ballot)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Candidate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelistBallot(ballot)}
                                className="text-red-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Delist Ballot
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
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
                    <div className="mt-4 flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {candidate.votes} votes
                      </Badge>
                    </div>
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

      {/* Delist Ballot Confirmation Dialog */}
      <AlertDialog open={showDelistDialog} onOpenChange={setShowDelistDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delist Ballot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delist {selectedBallot?.title}?
              This will prevent any further voting on this ballot.
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
                  Delisting...
                </>
              ) : (
                "Delist"
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
