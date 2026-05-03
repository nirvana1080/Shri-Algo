import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, TrendingUp, Shield, Zap, BarChart3, Lock } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
};

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold">Shri Algo</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            ) : (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
            Master Algorithmic Trading
          </h1>
          <p className="text-xl text-slate-300">
            Practice trading strategies in a risk-free environment. Build, test, and refine your algorithms before deploying real capital.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <a href={getLoginUrl()}>Get Started Free</a>
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 hover:bg-slate-800">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: TrendingUp,
              title: "Strategy Builder",
              description: "Create trading strategies with an intuitive, beginner-friendly interface. No coding required.",
            },
            {
              icon: BarChart3,
              title: "Real-time P&L Tracking",
              description: "Monitor your portfolio performance with live candlestick charts and detailed analytics.",
            },
            {
              icon: Shield,
              title: "Advanced Risk Management",
              description: "Set stop-loss, targets, trailing stops, and portfolio-level risk limits automatically.",
            },
            {
              icon: Zap,
              title: "Paper Trading Engine",
              description: "Simulate real market conditions with realistic price movements and order execution.",
            },
            {
              icon: Lock,
              title: "Secure & Private",
              description: "Your strategies and trading data are encrypted and stored securely.",
            },
            {
              icon: BarChart3,
              title: "Detailed Execution Logs",
              description: "Review every decision the engine made with comprehensive audit trails.",
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/80 transition">
                <CardHeader>
                  <Icon className="w-8 h-8 text-blue-400 mb-3" />
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free Plan */}
          <Card className="border-slate-700 bg-slate-800/50 relative">
            <CardHeader>
              <CardTitle className="text-white">Free Plan</CardTitle>
              <CardDescription>Perfect for beginners</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">₹0</span>
                <span className="text-slate-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {[
                  "Up to 2 active strategies",
                  "Unlimited paper trading",
                  "Real-time P&L tracking",
                  "Basic risk management",
                  "Order and trade logs",
                  "Community support",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full mt-6 bg-slate-700 hover:bg-slate-600">
                <a href={getLoginUrl()}>Start Free</a>
              </Button>
            </CardContent>
          </Card>

          {/* Paid Plan */}
          <Card className="border-blue-500 bg-gradient-to-br from-blue-900/50 to-slate-800/50 relative ring-1 ring-blue-500/50">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-white">Pro Plan</CardTitle>
              <CardDescription>For serious traders</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">₹499</span>
                <span className="text-slate-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {[
                  "Unlimited active strategies",
                  "Advanced analytics & insights",
                  "Priority execution",
                  "Advanced risk management",
                  "API access",
                  "Email & chat support",
                  "Custom strategy templates",
                  "Performance reports",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                <a href={getLoginUrl()}>Upgrade to Pro</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Master Trading?</h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Join thousands of traders practicing their strategies risk-free. Start with our free plan today.
          </p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
            <a href={getLoginUrl()}>Get Started Now</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Disclaimer</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">Discord</a></li>
                <li><a href="#" className="hover:text-white">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 Shri Algo. All rights reserved. Paper trading for educational purposes only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
