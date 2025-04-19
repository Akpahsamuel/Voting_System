import { FC, useRef, useState } from "react";
import { Proposal } from "../../types";
import { ConnectButton, useCurrentWallet, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "react-toastify";
import { getTransactionUrl, openInExplorer } from "../../utils/explorerUtils";

interface VoteModalProps {
  proposal: Proposal;
  hasVoted: boolean;
  isOpen: boolean;
  onClose: () => void;
  onVote: (votedYes: boolean) => void;
};

export const VoteModal: FC<VoteModalProps> = ({
  proposal,
  hasVoted,
  isOpen,
  onClose,
  onVote,
}) => {
  const { connectionStatus } = useCurrentWallet();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending, isSuccess, reset } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const toastId = useRef<number | string>();
  const [latestTxDigest, setLatestTxDigest] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (message: string) => toastId.current = toast(message, {autoClose: false});

  const dismissToast = (message: string) => {
    toast.dismiss(toastId.current);
    toast(message, { autoClose: 2000 });
  };

  const vote = (voteYes: boolean) => {

    const tx = new Transaction();
    tx.moveCall({
      arguments: [
        tx.object(proposal.id.id),
        tx.pure.bool(voteYes),
        tx.object("0x6")
      ],
      target: `${packageId}::proposal::vote`
    });

    showToast("Processing Transaction");
    signAndExecute({
      transaction: tx.serialize()
    }, {
      onError: () => {
        dismissToast("Tx Failed!");
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
          const id = firstEvent.proposal_id || "No event found for give criteria";
          const voter = firstEvent.voter || "No event found for give criteria";
          const voteYes = firstEvent.vote_yes || "No event found for give criteria";
          console.log("Event Captured!");
          console.log(id, voter, voteYes);
        } else {
          console.log("No events found!");
        }

        reset();
        dismissToast("Tx Successful!");
        onVote(voteYes);
      }
    });
  }

  const votingDisable = hasVoted || isPending || isSuccess;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">

        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold mb-4">{proposal.title}</h2>
          {hasVoted || isSuccess ? (
            <div className="w-14 text-sm p-1 font-medium rounded-full bg-green-100 text-gray-800 text-center">
              Voted
            </div>
          ) : <div className="w-24 text-sm p-1 font-medium rounded-full bg-red-100 text-gray-800 text-center">
            Not Voted
          </div>
          }
        </div>

        <p className="mb-6 text-gray-700 dark:text-gray-300">{proposal.description}</p>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>👍Yes votes: {proposal.votedYesCount}</span>
            <span>👎No votes: {proposal.votedNoCount}</span>
          </div>
          
          {latestTxDigest && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-2">
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">
                Your vote has been submitted to the blockchain!
              </p>
              <button
                onClick={() => openInExplorer(getTransactionUrl(latestTxDigest))}
                className="text-xs text-white hover:underline bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded"
              >
                View Transaction on Scan
              </button>
            </div>
          )}
          
          <div className="flex justify-between gap-4">
            {connectionStatus === "connected" ?
              <>
                <button
                  disabled={votingDisable}
                  onClick={() => vote(true)}
                  className="flex-1 bg-green-500 text-white px-6
                  py-2 rounded hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Vote Yes
                </button>
                <button
                  disabled={votingDisable}
                  onClick={() => vote(false)}
                  className="flex-1 bg-red-500 text-white px-6 py-2
                  rounded hover:bg-red-600 transition-colors  disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Vote No
                </button>
              </> :
              <div>
                <ConnectButton connectText="Connect to vote" />
              </div>
            }
          </div>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 dark:border-gray-600 px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};