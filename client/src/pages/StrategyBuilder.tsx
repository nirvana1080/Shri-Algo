import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
};

export default function StrategyBuilder() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [strategyName, setStrategyName] = useState("");
  const [description, setDescription] = useState("");
  const [initialCapital, setInitialCapital] = useState("10000");
  const [entryType, setEntryType] = useState("signal");
  const [entryValue, setEntryValue] = useState("");
  const [legs, setLegs] = useState([
    { instrument: "NIFTY", type: "CE", action: "BUY", quantity: 50, stoploss: 20, target: 40, trailing_sl: false },
  ]);
  const [mtmStoploss, setMtmStoploss] = useState("1000");
  const [mtmTarget, setMtmTarget] = useState("2000");
  const [reentryEnabled, setReentryEnabled] = useState(false);
  const [maxReentries, setMaxReentries] = useState("2");

  const { data: plan } = trpc.subscription.getMyPlan.useQuery(undefined, { enabled: isAuthenticated });
  const createStrategyMutation = trpc.strategy.create.useMutation();

  const handleAddLeg = () => {
    setLegs([
      ...legs,
      { instrument: "NIFTY", type: "CE", action: "BUY", quantity: 50, stoploss: 20, target: 40, trailing_sl: false },
    ]);
  };

  const handleRemoveLeg = (index: number) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  const handleLegChange = (index: number, field: string, value: any) => {
    const newLegs = [...legs];
    newLegs[index] = { ...newLegs[index], [field]: value };
    setLegs(newLegs);
  };

  const handleCreateStrategy = async () => {
    if (!strategyName || !entryValue || legs.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    const config = {
      strategy_id: `strategy_${Date.now()}`,
      entry: { type: entryType, value: entryValue },
      legs: legs.map((leg) => ({
        instrument: leg.instrument,
        type: leg.type,
        action: leg.action,
        strike: "ATM",
        quantity: leg.quantity,
        stoploss: leg.stoploss,
        target: leg.target,
        trailing_sl: leg.trailing_sl,
      })),
      overall: {
        mtm_stoploss: parseFloat(mtmStoploss),
        mtm_target: parseFloat(mtmTarget),
      },
      reentry: {
        enabled: reentryEnabled,
        max_reentries: parseInt(maxReentries),
      },
    };

    try {
      await createStrategyMutation.mutateAsync({
        name: strategyName,
        description,
        config,
        initialCapital,
      });
      navigate("/dashboard");
    } catch (error) {
      alert("Failed to create strategy: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!plan?.canCreateStrategy) {
    return (
      <DashboardLayout>
        <Card className="border-0 shadow-sm max-w-2xl">
          <CardHeader>
            <CardTitle>Strategy Limit Reached</CardTitle>
            <CardDescription>You have reached the maximum number of active strategies for your plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your current plan allows {plan?.maxActiveStrategies} active strategies. Please complete or stop an existing strategy to create a new one.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Strategy</h1>
          <p className="text-muted-foreground mt-1">Define your trading strategy with entry, exit, and risk rules</p>
        </div>

        {/* Basic Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Basic Information
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Give your strategy a descriptive name and initial capital</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Strategy Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Breakout"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your strategy..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="capital">Initial Capital (₹) *</Label>
              <Input
                id="capital"
                type="number"
                placeholder="10000"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Entry Condition */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Entry Condition
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Define when your strategy should enter a trade</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="entryType">Entry Type *</Label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signal">Signal-based</SelectItem>
                  <SelectItem value="time">Time-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entryValue">Entry Value *</Label>
              <Input
                id="entryValue"
                placeholder={entryType === "time" ? "09:30" : "Price level or indicator"}
                value={entryValue}
                onChange={(e) => setEntryValue(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Legs */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CardTitle>
                  Trading Legs
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-2 inline" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Define individual positions with stop-loss and target levels</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </div>
              <Button onClick={handleAddLeg} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Leg
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {legs.map((leg, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Leg {index + 1}</h4>
                  {legs.length > 1 && (
                    <Button
                      onClick={() => handleRemoveLeg(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Instrument</Label>
                    <Select
                      value={leg.instrument}
                      onValueChange={(value) => handleLegChange(index, "instrument", value)}
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIFTY">NIFTY</SelectItem>
                        <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                        <SelectItem value="SENSEX">SENSEX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={leg.type} onValueChange={(value) => handleLegChange(index, "type", value)}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CE">Call (CE)</SelectItem>
                        <SelectItem value="PE">Put (PE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Action</Label>
                    <Select value={leg.action} onValueChange={(value) => handleLegChange(index, "action", value)}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      value={leg.quantity}
                      onChange={(e) => handleLegChange(index, "quantity", parseInt(e.target.value))}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Stop Loss (₹)</Label>
                    <Input
                      type="number"
                      value={leg.stoploss}
                      onChange={(e) => handleLegChange(index, "stoploss", parseInt(e.target.value))}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Target (₹)</Label>
                    <Input
                      type="number"
                      value={leg.target}
                      onChange={(e) => handleLegChange(index, "target", parseInt(e.target.value))}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`trailing-sl-${index}`}
                    checked={leg.trailing_sl}
                    onChange={(e) => handleLegChange(index, "trailing_sl", e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`trailing-sl-${index}`} className="text-sm cursor-pointer">
                    Enable Trailing Stop Loss
                  </Label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overall Risk */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Overall Risk Management
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set portfolio-level stop loss and profit targets</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mtmSl">Max Drawdown (₹) *</Label>
                <Input
                  id="mtmSl"
                  type="number"
                  value={mtmStoploss}
                  onChange={(e) => setMtmStoploss(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="mtmTarget">Max Profit Target (₹) *</Label>
                <Input
                  id="mtmTarget"
                  type="number"
                  value={mtmTarget}
                  onChange={(e) => setMtmTarget(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reentry"
                  checked={reentryEnabled}
                  onChange={(e) => setReentryEnabled(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="reentry" className="cursor-pointer">
                  Enable Re-entry after Stop Loss
                </Label>
              </div>

              {reentryEnabled && (
                <div>
                  <Label htmlFor="maxReentries">Max Re-entries</Label>
                  <Input
                    id="maxReentries"
                    type="number"
                    value={maxReentries}
                    onChange={(e) => setMaxReentries(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleCreateStrategy}
            disabled={createStrategyMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createStrategyMutation.isPending ? "Creating..." : "Create Strategy"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
