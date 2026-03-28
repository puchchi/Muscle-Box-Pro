"use client";

import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, History, Plus, User, TrendingUp, Users, Activity, Wallet, Dumbbell, ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { motion } from "framer-motion";

const revenueData = [
  { name: 'Mon', revenue: 4500 },
  { name: 'Tue', revenue: 5200 },
  { name: 'Wed', revenue: 4800 },
  { name: 'Thu', revenue: 6100 },
  { name: 'Fri', revenue: 5900 },
  { name: 'Sat', revenue: 7500 },
  { name: 'Sun', revenue: 6800 },
];

type MemberTransaction = {
  id: string;
  item: string;
  date: string;
  amount: number;
  location: string;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseMemberTransactions(value: unknown): MemberTransaction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const amount = asNumber(row.amount);
      if (amount === null) return null;
      const item = typeof row.item === "string" ? row.item : "Transaction";
      const location = typeof row.location === "string" ? row.location : "App";
      const date = typeof row.date === "string" ? row.date : "Recently";
      const id = typeof row.id === "string" ? row.id : `transaction-${index.toString()}`;
      return { id, item, date, amount, location };
    })
    .filter((entry): entry is MemberTransaction => entry !== null);
}

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
  const router = useRouter();
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
  const walletBalance = asNumber(session?.user?.userMetadata?.wallet_balance);
  const monthlyShakes = asNumber(session?.user?.userMetadata?.monthly_shakes);
  const favoriteBlend =
    typeof session?.user?.userMetadata?.favorite_blend === "string" &&
      session.user.userMetadata.favorite_blend.trim()
      ? session.user.userMetadata.favorite_blend
      : null;
  const memberTransactions = parseMemberTransactions(
    session?.user?.userMetadata?.transactions,
  );

  const logout = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 pb-20 px-4 flex items-center justify-center text-muted-foreground">
          Checking session...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 pb-20 px-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-md p-10 text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-3">Account Access</h1>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Sign in to manage your wallet, track shakes, and view your gym revenue.</p>
            <Link href="/login">
              <Button className="w-full bg-primary text-white font-bold text-base hover:bg-primary/90 h-12 rounded-full cursor-pointer">
                Sign In to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-r from-accent to-primary pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-white/70 text-xs font-bold tracking-[0.25em] uppercase mb-2">
              {userType === "gym" ? "Gym Owner Portal" : "Member Dashboard"}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase leading-tight mb-1">
              {userType === "gym" ? "Iron Paradise Fitness" : `Hey, ${memberDisplayName}`}
            </h1>
            <p className="text-white/70 text-sm">
              {userType === "gym" ? "Managing your machine & revenue" : "Ready for your post-workout fuel?"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex gap-3"
          >
            <Button
              variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 cursor-pointer rounded-full backdrop-blur-sm"
              onClick={logout}
            >
              Logout
            </Button>
            {userType === "user" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-white text-primary font-bold hover:bg-white/90 cursor-pointer rounded-full shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 shadow-xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold uppercase text-foreground">Load Wallet</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Add balance to your Muscle Box Pro account for instant shakes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[500, 1000, 2000].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="border-gray-200 hover:border-primary hover:text-primary py-8 text-lg font-bold cursor-pointer rounded-xl"
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
                      <label className="text-sm text-gray-600 font-semibold uppercase tracking-wider">Custom Amount</label>
                      <Input
                        className="bg-white border-gray-300 focus:border-primary h-12 text-lg rounded-xl"
                        placeholder="Enter amount"
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm text-gray-600 font-semibold uppercase tracking-wider block">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="border-gray-200 flex flex-col items-center gap-2 py-6 hover:border-primary hover:text-primary cursor-pointer rounded-xl">
                          <CreditCard className="h-5 w-5" />
                          <span className="text-[11px] uppercase font-semibold">Credit Card</span>
                        </Button>
                        <Button variant="outline" className="border-gray-200 flex flex-col items-center gap-2 py-6 hover:border-primary hover:text-primary cursor-pointer rounded-xl">
                          <Zap className="h-5 w-5" />
                          <span className="text-[11px] uppercase font-semibold">UPI / QR</span>
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-primary text-white font-bold h-12 text-base rounded-full cursor-pointer"
                      onClick={async () => {
                        const payload = { amount: customAmount };
                        console.log("Hitting API: POST http://127.0.0.1:9999/wallet/add-funds", payload);
                        toast({ title: "Processing Payment", description: "Connecting to secure gateway..." });
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        toast({ title: "Success!", description: `₹${customAmount} added to your wallet.` });
                      }}
                    >
                      Proceed to Payment
                    </Button>
                    <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest">
                      Secure 256-bit SSL Encrypted Payment
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="-mt-10 pb-20 px-4 max-w-6xl mx-auto">

        {userType === "user" ? (
          <div className="space-y-6">

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Balance */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
                    <CardTitle className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Current Balance</CardTitle>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-display font-black text-foreground mb-1">
                      {walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {walletBalance !== null ? "Synced from your account" : "Wallet balance not available yet"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Monthly Shakes */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
                    <CardTitle className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Monthly Shakes</CardTitle>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-display font-black text-foreground mb-1">
                      {monthlyShakes !== null ? monthlyShakes : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {monthlyShakes !== null ? "Tracked from your account" : "Usage data not available yet"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Fav Blend */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
                    <CardTitle className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Favourite Blend</CardTitle>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Dumbbell className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-display font-black text-foreground mb-1 truncate">
                      {favoriteBlend ?? "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">Shown after your orders sync</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="bg-white border-gray-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4">
                  <CardTitle className="font-display font-bold text-foreground text-base">Recent Activity</CardTitle>
                  <History className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent className="pt-4">
                  {memberTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {memberTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${transaction.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-primary/10 text-primary'}`}>
                              {transaction.amount > 0
                                ? <ArrowUpRight className="h-4 w-4" />
                                : <ArrowDownLeft className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{transaction.item}</p>
                              <p className="text-xs text-muted-foreground">{transaction.location} · {transaction.date}</p>
                            </div>
                          </div>
                          <div className={`font-bold text-sm tabular-nums ${transaction.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                            {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <History className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-semibold text-sm mb-1">No activity yet</p>
                      <p className="text-gray-400 text-xs">Your shake purchases will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

        ) : (
          /* ── Gym Owner View ── */
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Weekly Revenue", value: "₹42,500", sub: "+8% week-over-week", icon: TrendingUp, color: "from-accent to-primary", iconBg: "bg-primary/10", iconColor: "text-primary", subColor: "text-accent" },
                { label: "Total Users", value: "842", sub: "24 active today", icon: Users, color: "from-blue-400 to-cyan-400", iconBg: "bg-blue-50", iconColor: "text-blue-500", subColor: "text-muted-foreground" },
                { label: "Machine Status", value: "Online", sub: "Last service: 2 days ago", icon: Activity, color: "from-green-400 to-emerald-500", iconBg: "bg-green-50", iconColor: "text-green-600", subColor: "text-muted-foreground" },
                { label: "Stock Level", value: "84%", sub: "Refill due in 4 days", icon: Wallet, color: "from-amber-400 to-orange-400", iconBg: "bg-amber-50", iconColor: "text-amber-500", subColor: "text-muted-foreground" },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                  <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
                      <CardTitle className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">{stat.label}</CardTitle>
                      <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                        <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-display font-black text-foreground mb-1">{stat.value}</div>
                      <p className={`text-xs ${stat.subColor}`}>{stat.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-white border-gray-100 shadow-sm">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <CardTitle className="font-display font-bold text-foreground text-base">Revenue Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[260px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#111' }}
                          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="bg-white border-gray-100 shadow-sm">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <CardTitle className="font-display font-bold text-foreground text-base">Top Selling Blends</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {[
                        { name: "Banana Blast", percentage: 45, color: "bg-primary" },
                        { name: "Chocolate Pure", percentage: 32, color: "bg-accent" },
                        { name: "Date Delight", percentage: 23, color: "bg-amber-400" },
                      ].map((blend) => (
                        <div key={blend.name} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-foreground">{blend.name}</span>
                            <span className="text-muted-foreground font-medium">{blend.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className={`${blend.color} h-full rounded-full transition-all duration-500`} style={{ width: `${blend.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
