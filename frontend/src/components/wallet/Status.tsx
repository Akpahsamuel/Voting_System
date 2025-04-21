import { useCurrentAccount } from "@mysten/dapp-kit";
import { OwnedObjects } from "../OwnedObjects";
import { Copy, Wallet, AlertCircle, Check } from "lucide-react";
import { useState } from "react";

export const WalletStatus = () => {
  const account = useCurrentAccount();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="my-4 rounded-xl shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Wallet Status</h2>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {account ? "Connected" : "Disconnected"}
          </div>
        </div>
      </div>
      <div className="p-5">
        {account ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">Your Address</span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="md:flex md:items-center md:justify-between">
                    <span className="font-mono text-sm break-all text-gray-700 dark:text-gray-300">
                      {window.innerWidth < 640 ? truncateAddress(account.address) : account.address}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="hidden md:inline-flex items-center gap-1 ml-3 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={copyAddress}
                  className="md:hidden rounded-lg p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <OwnedObjects />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              Connect your wallet to view your address and owned objects.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};