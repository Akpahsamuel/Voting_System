import { useSuiClientQuery } from "@mysten/dapp-kit";
import { FC, useState } from "react";
import { EcText } from "../Shared";
import { SuiObjectData } from "@mysten/sui/client";
import { Proposal } from "../../types";
import { VoteModal } from "./VoteModal";


interface ProposalItemsProps {
  id: string;
};

export const ProposalItem: FC<ProposalItemsProps> = ({id}) => {
  const [isModelOpen, setIsModelOpen] = useState(false);
  const { data: dataResponse, error, isPending} = useSuiClientQuery(
    "getObject", {
      id,
      options: {
        showContent: true
      }
    }
  );

  if (isPending) return <EcText centered text="Loading..."/>;
  if (error) return <EcText isError text={`Error: ${error.message}`}/>;
  if (!dataResponse.data) return <EcText text="Not Found"/>;

  const proposal = parseProposal(dataResponse.data);

  if (!proposal) return <EcText text="No data found!"/>

  const expiration = proposal.expiration;
  // const expiration = 0;
  const isExpired = isUnixTimeExpired(expiration);

  return (
    <>
      <div
        onClick={() => !isExpired && setIsModelOpen(true)}
        className={`${isExpired ? "cursor-not-allowed border-gray-600" : "hover:border-blue-500"}
          p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800  transition-colors cursor-pointer`}
      >
        <p
          className={`${isExpired ? "text-gray-600" : "text-gray-300"} text-xl font-semibold mb-2`}>{proposal.title}
        </p>
        <p
          className={`${isExpired ? "text-gray-600" : "text-gray-300"} `}>{proposal.description}
        </p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-4">
            <div className={`${isExpired ? "text-green-800" : "text-green-600"} flex items-center`}>
              <span className="mr-1">👍</span>
              {proposal.votedYesCount}
            </div>
            <div className={`${isExpired ? "text-red-800" : "text-red-600"} flex items-center`}>
              <span className="mr-1">👎</span>
              {proposal.votedNoCount}
            </div>
          </div>
          <div>
            <p className={`${isExpired ? "text-gray-600" : "text-gray-400"} text-sm`}>{formatUnixTime(expiration)}</p>
          </div>
        </div>
      </div>
      <VoteModal
        proposal={proposal}
        isOpen={isModelOpen}
        onClose={() => setIsModelOpen(false)}
        onVote={(votedYes: boolean) => console.log(votedYes)}
      />
    </>
  )
}

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

function isUnixTimeExpired(unixTimeSec: number) {
  return new Date(unixTimeSec * 1000) < new Date();
}

function formatUnixTime(timestampSec: number) {

  if (isUnixTimeExpired(timestampSec)) {
    return "Expired";
  }

  return new Date(timestampSec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}