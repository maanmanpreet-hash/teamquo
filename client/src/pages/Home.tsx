import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Plus, BarChart3, Settings, LogOut } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-primary">Cladding Quote</h1>
            <CardDescription>Professional job quoting made simple</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Create accurate job quotes in minutes. Track client details, dimensions, and costs all in one place.
            </p>
            <Button asChild className="w-full h-12 text-base" size="lg">
              <a href={getLoginUrl()}>Sign In to Get Started</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Cladding Quote</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Create Quote */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/quote")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Quick Quote</CardTitle>
                <Plus className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a new job quote with client details and dimensions
              </p>
            </CardContent>
          </Card>

          {/* View Jobs */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/jobs")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Track Jobs</CardTitle>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View all quotes, bookings, and job status at a glance
              </p>
            </CardContent>
          </Card>

          {/* Manage Products */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/admin/products")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Products</CardTitle>
                <Settings className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage cladding variants, pricing, and product options
              </p>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Settings</CardTitle>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload logo and configure business settings (coming soon)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-5 w-5 text-green-600 font-bold">✓</div>
                <div>
                  <p className="font-semibold text-sm">Real-time Estimates</p>
                  <p className="text-sm text-muted-foreground">Instant cost calculations based on dimensions</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-5 w-5 text-green-600 font-bold">✓</div>
                <div>
                  <p className="font-semibold text-sm">Volume Discounts</p>
                  <p className="text-sm text-muted-foreground">Automatic discount tiers for bulk orders</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-5 w-5 text-green-600 font-bold">✓</div>
                <div>
                  <p className="font-semibold text-sm">PDF Quotes</p>
                  <p className="text-sm text-muted-foreground">Download professional quotes for clients</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-5 w-5 text-green-600 font-bold">✓</div>
                <div>
                  <p className="font-semibold text-sm">Job Tracking</p>
                  <p className="text-sm text-muted-foreground">Monitor status from quoted to completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">Cladding</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">2 variants</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">Acoustic Panels</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">7 colors</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">UV Panel (Marble)</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">1 variant</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">Mirrors</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">4 designs</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">Fireplace</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">3 sizes</span>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => setLocation("/admin/products")}>
                Manage Products
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to create your first quote</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-semibold">Click "Quick Quote"</p>
                  <p className="text-sm text-muted-foreground">Start creating a new job quote</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-semibold">Enter Client Details</p>
                  <p className="text-sm text-muted-foreground">Name, email, phone, and address</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="font-semibold">Select Products & Dimensions</p>
                  <p className="text-sm text-muted-foreground">Choose products and enter wall/cabinet dimensions</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  4
                </div>
                <div>
                  <p className="font-semibold">Review & Download</p>
                  <p className="text-sm text-muted-foreground">Check the estimate and download PDF to send to client</p>
                </div>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={() => setLocation("/quote")}>
              Create Your First Quote
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
