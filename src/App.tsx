import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Guide from "./pages/Guide";
import NotFound from "./pages/NotFound";
import Pipeline from "./pages/Pipeline";
import Team from "./pages/Team";
import CaseDetails from "./pages/CaseDetails";
import Profile from "./pages/Profile";
import Chatbot from "./pages/Chatbot";
import Commissioners from "./pages/Commissioners";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Pipeline />} />
          <Route path="/case/:id" element={<CaseDetails />} />
          <Route path="/new-case" element={<Index />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/commissioners" element={<Commissioners />} />
          <Route path="/team" element={<Team />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/guide" element={<Guide />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
