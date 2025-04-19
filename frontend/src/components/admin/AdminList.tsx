import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import { shortenAddress } from "../../utils/addressUtils";
import { getAddressUrl, openInExplorer } from "../../utils/explorerUtils";

const AdminList = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch dashboard data to get admin addresses
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  useEffect(() => {
    if (!dashboardData?.data) return;
    
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return;
    
    const fields = dashboardObj.content.fields as any;
    const admins = fields?.admin_addresses?.fields?.contents || [];
    
    setAdminAddresses(admins);
    setIsLoading(false);
  }, [dashboardData]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Admin Addresses</h3>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The following addresses have admin privileges in this system:
          </p>
          
          {adminAddresses.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No admin addresses found</p>
          ) : (
            <div className="space-y-2">
              {adminAddresses.map((address, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="font-mono text-sm break-all">
                    {address}
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-xs text-gray-500">
                      {shortenAddress(address)}
                    </span>
                    <button
                      onClick={() => openInExplorer(getAddressUrl(address))}
                      className="text-xs text-white dark:text-white hover:underline bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded"
                    >
                      View on Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminList;