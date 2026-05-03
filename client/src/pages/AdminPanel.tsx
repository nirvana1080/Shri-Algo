import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, TrendingUp, Activity, Zap } from "lucide-react";
import { useLocation } from "wouter";

const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
};

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = trpc.admin.getPlatformStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: users } = trpc.admin.getAllUsers.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Access Denied: Admin privileges required</p>
        </div>
      </DashboardLayout>
    );
  }

  const mockChartData = [
    { month: "Jan", users: 120, strategies: 240, trades: 1200 },
    { month: "Feb", users: 150, strategies: 290, trades: 1500 },
    { month: "Mar", users: 180, strategies: 340, trades: 1800 },
    { month: "Apr", users: 220, strategies: 400, trades: 2100 },
    { month: "May", users: 280, strategies: 480, trades: 2400 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and statistics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {stats?.totalStrategies || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {stats?.totalTrades || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                (stats?.totalPnl || 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                <TrendingUp className="w-5 h-5" />
                ₹{(stats?.totalPnl || 0).toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="growth" className="w-full">
          <TabsList>
            <TabsTrigger value="growth">Growth Trend</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="growth">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Platform Growth</CardTitle>
                <CardDescription>Monthly user, strategy, and trade growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
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
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="strategies" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="trades" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Free vs Paid user breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { plan: "Free", users: 450, percentage: 75 },
                    { plan: "Paid", users: 150, percentage: 25 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="plan" stroke="#9ca3af" />
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
                    <Bar dataKey="users" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Users List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registered users on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Plan</th>
                      <th className="text-left py-3 px-4 font-medium">Strategies</th>
                      <th className="text-left py-3 px-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                        <td className="py-3 px-4 font-medium">{user.name}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.plan === "paid" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">{user.strategyCount || 0}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No users yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
