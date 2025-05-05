import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  RouterProvider, 
  createBrowserRouter
} from "react-router-dom";
import { useEffect } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalView from "./views/ProposalView";
import WalletView from "./views/WalletView";
import AdminDashboard from "./views/AdminDashboard";
import StatisticsView from "./views/StatisticsView";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminDebug from "./pages/AdminDebug";
import BallotPage from "./pages/BallotPage";
import BallotsPage from "./pages/BallotsPage";
import CreateBallotPage from "./pages/create-ballot";
import ManageBallotPage from "./pages/ManageBallotPage";
import BallotDetailPage from "./pages/ballot";

const queryClient = new QueryClient();

// This component resets transaction state after completion
const TransactionStateResetter = ({ children }: { children: React.ReactNode }) => {
  const { isSuccess, isError, reset } = useSignAndExecuteTransaction();
  
  useEffect(() => {
    if (isSuccess || isError) {
      // Add a delay before resetting the transaction state
      const timeoutId = setTimeout(() => {
        reset();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isSuccess, isError, reset]);
  
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  // Simplified ballot routes
  {
    path: "/ballots",
    element: <BallotPage />,  // This becomes the main ballot dashboard page
  },
  {
    path: "/ballot/:ballotId", // Route for viewing and voting on individual ballots
    element: <BallotDetailPage />,
  },
  {
    path: "/ballots/view/:ballotId",
    element: <BallotsPage />,  // For viewing individual ballots
  },
  {
    path: "/ballots/create",
    element: <CreateBallotPage />,
  },
  {
    path: "/ballots/manage/:ballotId",
    element: <ManageBallotPage />,
  },
  {
    path: "/proposal",
    element: <ProposalView />,
  },
  {
    path: "/wallet",
    element: <WalletView />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin-debug",
    element: <AdminDebug />,
  },
  {
    path: "/statistics",
    element: <StatisticsView />,
  },

  // Explicit route for manual navigation to 404
  {
    path: "/404-not-found",
    element: <NotFound />,
  },
  // Catch-all route for any unmatched paths
  {
    path: "*",
    element: <NotFound />,
  }
]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TransactionStateResetter>
          <RouterProvider router={router} />
          <Toaster />
          <Sonner />
        </TransactionStateResetter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
