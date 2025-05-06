import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getNetwork, setNetwork } from "../utils/networkUtils";
import { motion, AnimatePresence } from "framer-motion";

interface MainnetNoticeProps {
  showOnRoutes?: string[];
}

const MainnetNotice = ({ showOnRoutes = ["/proposal", "/ballots", "/ballot"] }: MainnetNoticeProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    // Check if the current network is mainnet
    const currentNetwork = getNetwork();
    const currentPath = window.location.pathname;
    
    // Check if we should show this notice based on current route
    const shouldShowOnCurrentRoute = showOnRoutes.some(route => currentPath.startsWith(route));
    
    // Only show if on mainnet and on relevant routes
    setIsVisible(currentNetwork === 'mainnet' && shouldShowOnCurrentRoute && !isDismissed);
  }, [isDismissed, showOnRoutes]);
  
  const handleSwitchToTestnet = () => {
    setNetwork('testnet');
    window.location.reload();
  };
  
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-24 inset-x-0 z-40 flex justify-center px-4"
      >
        <div className="bg-gradient-to-r from-amber-600/90 to-amber-700/90 text-white px-6 py-4 rounded-lg shadow-xl max-w-2xl w-full backdrop-blur-sm border border-amber-500/30">
          <div className="flex items-start gap-3">
            <InfoIcon className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">Mainnet Coming Soon</h3>
              <p className="mt-1">
                Our mainnet features are currently in development. Proposal and voting features will be 
                available on mainnet soon. For now, please switch to testnet or devnet to explore all features.
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <button 
                  onClick={handleSwitchToTestnet}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white font-medium transition-colors"
                >
                  Switch to Testnet
                </button>
                <button 
                  onClick={() => setIsDismissed(true)}
                  className="text-white/80 hover:text-white underline transition-colors"
                >
                  Continue on Mainnet
                </button>
              </div>
            </div>
            <button 
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white p-1 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MainnetNotice; 