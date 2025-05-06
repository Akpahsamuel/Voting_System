import { FC, ReactNode } from 'react';
import { isFeatureAvailable, getFeatureUnavailableMessage, setNetwork, getNetwork } from '../utils/networkUtils';
import { AlertTriangle } from 'lucide-react';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders its children based on whether a feature is enabled.
 * Checks if the feature is available on the current network.
 */
const FeatureGuard: FC<FeatureGuardProps> = ({ feature, children, fallback }) => {
  const isAvailable = isFeatureAvailable(feature);
  const currentNetwork = getNetwork();
  
  const handleSwitchToTestnet = () => {
    setNetwork('testnet');
    window.location.reload();
  };
  
  if (!isAvailable) {
    // If a custom fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default fallback UI
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full bg-amber-950/30 border border-amber-800/30 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-amber-400 mb-3">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">Feature Not Available</h2>
          </div>
          
          <p className="text-white/90 mb-6">
            {getFeatureUnavailableMessage(feature)}
          </p>
          
          {currentNetwork === 'mainnet' && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSwitchToTestnet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Switch to Testnet
              </button>
              
              <a 
                href="/"
                className="px-4 py-2 bg-black/30 hover:bg-black/40 text-white/90 hover:text-white rounded-md transition-colors"
              >
                Return to Home
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGuard; 