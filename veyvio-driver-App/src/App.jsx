import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DriverApp from "@/pages/driver/DriverApp";

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/*" element={<DriverApp />} />
        </Routes>
        <Toaster />
        <HotToaster position="top-center" toastOptions={{ duration: 5000 }} />
      </Router>
    </QueryClientProvider>
  );
}
