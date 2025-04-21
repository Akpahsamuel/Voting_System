import { useSuiClientQuery } from "@mysten/dapp-kit";
import { FC, useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import confetti from 'canvas-confetti';

interface ProposalItemsProps {
  id: string;
  voteNft: VoteNft | undefined;
  onVoteTxSuccess: () => void;
}

export const ProposalItem: FC<ProposalItemsProps> = ({ id, voteNft, onVoteTxSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { data: dataResponse, refetch: refetchProposal, error, isPending } = useSuiClientQuery(
    "getObject", {
      id,
      options: {
        showContent: true
      }
    }
  );

  useEffect(() => {
    if (showConfetti) {
      const duration = 2000;
      const end = Date.now() + duration;
      
      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#5eead4', '#3b82f6', '#60a5fa']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#5eead4', '#3b82f6', '#60a5fa']
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        } else {
          setTimeout(() => setShowConfetti(false), 1000);
        }
      })();
    }
  }, [showConfetti]);

  if (isPending) {
    return (
      <div className="transform-gpu perspective-1000">
        <motion.div 
          initial={{ rotateX: -10, rotateY: 5 }}
          animate={{ rotateX: 0, rotateY: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="transform-gpu"
        >
          <Card className="w-full bg-white/10 backdrop-blur-md border-white/20 shadow-[0_15px_50px_-15px_rgba(80,100,255,0.25)]">
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
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transform-gpu perspective-1000">
        <motion.div 
          initial={{ rotateX: -10 }}
          animate={{ rotateX: 0 }}
          transition={{ duration: 0.5 }}
          className="transform-gpu"
        >
          <Card className="w-full bg-red-950/30 backdrop-blur-md border-red-800/50 shadow-[0_10px_30px_-10px_rgba(255,80,80,0.3)]">
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
        </motion.div>
      </div>
    );
  }

  if (!dataResponse.data) return null;

  const proposal = parseProposal(dataResponse.data);
  
  if (!proposal) return (
    <div className="transform-gpu perspective-1000">
      <motion.div 
        initial={{ rotateX: -10 }}
        animate={{ rotateX: 0 }}
        transition={{ duration: 0.5 }}
        className="transform-gpu"
      >
        <Card className="w-full bg-amber-950/30 backdrop-blur-md border-amber-800/50 shadow-[0_10px_30px_-10px_rgba(255,200,80,0.3)]">
          <CardContent className="pt-6">
            <p className="text-center text-amber-400">No data found</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const expiration = proposal.expiration;
  const isDelisted = proposal.status.variant === "Delisted";
  const isExpired = isUnixTimeExpired(expiration) || isDelisted;
  const isActive = !isExpired;
  
  // Calculate vote percentages for progress bar
  const totalVotes = proposal.votedYesCount + proposal.votedNoCount;
  const yesPercentage = totalVotes > 0 ? (proposal.votedYesCount / totalVotes) * 100 : 0;

  return (
    <>
      <div className="transform-gpu perspective-1000">
        <motion.div 
          key={`proposal-${id}`}
          layoutId={`proposal-${id}`}
          initial={{ rotateX: -10, rotateY: 5, y: 20, opacity: 0 }}
          animate={{ 
            rotateX: 0, 
            rotateY: 0, 
            y: 0, 
            opacity: 1,
            boxShadow: isActive 
              ? ["0 15px 30px -15px rgba(80,100,255,0.3)", "0 15px 50px -15px rgba(80,100,255,0.5)", "0 15px 30px -15px rgba(80,100,255,0.3)"]
              : "0 15px 30px -15px rgba(80,100,255,0.15)"
          }}
          transition={{ 
            duration: 0.7, 
            ease: "easeOut", 
            boxShadow: {
              repeat: isActive ? Infinity : 0,
              duration: isActive ? 2 : 0.7
            }
          }}
          whileHover={!isExpired ? {
            rotateY: 5,
            rotateX: -5,
            scale: 1.02,
            boxShadow: "0 25px 50px -12px rgba(80, 100, 255, 0.4)"
          } : undefined}
          className="transform-gpu isolate"
        >
          <Card 
            className={`w-full transition-all duration-300 backdrop-blur-md border-white/20 ${
              isExpired 
                ? "opacity-80 bg-white/5 border-white/10" 
                : "bg-white/10 hover:bg-white/15 hover:border-blue-400/40 cursor-pointer"
            }`}
            onClick={() => !isExpired && setIsModalOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <h3 className={`font-semibold text-lg ${isExpired ? "text-white/60" : "text-white"}`}>
                  {proposal.title}
                </h3>
                {voteNft && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ rotateZ: 10, scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Avatar className="h-8 w-8 ring-2 ring-blue-500/80 shadow-[0_0_15px_5px_rgba(59,130,246,0.3)]">
                            <AvatarImage src={voteNft.url} alt="Vote NFT" />
                            <AvatarFallback>V</AvatarFallback>
                          </Avatar>
                        </motion.div>
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
              {/* Enhanced vote progress bar with animated gradient */}
              <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden mb-3 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
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
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
                        width: "50%"
                      }}
                    />
                  )}
                </motion.div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - yesPercentage}%` }}
                  transition={{ duration: 1.2, type: "spring", stiffness: 40 }}
                  className="h-full absolute top-0 right-0 overflow-hidden"
                  style={{
                    background: "linear-gradient(90deg, rgba(248,113,113,0.9) 0%, rgba(239,68,68,0.7) 100%)",
                    boxShadow: "0 0 10px rgba(248,113,113,0.5)",
                    width: `${100 - yesPercentage}%`
                  }}
                >
                  {(100 - yesPercentage) > 10 && (
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
                        width: "50%"
                      }}
                    />
                  )}
                </motion.div>
                {/* Vote percentages */}
                <div className="absolute inset-0 flex justify-between items-center px-3 text-xs font-medium">
                  {yesPercentage > 5 && (
                    <div className="text-white drop-shadow-md z-10">{yesPercentage.toFixed(1)}%</div>
                  )}
                  {(100 - yesPercentage) > 5 && (
                    <div className="text-white drop-shadow-md ml-auto z-10">{(100 - yesPercentage).toFixed(1)}%</div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.1, y: -3 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="flex items-center gap-1.5 text-green-400"
                  >
                    <div className="relative">
                      <ThumbsUp size={18} />
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1.5, 1], opacity: [0.5, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1.5, 
                              repeatDelay: 8,
                              repeatType: "mirror"
                            }}
                            className="absolute inset-0 bg-green-400 rounded-full -z-10"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-medium">{proposal.votedYesCount}</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.1, y: -3 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="flex items-center gap-1.5 text-red-400"
                  >
                    <div className="relative">
                      <ThumbsDown size={18} />
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1.5, 1], opacity: [0.5, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1.5, 
                              repeatDelay: 8,
                              repeatType: "mirror",
                              delay: 4
                            }}
                            className="absolute inset-0 bg-red-400 rounded-full -z-10"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-medium">{proposal.votedNoCount}</span>
                  </motion.div>
                </div>
                
                {isExpired ? (
                  <Badge 
                    variant={isDelisted ? "destructive" : "secondary"} 
                    className={`text-xs ${isDelisted ? 'bg-red-800/30 text-red-200' : 'bg-amber-800/30 text-amber-200'} hover:bg-white/15 shadow-[0_2px_5px_rgba(0,0,0,0.2)]`}
                  >
                    {isDelisted ? "Delisted" : "Expired"}
                  </Badge>
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center gap-1.5 text-blue-300 text-xs bg-blue-900/30 px-2.5 py-1 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.2)]"
                  >
                    <Clock size={14} />
                    <span>{formatTimeRemaining(expiration)}</span>
                  </motion.div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="pt-3 mt-3 border-t border-white/10">
              <div className="w-full flex flex-wrap justify-between items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${isActive ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' : 'bg-white/10 text-white/70 border-white/20'} hover:bg-white/15 shadow-[0_2px_5px_rgba(0,0,0,0.2)]`}
                >
                  {formatStatus(proposal.status.variant)}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 shadow-sm"
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
        </motion.div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-md border-white/20 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_30px_rgba(80,100,255,0.2)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VoteModal
              proposal={proposal}
              hasVoted={!!voteNft}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onVote={() => {
                refetchProposal();
                onVoteTxSuccess();
                setShowConfetti(true);
                setIsModalOpen(false);
              }}
            />
          </motion.div>
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
