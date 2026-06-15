import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { QuotePageDraftSafety } from "./components/QuotePageDraftSafety";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PdfPreview from "./pages/PdfPreview";
import QuoteForm from "./pages/QuoteForm";
import AdminProducts from "./pages/AdminProducts";
import Admin from "./pages/Admin";
import Setout from "./pages/Setout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/print-preview/:token" component={PdfPreview} />
      <Route path="/quote/:jobId" component={QuoteForm} />
      <Route path="/setout/:jobId" component={Setout} />
      <Route path="/quote" component={QuoteForm} />
      <Route path="/stage1" component={QuoteForm} />
      <Route path="/jobs" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <QuotePageDraftSafety />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
