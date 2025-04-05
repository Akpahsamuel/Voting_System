import { useSuiClientQuery } from "@mysten/dapp-kit";
import { FC } from "react";
import { EcText } from "../Shared";
import { SuiObjectData } from "@mysten/sui/client";
import { Proposal } from "../../types";


type ProposalItemsProps = {
  id: string
};

export const ProposalItem: FC<ProposalItemsProps> = ({id}) => {
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

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 hover:border-blue-500 transition-colors">
      <p className="text-xl font-semibold mb-2">{proposal.title}</p>
      <p className="text-gray-700 dark:text-gray-300">{proposal.description}</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex space-x-4">
          <div className="flex items-center text-green-600">
            <span className="mr-1">👍</span>
            {proposal.votedYesCount}
          </div>
          <div className="flex items-center text-red-600">
            <span className="mr-1">👎</span>
            {proposal.votedNoCount}
          </div>
        </div>
      </div>
    </div>
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