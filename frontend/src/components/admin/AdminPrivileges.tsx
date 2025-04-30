import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '../../config/networkConfig';
import { useAdminCap } from '../../hooks/useAdminCap';
import { toast } from 'react-toastify';
import { motion } from "framer-motion";
import AdminList from './AdminList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "../../components/ui/card";
import {
  Shield,
  KeyRound,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
//import { Separator } from "../../components/ui/separator";
//import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Badge } from "../../components/ui/badge";

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
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.2 }}
      className="space-y-8"
    >
      {/* Form to grant admin privileges */}
      <motion.div variants={fadeIn} transition={{ duration: 0.3 }}>
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
                  Grant Admin Privileges
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                  Delegate administrative permissions to other addresses
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 mt-2 self-start">
              <Shield className="h-3 w-3 mr-1" />
              Admin Action
            </Badge>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>
                  Granting admin privileges gives full control over the system. This includes creating proposals, 
                  managing proposal statuses, and granting admin access to others. Only grant admin privileges to trusted addresses.
                </span>
              </p>
            </div>
            
            <form onSubmit={handleGrantAdmin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="adminAddress" className="text-gray-700 dark:text-gray-300">
                  New Admin Address
                </Label>
                <div className="relative">
                  <Input
                    id="adminAddress"
                    type="text"
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    placeholder="0x..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <UserPlus className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the complete 0x address of the user you want to grant admin privileges to
                </p>
              </div>
              
              <div className="pt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          type="submit"
                          disabled={isLoading || !adminCapId}
                          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              Grant Admin Privileges
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!adminCapId && (
                      <TooltipContent>
                        <p className="text-xs">You need admin privileges to perform this action</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </form>
          </CardContent>
          
          {!adminCapId && (
            <CardFooter className="bg-red-50 dark:bg-red-900/20 py-3 px-6 border-t border-red-100 dark:border-red-900/30">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <Lock className="h-4 w-4 mr-2" />
                <p className="text-sm font-medium">You don't have admin privileges to perform this action</p>
              </div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
      
      {/* List of current admins */}
      <motion.div variants={fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
        <AdminList />
      </motion.div>
    </motion.div>
  );
};

export default AdminPrivileges;
