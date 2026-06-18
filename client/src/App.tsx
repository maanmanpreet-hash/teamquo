import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { QuotePageDraftSafety } from "./components/QuotePageDraftSafety";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PdfPreview = lazy(() => import("./pages/PdfPreview"));
const QuoteForm = lazy(() => import("./pages/QuoteForm"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const Admin = lazy(() => import("./pages/Admin"));
const Setout = lazy(() => import("./pages/Setout"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
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
