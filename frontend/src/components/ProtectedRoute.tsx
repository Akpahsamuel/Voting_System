import { FC, ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminCap } from '../hooks/useAdminCap';
import { useSuperAdminCap } from '../hooks/useSuperAdminCap';
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
  const { hasAdminCap, isLoading: isLoadingAdmin } = useAdminCap();
  const { hasSuperAdminCap, isLoading: isLoadingSuperAdmin } = useSuperAdminCap();
  const [showLoader, setShowLoader] = useState(true);
  
  const isLoading = isLoadingAdmin || isLoadingSuperAdmin;
  
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
  
  // Show unauthorized page if not admin or superadmin
  if (!hasAdminCap && !hasSuperAdminCap) {
    return <Unauthorized />;
  }
  
  // If admin or superadmin, render the protected content
  return <>{children}</>;
}; 