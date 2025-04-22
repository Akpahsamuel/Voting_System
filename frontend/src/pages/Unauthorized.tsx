import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';

export const Unauthorized: FC = () => {
  return (
    <div className="min-h-screen bg-black bg-grid-pattern flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-red-950/30 backdrop-blur-md border-red-800/30 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-red-300">
            <ShieldAlert className="h-6 w-6" />
            <CardTitle className="text-2xl">Access Denied</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/70">
            You don't have permission to access this page. This area is restricted to administrators only.
          </p>
          
          <div className="rounded-md bg-black/40 p-4 border border-red-900/50">
            <p className="text-sm text-white/60 mb-4">
              If you believe you should have access, please:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/60">
              <li>Make sure your wallet is connected</li>
              <li>Verify you have an admin capability in your wallet</li>
              <li>Contact the system administrator if issues persist</li>
            </ol>
          </div>
          
          <div className="py-2">
            <p className="text-sm text-white/70 mb-2">Connect your wallet:</p>
            <ConnectButton />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" className="border-white/20 text-white/70" asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" className="border-white/20 text-white/70" asChild>
            <Link to={-1 as any}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Unauthorized; 