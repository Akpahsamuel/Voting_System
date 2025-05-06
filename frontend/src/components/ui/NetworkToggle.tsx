import { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "../../lib/utils";
import { getNetwork, setNetwork } from "../../utils/networkUtils";

type Network = 'testnet' | 'devnet' | 'mainnet';

interface NetworkToggleProps {
  className?: string;
  compact?: boolean;
}

const NetworkToggle = ({ className, compact = false }: NetworkToggleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(getNetwork());
  const [hoveredNetwork, setHoveredNetwork] = useState<Network | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Network configuration with colors and labels
  const networks: Record<Network, { color: string, bg: string, label: string, shortLabel: string, warning?: string }> = {
    mainnet: { 
      color: 'bg-green-500 ring-1 ring-green-300', 
      bg: 'from-green-600/40 to-green-800/30',
      label: 'Mainnet',
      shortLabel: 'Main',
      warning: 'Limited functionality - coming soon'
    },
    testnet: { 
      color: 'bg-blue-500 ring-1 ring-blue-300', 
      bg: 'from-blue-600/40 to-blue-800/30',
      label: 'Testnet',
      shortLabel: 'Test'
    },
    devnet: { 
      color: 'bg-purple-500 ring-1 ring-purple-300', 
      bg: 'from-purple-600/40 to-purple-800/30',
      label: 'Devnet',
      shortLabel: 'Dev'
    },
  };

  const handleNetworkChange = (network: Network) => {
    if (network === selectedNetwork) {
      setIsOpen(false);
      return;
    }
    
    setSelectedNetwork(network);
    setIsOpen(false);
    setIsChanging(true);
    
    // Save network using the utility function
    setNetwork(network);
    
    // Add a small delay to show the loading state
    setTimeout(() => {
      // Reload the page to apply the network change
      window.location.reload();
    }, 500);
  };

  // Handle toggle button click
  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    if (!isChanging) {
      setIsOpen(!isOpen);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      className={cn("relative", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        onClick={handleToggleClick}
        disabled={isChanging}
        className={cn(
          "flex items-center gap-2 rounded-md transition-all duration-300",
          "border border-white/20 bg-gradient-to-r shadow-md",
          compact ? "px-2 py-1.5" : "px-4 py-2", 
          isChanging ? "opacity-80" : "hover:opacity-90 hover:shadow-lg",
          `${networks[selectedNetwork].bg}`
        )}
      >
        {isChanging ? (
          <Loader2 size={compact ? 14 : 18} className="text-white animate-spin" />
        ) : (
          <Globe size={compact ? 14 : 18} className="text-white" />
        )}
        <div className="flex items-center">
          <span className={`${networks[selectedNetwork].color} ${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full mr-1.5`}></span>
          <span className={`${compact ? 'text-sm' : 'text-base'} font-medium text-white`}>
            {compact ? networks[selectedNetwork].shortLabel : networks[selectedNetwork].label}
          </span>
        </div>
        {!isChanging && (
          <ChevronDown 
            size={compact ? 12 : 16}
            className={`transition-transform duration-300 text-white ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !isChanging && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1.5 w-52 rounded-md shadow-lg bg-black/95 backdrop-blur-md border border-white/20 z-50 overflow-hidden"
          >
            <div className="py-1">
              {Object.entries(networks).map(([network, { color, label, bg, warning }]) => (
                <div key={network}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNetworkChange(network as Network);
                    }}
                    onMouseEnter={() => setHoveredNetwork(network as Network)}
                    onMouseLeave={() => setHoveredNetwork(null)}
                    className={cn(
                      "flex items-center w-full px-4 py-3 text-base text-left transition-colors duration-200",
                      selectedNetwork === network 
                        ? `bg-gradient-to-r ${bg} text-white font-medium` 
                        : "hover:bg-white/15 text-white/90 hover:text-white"
                    )}
                  >
                    <span className={`${color} w-3 h-3 rounded-full mr-2.5`}></span>
                    <span>{label}</span>
                    {warning && (
                      <AlertCircle size={14} className="ml-auto text-amber-400" />
                    )}
                  </button>
                  
                  {/* Warning message for mainnet */}
                  {warning && network === hoveredNetwork && (
                    <div className="px-4 py-2 text-xs text-amber-300 bg-amber-950/50 border-t border-b border-amber-800/30">
                      {warning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkToggle; 