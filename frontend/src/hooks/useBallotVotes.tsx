import { useCallback } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariableString } from '../config/networkConfig';

export const useBallotVotes = () => {
  const account = useCurrentAccount();
  const packageId = useNetworkVariableString("packageId");

  // Query for BallotVoteProof NFTs owned by the user
  const { data: ballotVotesResponse, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
      options: {
        showContent: true
      },
      filter: {
        StructType: `${packageId}::ballot::BallotVoteProof`
      }
    },
    {
      enabled: !!account
    }
  );

  // Extract ballot IDs that the user has voted on
  const fetchBallotVotes = useCallback(async () => {
    const votedBallots: Record<string, boolean> = {};
    
    if (ballotVotesResponse?.data) {
      for (const item of ballotVotesResponse.data) {
        if (item.data?.content?.dataType === "moveObject") {
          const fields = item.data.content.fields as any;
          if (fields.ballot_id) {
            votedBallots[fields.ballot_id] = true;
          }
        }
      }
    }
    
    return votedBallots;
  }, [ballotVotesResponse]);

  return {
    ballotVotesData: ballotVotesResponse?.data || [],
    fetchBallotVotes,
    refetchBallotVotes: refetch
  };
};