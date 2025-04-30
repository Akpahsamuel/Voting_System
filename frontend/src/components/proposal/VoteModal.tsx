import { FC, useRef, useState } from "react";
import { Proposal } from "../../types";
import { ConnectButton, useCurrentWallet, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "react-toastify";
import { getTransactionUrl, openInExplorer } from "../../utils/explorerUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";

interface VoteModalProps {
  proposal: Proposal;
  hasVoted: boolean;
  isOpen: boolean;
  onClose: () => void;
  onVote: (votedYes: boolean) => void;
}

export const VoteModal: FC<VoteModalProps> = ({
  proposal,
  hasVoted,
  isOpen,
  onClose,
  onVote,
}) => {
  const { connectionStatus } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending, isSuccess, reset } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const toastId = useRef<number | string>();
  const [latestTxDigest, setLatestTxDigest] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (message: string) => toastId.current = toast(message, { autoClose: false });

  const dismissToast = (message: string) => {
    toast.dismiss(toastId.current);
    toast(message, { autoClose: 2000 });
  };

  const vote = (voteYes: boolean) => {
    const tx = new Transaction();
    tx.moveCall({
      arguments: [
        tx.object(proposal.id.id),
        tx.object(dashboardId),
        tx.pure.bool(voteYes),
        tx.object(SUI_CLOCK_OBJECT_ID)
      ],
      target: `${packageId}::proposal::vote`
    });

    showToast("Processing Transaction");
    signAndExecute({
      transaction: tx.serialize()
    }, {
      onError: (error) => {
        console.error("Transaction error:", error);
        dismissToast("Transaction Failed!");
      },
      onSuccess: async ({ digest }) => {
        // Store the transaction digest for viewing on SuiScan
        setLatestTxDigest(digest);
        
        await suiClient.waitForTransaction({
          digest,
          options: {
            showEffects: true
          }
        });

        const eventResult = await suiClient.queryEvents({
          query: { Transaction: digest }
        });

        if (eventResult.data.length > 0) {
          const firstEvent = eventResult.data[0].parsedJson as {proposal_id?: string, voter?: string, vote_yes?: boolean };
          const id = firstEvent.proposal_id || "No event found for given criteria";
          const voter = firstEvent.voter || "No event found for given criteria";
          const voteYes = firstEvent.vote_yes || "No event found for given criteria";
          console.log("Event Captured!", id, voter, voteYes);
        } else {
          console.log("No events found!");
        }

        reset();
        dismissToast("Transaction Successful!");
        onVote(voteYes);
      }
    });
  };

  const votingDisabled = hasVoted || isPending || isSuccess;
  
  // Calculate vote percentages for progress bar
  const totalVotes = proposal.votedYesCount + proposal.votedNoCount;
  const yesPercentage = totalVotes > 0 ? (proposal.votedYesCount / totalVotes) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{proposal.title}</DialogTitle>
            {(hasVoted || isSuccess) ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 size={14} />
                <span>Voted</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <AlertCircle size={14} />
                <span>Not Voted</span>
              </Badge>
            )}
          </div>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 pt-1">
            {proposal.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-6">
            {/* Vote Stats Card */}
            <Card className="mb-4 bg-gray-50 dark:bg-gray-800/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                      <ThumbsUp size={16} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Yes Votes</p>
                      <p className="font-semibold">{proposal.votedYesCount}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30">
                      <ThumbsDown size={16} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No Votes</p>
                      <p className="font-semibold">{proposal.votedNoCount}</p>
                    </div>
                  </div>
                </div>
                
                {/* Vote Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{yesPercentage.toFixed(1)}%</span>
                    <span>{(100 - yesPercentage).toFixed(1)}%</span>
                  </div>
                  <div className="flex w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 dark:bg-green-600"
                      style={{ width: `${yesPercentage}%` }}
                    />
                    <div 
                      className="bg-red-500 dark:bg-red-600"
                      style={{ width: `${100 - yesPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction notification */}
            {latestTxDigest && (
              <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Transaction Submitted</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
                  <div className="space-y-2">
                    <p>Your vote has been recorded on the blockchain</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900"
                      onClick={() => openInExplorer(getTransactionUrl(latestTxDigest))}
                    >
                      <ExternalLink size={14} />
                      <span>View on SuiScan</span>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Voting Actions */}
          {connectionStatus === "connected" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  disabled={votingDisabled}
                  onClick={() => vote(true)}
                  variant="outline" 
                  className={cn(
                    "border-2 h-12 rounded-lg",
                    votingDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-green-50 dark:hover:bg-green-900/30 border-green-500 dark:border-green-700 text-green-700 dark:text-green-400"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="mr-2 h-4 w-4" />
                  )}
                  Vote Yes
                </Button>
                
                <Button
                  disabled={votingDisabled}
                  onClick={() => vote(false)}
                  variant="outline"
                  className={cn(
                    "border-2 h-12 rounded-lg",
                    votingDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-red-50 dark:hover:bg-red-900/30 border-red-500 dark:border-red-700 text-red-700 dark:text-red-400"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsDown className="mr-2 h-4 w-4" />
                  )}
                  Vote No
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <ConnectButton connectText="Connect to Vote" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full border border-gray-200 dark:border-gray-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
