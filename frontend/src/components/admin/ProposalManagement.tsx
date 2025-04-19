import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect } from "react";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "react-toastify";
import { getObjectUrl, getTransactionUrl, openInExplorer } from "../../utils/explorerUtils";

interface ProposalListItem {
  id: string;
  title: string;
  description: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const ProposalManagement = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const packageId = useNetworkVariable("packageId");
  const { adminCapId } = useAdminCap();
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = useState<{ id: string; digest: string } | null>(null);

  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData, refetch: refetchDashboard } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Fetch all proposals
  const { data: proposalsData } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: getProposalIds(),
      options: {
        showContent: true,
      },
    }
  );

  // Process proposal data when it changes
  useEffect(() => {
    if (!proposalsData || !Array.isArray(proposalsData)) return;

    const parsedProposals = proposalsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;

        const fields = obj.content.fields as any;
        return {
          id: obj.objectId,
          title: fields.title,
          description: fields.description,
          votedYesCount: Number(fields.voted_yes_count),
          votedNoCount: Number(fields.voted_no_count),
          expiration: Number(fields.expiration),
          status: fields.status.variant,
        };
      })
      .filter(Boolean) as ProposalListItem[];

    setProposals(parsedProposals);
  }, [proposalsData]);

  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isExpired = (timestamp: number) => {
    return new Date(timestamp) < new Date();
  };

  const handleDelist = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::set_delisted_status`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal delisted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            toast.error(`Error delisting proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error) {
      toast.error(`Error: ${error}`);
      setLoading(null);
    }
  };

  const handleActivate = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::set_active_status`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal activated successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
          },
          onError: (error) => {
            toast.error(`Error activating proposal: ${error.message}`);
            setLoading(null);
          },
        }
      );
    } catch (error) {
      toast.error(`Error: ${error}`);
      setLoading(null);
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!adminCapId) return;
    setLoading(proposalId);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::proposal::remove`,
        arguments: [tx.object(proposalId), tx.object(adminCapId)],
      });

      await signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: async ({ digest }) => {
            toast.success("Proposal deleted successfully");
            setLastTxDigest({ id: proposalId, digest });
            await refetchDashboard();
            setLoading(null);
            setDeleteConfirm(null);
          },
          onError: (error) => {
            toast.error(`Error deleting proposal: ${error.message}`);
            setLoading(null);
            setDeleteConfirm(null);
          },
        }
      );
    } catch (error) {
      toast.error(`Error: ${error}`);
      setLoading(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Manage Proposals</h2>

      {lastTxDigest && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">
            Transaction successfully submitted to the blockchain!
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => openInExplorer(getTransactionUrl(lastTxDigest.digest))}
              className="text-xs text-white hover:underline bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded"
            >
              View Transaction on Scan
            </button>
            <button
              onClick={() => openInExplorer(getObjectUrl(lastTxDigest.id))}
              className="text-xs text-white hover:underline bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded"
            >
              View Proposal on Scan
            </button>
          </div>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No proposals found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Votes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{proposal.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{proposal.description}</div>
                    <div className="mt-1">
                      <button
                        onClick={() => openInExplorer(getObjectUrl(proposal.id))}
                        className="text-xs text-white hover:underline bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded"
                      >
                        View on Scan
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        proposal.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    Yes: {proposal.votedYesCount} / No: {proposal.votedNoCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={isExpired(proposal.expiration) ? "text-red-500" : ""}>
                      {formatDate(proposal.expiration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {deleteConfirm === proposal.id ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Confirm:</span>
                        <button
                          onClick={() => handleDelete(proposal.id)}
                          disabled={loading === proposal.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        {proposal.status === "Active" ? (
                          <button
                            onClick={() => handleDelist(proposal.id)}
                            disabled={loading === proposal.id}
                            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 mr-2 disabled:opacity-50"
                          >
                            {loading === proposal.id ? "Processing..." : "Delist"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(proposal.id)}
                            disabled={loading === proposal.id}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-2 disabled:opacity-50"
                          >
                            {loading === proposal.id ? "Processing..." : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(proposal.id)}
                          disabled={loading === proposal.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProposalManagement;