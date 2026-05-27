import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { FileText, Plus, BarChart3, Zap } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="border-b bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold text-indigo-600">Cladding Quote</div>
            <a href={getLoginUrl()}>
              <Button>Sign In</Button>
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Professional Cladding Quotes Made Easy</h1>
            <p className="text-xl text-gray-600 mb-8">
              Create accurate job quotes in minutes. Track client details, dimensions, and costs all in one place.
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="text-lg">
                Get Started
              </Button>
            </a>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <Card>
              <CardHeader>
                <Plus className="w-8 h-8 text-indigo-600 mb-2" />
                <CardTitle>Quick Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Create professional quotes in minutes with our intuitive form
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="w-8 h-8 text-indigo-600 mb-2" />
                <CardTitle>PDF Export</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Generate downloadable PDF quotes to send to clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-indigo-600 mb-2" />
                <CardTitle>Track Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Monitor job status from quoted to completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-indigo-600 mb-2" />
                <CardTitle>Real-time Estimates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get instant cost calculations based on dimensions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-indigo-600">Cladding Quote</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Quote Card */}
          <Link href="/quote">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <Plus className="w-12 h-12 text-indigo-600 mb-4" />
                <CardTitle>Create New Quote</CardTitle>
                <CardDescription>Start a new job quote</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Enter client details, wall dimensions, and get an instant cost estimate.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* View Jobs Card */}
          <Link href="/jobs">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle>View All Jobs</CardTitle>
                <CardDescription>Manage your quotes and track status</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  See all your quotes, update status, and generate PDFs for clients.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <FileText className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Your dashboard overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                View your quote statistics and job progress at a glance.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ol className="space-y-4 text-gray-700">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </span>
              <span>Click "Create New Quote" to start a new job</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <span>Enter client details (name, email, phone, address)</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </span>
              <span>Add cladding items with wall dimensions</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </span>
              <span>Review the automatic cost estimate</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </span>
              <span>Create the quote and manage it from your jobs dashboard</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
