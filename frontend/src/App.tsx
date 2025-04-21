import React from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalView from "./views/ProposalView";
import WalletView from "./views/WalletView";
import AdminDashboard from "./views/AdminDashboard";
import StatisticsView from "./views/StatisticsView";


const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/proposal" element={<ProposalView />} />
            <Route path="/wallet" element={<WalletView />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/statistics" element={<StatisticsView  />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
