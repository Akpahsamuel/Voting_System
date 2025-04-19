import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '../../config/networkConfig';
import { useAdminCap } from '../../hooks/useAdminCap';
import { toast } from 'react-toastify';
import AdminList from './AdminList';

const AdminPrivileges = () => {
  const [newAdminAddress, setNewAdminAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { adminCapId } = useAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Need to refetch admin list after granting new admin privileges
  const { refetch: refetchDashboard } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminCapId) {
      toast.error('Admin capability not found');
      return;
    }
    
    if (!newAdminAddress || !newAdminAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::dashboard::grant_admin`,
        arguments: [
          tx.object(adminCapId),
          tx.object(dashboardId),
          tx.pure.address(newAdminAddress)
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: async () => {
          toast.success(`Admin privileges granted to ${newAdminAddress}`);
          setNewAdminAddress('');
          setIsLoading(false);
          await refetchDashboard();
        },
        onError: (error) => {
          toast.error(`Error granting admin privileges: ${error.message}`);
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Form to grant admin privileges */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Grant Admin Privileges</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Grant admin privileges to another address. This address will be able to create proposals,
          manage proposal statuses, and grant admin privileges to other addresses.
        </p>
        
        <form onSubmit={handleGrantAdmin}>
          <div className="mb-4">
            <label 
              htmlFor="adminAddress" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Admin Address
            </label>
            <input
              id="adminAddress"
              type="text"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              placeholder="0x..."
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !adminCapId}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Grant Admin Privileges"}
          </button>
          
          {!adminCapId && (
            <p className="mt-2 text-sm text-red-500">
              You don't have admin privileges to perform this action.
            </p>
          )}
        </form>
      </div>
      
      {/* List of current admins */}
      <AdminList />
    </div>
  );
};

export default AdminPrivileges;