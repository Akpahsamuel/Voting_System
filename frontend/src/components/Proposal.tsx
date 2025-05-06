import { FC, useState } from "react";
import { Proposal as ProposalType } from "../types";
import { formatDate } from "../utils/dateFormatter";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { useToast } from "../hooks/useToast";
import { useNetworkVariable } from "../config/networkConfig";

interface ProposalProps {
  proposal: ProposalType;
  onVoteSuccess?: () => void;
}

export const Proposal: FC<ProposalProps> = ({ proposal, onVoteSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const toast = useToast();
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");

  const handleVote = async (voteYes: boolean) => {
    if (!packageId) return;
    try {
      setIsLoading(true);
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::proposal::vote`,
        arguments: [
          tx.object(proposal.id),
          tx.object(dashboardId), // Pass the dashboard object ID
          tx.pure.bool(voteYes),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
      
      signAndExecute({
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      },
      {
        onSuccess: () => {
          toast.success("Vote successfully recorded!");
          if (onVoteSuccess) onVoteSuccess();
        },
        onError: (error) => {
          toast.error(`Error recording vote: ${error.message}`);
          console.error("Error voting:", error);
        },
      });
    } catch (error) {
      console.error("Error voting:", error);
      toast.error(`Error preparing vote transaction: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Actual component rendering would go here
  return (
    <div className="proposal-container">
      {/* Render proposal content */}
    </div>
  );
}; 