import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: portfolio, isLoading: portfolioLoading } = trpc.dashboard.getPortfolioOverview.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: plan, isLoading: planLoading } = trpc.subscription.getMyPlan.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: strategies } = trpc.strategy.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const mockChartData = [
    { date: "Mon", pnl: 2400, trades: 4 },
    { date: "Tue", pnl: 1398, trades: 3 },
    { date: "Wed", pnl: 9800, trades: 2 },
    { date: "Thu", pnl: 3908, trades: 2 },
    { date: "Fri", pnl: 4800, trades: 3 },
    { date: "Sat", pnl: 3800, trades: 2 },
    { date: "Sun", pnl: 4300, trades: 1 },
  ];

  const pieData = [
    { name: "Active", value: plan?.activeStrategiesCount || 0, fill: "#3b82f6" },
    { name: "Available", value: (plan?.maxActiveStrategies || 2) - (plan?.activeStrategiesCount || 0), fill: "#e5e7eb" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name || "Trader"}</p>
          </div>
          <Button onClick={() => navigate("/strategy-builder")} className="bg-blue-600 hover:bg-blue-700">
            <Zap className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Capital */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{(portfolio?.totalCapital || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Starting capital</p>
            </CardContent>
          </Card>

          {/* Total P&L */}
          <Card className={`border-0 shadow-sm bg-gradient-to-br ${
            (portfolio?.totalPnl || 0) >= 0
              ? "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
              : "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                (portfolio?.totalPnl || 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                ₹{Math.abs(portfolio?.totalPnl || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                {(portfolio?.totalPnl || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {portfolio?.pnlPercent?.toFixed(2)}% return
              </p>
            </CardContent>
          </Card>

          {/* Active Strategies */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {plan?.activeStrategiesCount || 0} / {plan?.maxActiveStrategies || 2}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {plan?.canCreateStrategy ? "Create new strategy" : "Limit reached"}
              </p>
            </CardContent>
          </Card>

          {/* Open Positions */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {portfolio?.openPositionsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* P&L Chart */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>P&L Trend</CardTitle>
              <CardDescription>Weekly performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#f3f4f6" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Strategy Allocation */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Strategy Slots</CardTitle>
              <CardDescription>Plan usage</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Strategies List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Your Strategies</CardTitle>
            <CardDescription>Manage and monitor your trading strategies</CardDescription>
          </CardHeader>
          <CardContent>
            {strategies && strategies.length > 0 ? (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition"
                    onClick={() => navigate(`/strategy/${strategy.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-foreground">{strategy.name}</p>
                        <p className="text-xs text-muted-foreground">{strategy.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        strategy.status === "active" ? "text-green-600" : "text-gray-600"
                      }`}>
                        {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        P&L: ₹{parseFloat(strategy.realizedPnl.toString()).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No strategies yet. Create your first strategy to get started!</p>
                <Button onClick={() => navigate("/strategy-builder")} variant="outline">
                  Create Strategy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
