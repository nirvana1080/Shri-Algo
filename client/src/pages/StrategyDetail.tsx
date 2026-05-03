import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Play, Square } from "lucide-react";

const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
};

const useParams = () => {
  const [location] = useLocation();
  const match = location.match(/\/strategy\/(\d+)/);
  return { strategyId: match ? parseInt(match[1]) : null };
};

export default function StrategyDetail() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { strategyId } = useParams();

  const { data: strategy, isLoading: strategyLoading } = trpc.strategy.get.useQuery(
    { strategyId: strategyId || 0 },
    { enabled: isAuthenticated && !!strategyId }
  );

  const { data: orders } = trpc.orders.getStrategyOrders.useQuery(
    { strategyId: strategyId || 0 },
    { enabled: isAuthenticated && !!strategyId }
  );

  const { data: positions } = trpc.positions.getOpenPositions.useQuery(
    { strategyId: strategyId || 0 },
    { enabled: isAuthenticated && !!strategyId }
  );

  const { data: trades } = trpc.trades.getStrategyTrades.useQuery(
    { strategyId: strategyId || 0 },
    { enabled: isAuthenticated && !!strategyId }
  );

  const activateMutation = trpc.strategy.activate.useMutation();
  const stopMutation = trpc.strategy.stop.useMutation();

  if (!isAuthenticated || !strategyId) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (strategyLoading) {
    return <DashboardLayout><div className="text-center py-20">Loading strategy...</div></DashboardLayout>;
  }

  if (!strategy) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Strategy not found</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync({ strategyId });
      window.location.reload();
    } catch (error) {
      alert("Failed to activate strategy: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleStop = async () => {
    try {
      await stopMutation.mutateAsync({ strategyId });
      window.location.reload();
    } catch (error) {
      alert("Failed to stop strategy: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{strategy.name}</h1>
              <p className="text-muted-foreground mt-1">{strategy.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {strategy.status === "active" ? (
              <Button onClick={handleStop} variant="destructive" disabled={stopMutation.isPending}>
                <Square className="w-4 h-4 mr-2" />
                Stop Strategy
              </Button>
            ) : (
              <Button onClick={handleActivate} className="bg-green-600 hover:bg-green-700" disabled={activateMutation.isPending}>
                <Play className="w-4 h-4 mr-2" />
                Activate Strategy
              </Button>
            )}
          </div>
        </div>

        {/* Strategy Info */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${
                strategy.status === "active" ? "text-green-600" : "text-gray-600"
              }`}>
                {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Initial Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-foreground">
                ₹{parseFloat(strategy.initialCapital.toString()).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Realized P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${
                parseFloat(strategy.realizedPnl.toString()) >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                ₹{parseFloat(strategy.realizedPnl.toString()).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${
                parseFloat(strategy.unrealizedPnl.toString()) >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                ₹{parseFloat(strategy.unrealizedPnl.toString()).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
            <TabsTrigger value="positions">Open Positions ({positions?.length || 0})</TabsTrigger>
            <TabsTrigger value="trades">Trades ({trades?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>All orders placed by this strategy</CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">Instrument</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Action</th>
                          <th className="text-left py-3 px-4 font-medium">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium">Price</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order: any) => (
                          <tr key={order.id} className="border-b border-border hover:bg-accent/50">
                            <td className="py-3 px-4">{order.instrument}</td>
                            <td className="py-3 px-4">{order.orderType}</td>
                            <td className="py-3 px-4">
                              <span className={order.action === "BUY" ? "text-green-600" : "text-red-600"}>
                                {order.action}
                              </span>
                            </td>
                            <td className="py-3 px-4">{order.quantity}</td>
                            <td className="py-3 px-4">₹{parseFloat(order.price.toString()).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                order.status === "executed" ? "bg-green-100 text-green-800" :
                                order.status === "cancelled" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Currently open trades</CardDescription>
              </CardHeader>
              <CardContent>
                {positions && positions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">Instrument</th>
                          <th className="text-left py-3 px-4 font-medium">Action</th>
                          <th className="text-left py-3 px-4 font-medium">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium">Entry Price</th>
                          <th className="text-left py-3 px-4 font-medium">Current Price</th>
                          <th className="text-left py-3 px-4 font-medium">P&L</th>
                          <th className="text-left py-3 px-4 font-medium">SL / Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((position: any) => {
                          const pnl = (parseFloat(position.currentPrice.toString()) - parseFloat(position.entryPrice.toString())) * position.quantity;
                          return (
                            <tr key={position.id} className="border-b border-border hover:bg-accent/50">
                              <td className="py-3 px-4">{position.instrument}</td>
                              <td className="py-3 px-4">
                                <span className={position.action === "BUY" ? "text-green-600" : "text-red-600"}>
                                  {position.action}
                                </span>
                              </td>
                              <td className="py-3 px-4">{position.quantity}</td>
                              <td className="py-3 px-4">₹{parseFloat(position.entryPrice.toString()).toFixed(2)}</td>
                              <td className="py-3 px-4">₹{parseFloat(position.currentPrice.toString()).toFixed(2)}</td>
                              <td className={`py-3 px-4 font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                ₹{pnl.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-xs">
                                {position.stoploss && `SL: ₹${parseFloat(position.stoploss.toString()).toFixed(2)}`}
                                {position.target && ` / T: ₹${parseFloat(position.target.toString()).toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No open positions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>Completed trades with P&L</CardDescription>
              </CardHeader>
              <CardContent>
                {trades && trades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">Instrument</th>
                          <th className="text-left py-3 px-4 font-medium">Entry</th>
                          <th className="text-left py-3 px-4 font-medium">Exit</th>
                          <th className="text-left py-3 px-4 font-medium">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium">Entry Price</th>
                          <th className="text-left py-3 px-4 font-medium">Exit Price</th>
                          <th className="text-left py-3 px-4 font-medium">P&L</th>
                          <th className="text-left py-3 px-4 font-medium">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade: any) => {
                          const pnl = (parseFloat(trade.exitPrice.toString()) - parseFloat(trade.entryPrice.toString())) * trade.quantity;
                          const duration = new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime();
                          const durationMinutes = Math.floor(duration / 60000);
                          return (
                            <tr key={trade.id} className="border-b border-border hover:bg-accent/50">
                              <td className="py-3 px-4">{trade.instrument}</td>
                              <td className="py-3 px-4">
                                <span className={trade.entryAction === "BUY" ? "text-green-600" : "text-red-600"}>
                                  {trade.entryAction}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={trade.exitAction === "SELL" ? "text-red-600" : "text-green-600"}>
                                  {trade.exitAction}
                                </span>
                              </td>
                              <td className="py-3 px-4">{trade.quantity}</td>
                              <td className="py-3 px-4">₹{parseFloat(trade.entryPrice.toString()).toFixed(2)}</td>
                              <td className="py-3 px-4">₹{parseFloat(trade.exitPrice.toString()).toFixed(2)}</td>
                              <td className={`py-3 px-4 font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                ₹{pnl.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{durationMinutes}m</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No completed trades</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
