import { useSuiClientQuery } from "@mysten/dapp-kit";
import { FC, useState } from "react";
import { SuiObjectData } from "@mysten/sui/client";
import { Proposal, VoteNft } from "../../types";
import { getObjectUrl, openInExplorer } from "../../utils/explorerUtils";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Dialog, DialogContent, DialogTrigger } from "../../components/ui/dialog";
import { ThumbsUp, ThumbsDown, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { VoteModal } from "./VoteModal";

interface ProposalItemsProps {
  id: string;
  voteNft: VoteNft | undefined;
  onVoteTxSuccess: () => void;
}

export const ProposalItem: FC<ProposalItemsProps> = ({ id, voteNft, onVoteTxSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: dataResponse, refetch: refetchProposal, error, isPending } = useSuiClientQuery(
    "getObject", {
      id,
      options: {
        showContent: true
      }
    }
  );

  if (isPending) {
    return (
      <Card className="w-full bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="space-y-2 pb-4">
          <Skeleton className="h-6 w-3/4 bg-white/20" />
          <Skeleton className="h-4 w-full bg-white/20" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between space-x-4">
            <Skeleton className="h-8 w-16 bg-white/20" />
            <Skeleton className="h-8 w-16 bg-white/20" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Skeleton className="h-4 w-24 bg-white/20" />
          <Skeleton className="h-8 w-28 bg-white/20" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-red-950/30 backdrop-blur-md border-red-800/50">
        <CardHeader>
          <div className="flex items-center text-red-400 gap-2">
            <AlertTriangle size={20} />
            <h3 className="font-medium">Error</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!dataResponse.data) return null;

  const proposal = parseProposal(dataResponse.data);
  
  if (!proposal) return (
    <Card className="w-full bg-amber-950/30 backdrop-blur-md border-amber-800/50">
      <CardContent className="pt-6">
        <p className="text-center text-amber-400">No data found</p>
      </CardContent>
    </Card>
  );

  const expiration = proposal.expiration;
  const isDelisted = proposal.status.variant === "Delisted";
  const isExpired = isUnixTimeExpired(expiration) || isDelisted;
  
  // Calculate vote percentages for progress bar
  const totalVotes = proposal.votedYesCount + proposal.votedNoCount;
  const yesPercentage = totalVotes > 0 ? (proposal.votedYesCount / totalVotes) * 100 : 0;

  return (
    <>
      <Card 
        className={`w-full transition-all duration-200 bg-white/10 backdrop-blur-md border-white/20 ${
          isExpired 
            ? "opacity-80" 
            : "hover:bg-white/15 hover:border-blue-400/40 cursor-pointer"
        }`}
        onClick={() => !isExpired && setIsModalOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <h3 className={`font-semibold text-lg ${isExpired ? "text-white/60" : "text-white"}`}>
              {proposal.title}
            </h3>
            {voteNft && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 ring-2 ring-blue-500">
                      <AvatarImage src={voteNft.url} alt="Vote NFT" />
                      <AvatarFallback>V</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>You have voted on this proposal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={`text-sm ${isExpired ? "text-white/50" : "text-white/70"}`}>
            {proposal.description}
          </p>
        </CardHeader>
        
        <CardContent className="pb-0">
          {/* Vote progress bar */}
          <div className="flex w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-green-500/80"
              style={{ width: `${yesPercentage}%` }}
            />
            <div 
              className="bg-red-500/80"
              style={{ width: `${100 - yesPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="flex items-center gap-1 text-green-400">
                <ThumbsUp size={16} />
                <span className="font-medium">{proposal.votedYesCount}</span>
              </div>
              <div className="flex items-center gap-1 text-red-400">
                <ThumbsDown size={16} />
                <span className="font-medium">{proposal.votedNoCount}</span>
              </div>
            </div>
            
            {isExpired ? (
              <Badge variant={isDelisted ? "destructive" : "secondary"} className="text-xs bg-white/10 text-white/80 hover:bg-white/15">
                {isDelisted ? "Delisted" : "Expired"}
              </Badge>
            ) : (
              <div className="flex items-center gap-1 text-white/60 text-xs">
                <Clock size={14} />
                <span>{formatTimeRemaining(expiration)}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 mt-3 border-t border-white/10">
          <div className="w-full flex justify-between items-center">
            <Badge variant="outline" className="bg-white/10 text-white/80 hover:bg-white/15 border-white/20">
              {formatStatus(proposal.status.variant)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
              onClick={(e) => {
                e.stopPropagation();
                openInExplorer(getObjectUrl(id));
              }}
            >
              <ExternalLink size={14} />
              <span>View on Scan</span>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-md border-white/20 text-white">
          <VoteModal
            proposal={proposal}
            hasVoted={!!voteNft}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onVote={() => {
              refetchProposal();
              onVoteTxSuccess();
              setIsModalOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

function parseProposal(data: SuiObjectData): Proposal | null {
  if (data.content?.dataType !== "moveObject") return null;

  const { voted_yes_count, voted_no_count, expiration, ...rest } = data.content.fields as any;

  return {
    ...rest,
    votedYesCount: Number(voted_yes_count),
    votedNoCount: Number(voted_no_count),
    expiration: Number(expiration)
  };
}

function isUnixTimeExpired(unixTimeMs: number) {
  return new Date(unixTimeMs) < new Date();
}

function formatTimeRemaining(timestampMs: number) {
  const now = new Date();
  const expirationDate = new Date(timestampMs);
  
  if (expirationDate < now) return "Expired";
  
  const diffMs = expirationDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h left`;
  } else {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "Active": return "Active";
    case "Passed": return "Passed";
    case "Rejected": return "Rejected";
    case "Delisted": return "Delisted";
    default: return status;
  }
}

function formatUnixTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
