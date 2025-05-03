import { FC, useState } from "react";
import { Proposal, ProposalStatus } from "../types";
import { formatDate } from "../utils/dateFormatter";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { useToast } from "../hooks/useToast";
import { useNetworkVariable } from "../config/networkConfig";

const handleVote = async (voteYes: boolean) => {
    if (!packageId) return;
    try {
      setIsLoading(true);
      const tx = new Transaction();
      const dashboardId = useNetworkVariable("dashboardId");

      tx.moveCall({
        target: `${packageId}::proposal::vote`,
        arguments: [
          tx.object(proposalId),
          tx.object(dashboardId), // Pass the dashboard object ID
          tx.pure.bool(voteYes),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
      // ... rest of the function remains the same
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsLoading(false);
    }
  }; 