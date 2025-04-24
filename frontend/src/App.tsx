import React from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  RouterProvider, 
  createBrowserRouter,
  Navigate
} from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalView from "./views/ProposalView";
import WalletView from "./views/WalletView";
import AdminDashboard from "./views/AdminDashboard";
import StatisticsView from "./views/StatisticsView";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminDebug from "./pages/AdminDebug";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
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
        <RouterProvider router={router} />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
