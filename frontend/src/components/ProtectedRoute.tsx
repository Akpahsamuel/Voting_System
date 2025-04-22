import { FC, ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminCap } from '../hooks/useAdminCap';
import { Activity } from 'lucide-react';
import Unauthorized from '../pages/Unauthorized';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = "/" 
}) => {
  const { hasAdminCap, isLoading } = useAdminCap();
  const [showLoader, setShowLoader] = useState(true);
  
  // Add a slight delay before showing the loading state to prevent flashes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(isLoading);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  if (showLoader) {
    return (
      <div className="flex h-screen items-center justify-center bg-black bg-grid-pattern">
        <div className="flex flex-col items-center">
          <div className="animate-spin text-blue-500">
            <Activity size={32} />
          </div>
          <p className="mt-4 text-white/80">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // Show unauthorized page if not admin
  if (!hasAdminCap) {
    return <Unauthorized />;
  }
  
  // If admin, render the protected content
  return <>{children}</>;
}; 