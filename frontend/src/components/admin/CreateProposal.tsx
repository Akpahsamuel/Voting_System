import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "react-toastify";

const CreateProposal = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiration, setExpiration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { adminCapId } = useAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !expiration || !adminCapId) {
      toast.error("All fields are required");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate the expiration timestamp (in milliseconds)
      const expirationDate = new Date(expiration);
      const expirationMs = expirationDate.getTime();
      
      // Create a new proposal transaction
      const tx = new Transaction();
      const proposalId = tx.moveCall({
        target: `${packageId}::proposal::create`,
        arguments: [
          tx.object(adminCapId),
          tx.pure.string(title),
          tx.pure.string(description),
          tx.pure.u64(expirationMs)
        ],
      });
      
      // Register the proposal in the dashboard
      tx.moveCall({
        target: `${packageId}::dashboard::register_proposal`,
        arguments: [
          tx.object(dashboardId),
          tx.object(adminCapId),
          proposalId
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: () => {
          toast.success("Proposal created successfully!");
          setTitle("");
          setDescription("");
          setExpiration("");
          setIsLoading(false);
        },
        onError: (error) => {
          toast.error(`Error creating proposal: ${error.message}`);
          setIsLoading(false);
        }
      });
    } catch (error) {
      toast.error(`Error: ${error}`);
      setIsLoading(false);
    }
  };
  
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Create New Proposal</h2>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-sm">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proposal Title
          </label>
          <input
            type="text"
            id="title"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Enter a clear, concise title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-32"
            placeholder="Describe the proposal in detail"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isLoading}
          ></textarea>
        </div>
        
        <div className="mb-6">
          <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expiration Date
          </label>
          <input
            type="date"
            id="expiration"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            min={getMinDate()}
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            required
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The proposal will be active until this date.
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? "Creating..." : "Create Proposal"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProposal; 