import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, ClipboardList, Ruler, Save } from "lucide-react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import QuoteForm from "./pages/QuoteForm";
import AdminProducts from "./pages/AdminProducts";
import Admin from "./pages/Admin";

const workflowSteps = [
  {
    title: "1. Client details",
    description: "Enter customer, contact, address, suburb, appointment, and reference image first.",
    icon: ClipboardList,
  },
  {
    title: "2. Walls and products",
    description: "Add every wall with dimensions, obstruction status, and products attached under the correct wall.",
    icon: Ruler,
  },
  {
    title: "3. Review and save",
    description: "Check dimensions, products, manual review flags, and the single supply-and-install total before saving.",
    icon: Save,
  },
];

function QuoteWorkflow() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
        <Card className="mb-6 border-blue-200 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Team QUO workflow</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Build the quote in order</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Use this order: client details, wall dimensions and products, then review and save. Keep export and notes work after this flow is stable.
              </p>
            </div>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:max-w-xs">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Do not rely on a quote until every wall has dimensions and products are listed under the correct wall.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {workflowSteps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-700" />
                    <h2 className="font-semibold text-gray-900">{step.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{step.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
            <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /><span>Save draft only after client details are entered.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /><span>Add wall dimensions before adding products.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /><span>Review manual flags before using the total.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /><span>Material list and customer notes come after the workflow is stable.</span></div>
          </div>
        </Card>
      </div>
      <QuoteForm />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/quote" component={QuoteWorkflow} />
      <Route path="/stage1" component={QuoteWorkflow} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
