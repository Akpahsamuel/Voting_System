import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariableString } from "../../config/networkConfig";
import { SuiObjectData } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import { shortenAddress } from "../../utils/addressUtils";
import { getAddressUrl, openInExplorer } from "../../utils/explorerUtils";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Shield,
  ExternalLink,
  Copy,
  Users,
  SearchCheck,
  Loader2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";

const AdminList = () => {
  // Use the new helper function to avoid TypeScript errors
  const dashboardId = useNetworkVariableString("dashboardId");
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
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

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
                Admin Control Panel
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                System administrators with privileged access
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Users className="h-3 w-3 mr-1" />
            {adminAddresses.length} {adminAddresses.length === 1 ? 'Admin' : 'Admins'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading admin data...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SearchCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  System administrators with dashboard access
                </p>
              </div>
            </div>
            
            <Separator className="mb-6" />
            
            {adminAddresses.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">No administrators found</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This system currently has no registered admins</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px] pr-4">
                <motion.div 
                  className="space-y-3"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  {adminAddresses.map((address, index) => (
                    <motion.div 
                      key={index}
                      variants={item}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-lg border border-gray-100 dark:border-gray-600 transition-all duration-200"
                    >
                      <div className="font-mono text-sm break-all text-gray-700 dark:text-gray-300 mb-3 sm:mb-0">
                        {address}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end mt-2 sm:mt-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                                onClick={() => copyToClipboard(address)}
                              >
                                {copiedAddress === address ? (
                                  <span className="text-green-500 text-xs">Copied!</span>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                    <span className="text-xs">{shortenAddress(address)}</span>
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Copy address to clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <Button
                          onClick={() => openInExplorer(getAddressUrl(address))}
                          size="sm"
                          className="h-8 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">View on Explorer</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </ScrollArea>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Admin addresses have full control over system configuration and permissions.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminList;
