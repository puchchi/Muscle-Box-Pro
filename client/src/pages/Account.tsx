import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, History, Plus, User, TrendingUp, Users, Activity, Wallet } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

const revenueData = [
  { name: 'Mon', revenue: 4500 },
  { name: 'Tue', revenue: 5200 },
  { name: 'Wed', revenue: 4800 },
  { name: 'Thu', revenue: 6100 },
  { name: 'Fri', revenue: 5900 },
  { name: 'Sat', revenue: 7500 },
  { name: 'Sun', revenue: 6800 },
];

function toDisplayName(rawName: string) {
  return rawName
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function Account() {
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const { data: session, isLoading } = useQuery<{
    user: { email?: string; userMetadata?: Record<string, unknown> };
  } | null>({
    queryKey: ["supabase-session"],
    queryFn: async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return null;
      return {
        user: {
          email: s.user.email,
          userMetadata: s.user.user_metadata as Record<string, unknown>,
        },
      };
    },
  });
  const isLoggedIn = Boolean(session?.user);
  const accountType = session?.user?.userMetadata?.account_type;
  const userType = accountType === "gym" ? "gym" : "user";
  const fullNameFromMetadata =
    (session?.user?.userMetadata?.full_name as string | undefined) ??
    (session?.user?.userMetadata?.name as string | undefined);
  const memberName =
    fullNameFromMetadata?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Member";
  const memberDisplayName = toDisplayName(memberName);

  const transactions = [
    { id: 1, item: "Banana Blast", date: "Oct 24, 2024", amount: -350.00, location: "Gold's Gym Main" },
    { id: 2, item: "Date Delight", date: "Oct 22, 2024", amount: -450.50, location: "Iron Paradise" },
    { id: 3, item: "Wallet Reload", date: "Oct 20, 2024", amount: +1000.00, location: "App" },
    { id: 4, item: "Choco Whey", date: "Oct 18, 2024", amount: -250.50, location: "Downtown Fit" },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4 flex items-center justify-center text-gray-400">
          Checking session...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4 flex items-center justify-center">
          <Card className="bg-card border-white/10 w-full max-w-md p-8 text-center">
            <User className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold text-white mb-4">ACCOUNT ACCESS</h1>
            <p className="text-gray-400 mb-8">Sign in to manage your profile or gym revenue.</p>
            <Link href="/login">
              <Button className="w-full bg-primary text-background font-bold text-lg hover:bg-primary/90 h-12">
                SIGN IN TO DASHBOARD
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 px-4 max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
             <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 uppercase">
              {userType === 'gym' ? 'GYM OWNER PORTAL' : 'MEMBER DASHBOARD'}
            </h1>
            {userType === "gym" ? (
              <p className="text-muted-foreground">Managing: Iron Paradise Fitness</p>
            ) : (
              <div className="space-y-1">
                <p className="text-lg md:text-2xl font-display font-semibold text-primary">
                  Welcome back, {memberDisplayName}
                </p>
                <p className="text-muted-foreground">Ready for your post-workout fuel?</p>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-white/10 text-white" onClick={logout}>
              LOGOUT
            </Button>
            {userType === 'user' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-background font-bold hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" /> ADD FUNDS
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold uppercase">Load Wallet</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Add balance to your Muscle Box Pro account for instant shakes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[500, 1000, 2000].map((amount) => (
                        <Button 
                          key={amount} 
                          variant="outline" 
                          className="border-white/10 hover:border-primary hover:text-primary py-8 text-lg font-bold"
                          onClick={() => {
                            setCustomAmount(amount.toString());
                            toast({ title: "Amount Selected", description: `₹${amount} added to checkout.` });
                          }}
                        >
                          ₹{amount}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 font-mono uppercase">Custom Amount</label>
                      <Input 
                        className="bg-background border-white/10 focus:border-primary h-12 text-lg" 
                        placeholder="Enter amount" 
                        type="number" 
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm text-gray-400 font-mono uppercase block">Select Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="border-white/10 flex flex-col items-center gap-2 py-6 hover:border-primary hover:text-primary">
                          <CreditCard className="h-5 w-5" />
                          <span className="text-[10px] uppercase">Credit Card</span>
                        </Button>
                        <Button variant="outline" className="border-white/10 flex flex-col items-center gap-2 py-6 hover:border-primary hover:text-primary">
                          <Activity className="h-5 w-5" />
                          <span className="text-[10px] uppercase">UPI / QR</span>
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full bg-primary text-background font-bold h-12 text-lg" onClick={async () => {
                      // PROTOTYPE ONLY: Simulating API hit to backend
                      const payload = { amount: customAmount };
                      console.log("Hitting API: POST http://127.0.0.1:9999/wallet/add-funds", payload);
                      
                      toast({ title: "Processing Payment", description: "Connecting to secure gateway..." });
                      
                      // Simulate network delay
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      
                      toast({ title: "Success!", description: `₹${customAmount} added to your wallet.` });
                    }}>
                      PROCEED TO PAYMENT
                    </Button>
                    <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
                      Secure 256-bit SSL Encrypted Payment
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {userType === 'user' ? (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-card border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Current Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-display font-bold">₹750.50</div>
                  <p className="text-xs text-muted-foreground mt-1">Ready for 2 premium shakes</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Monthly Shakes</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-display font-bold">12</div>
                  <p className="text-xs text-accent mt-1">+15% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Fav Blend</CardTitle>
                  <History className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold truncate">Banana Blast</div>
                  <Button variant="link" className="text-primary p-0 h-auto text-xs mt-1">Quick Reorder</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="font-display">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.amount > 0 ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                          {t.amount > 0 ? <Plus className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{t.item}</p>
                          <p className="text-sm text-muted-foreground">{t.location} • {t.date}</p>
                        </div>
                      </div>
                      <div className={`font-mono font-bold ${t.amount > 0 ? 'text-accent' : 'text-white'}`}>
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="bg-card border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Weekly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold">₹42,500</div>
                  <p className="text-xs text-accent mt-1">+8% week-over-week</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold">842</div>
                  <p className="text-xs text-muted-foreground mt-1">24 active today</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Machine Status</CardTitle>
                  <Activity className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold text-accent uppercase">Online</div>
                  <p className="text-xs text-muted-foreground mt-1">Last service: 2 days ago</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Stock Level</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold">84%</div>
                  <p className="text-xs text-muted-foreground mt-1">Refill due in 4 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ color: '#00d1ff' }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Top Selling Blends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { name: 'Banana Blast', percentage: 45, color: 'bg-primary' },
                      { name: 'Chocolate Pure', percentage: 32, color: 'bg-accent' },
                      { name: 'Date Delight', percentage: 23, color: 'bg-muted' }
                    ].map((blend) => (
                      <div key={blend.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold">{blend.name}</span>
                          <span className="text-muted-foreground">{blend.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div className={`${blend.color} h-full`} style={{ width: `${blend.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
