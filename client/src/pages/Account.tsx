import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, History, Plus, User } from "lucide-react";

export default function Account() {
  const transactions = [
    { id: 1, item: "Banana Blast", date: "Oct 24, 2024", amount: -5.00, location: "Gold's Gym Main" },
    { id: 2, item: "Date Delight", date: "Oct 22, 2024", amount: -5.50, location: "Iron Paradise" },
    { id: 3, item: "Wallet Reload", date: "Oct 20, 2024", amount: +20.00, location: "App" },
    { id: 4, item: "Choco Whey", date: "Oct 18, 2024", amount: -4.50, location: "Downtown Fit" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20 px-4 max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
             <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">
              WELCOME BACK, <span className="text-primary">ALEX</span>
            </h1>
            <p className="text-gray-400">Manage your balance and view order history</p>
          </div>
          <Button className="bg-accent text-background font-bold hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" /> ADD FUNDS
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          
          {/* Balance Card */}
          <Card className="bg-card border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">$15.50</div>
              <p className="text-xs text-gray-500 mt-1">Auto-reload enabled</p>
            </CardContent>
          </Card>

           {/* Stats Card */}
           <Card className="bg-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Shakes this Month</CardTitle>
              <User className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">12</div>
              <p className="text-xs text-green-500 mt-1 flex items-center">
                 Top 10% of users
              </p>
            </CardContent>
          </Card>

          {/* Fav Card */}
          <Card className="bg-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Favorite Blend</CardTitle>
              <History className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold text-white truncate">Banana Blast</div>
              <Button variant="link" className="text-primary p-0 h-auto text-xs mt-1">Order Again</Button>
            </CardContent>
          </Card>

        </div>

        <div className="mt-10">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="bg-card border border-white/10 w-full justify-start h-12">
              <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-background">Order History</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-background">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-6">
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle className="font-display text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                            {t.amount > 0 ? <Plus className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-white">{t.item}</p>
                            <p className="text-sm text-gray-500">{t.location} • {t.date}</p>
                          </div>
                        </div>
                        <div className={`font-mono font-bold ${t.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
               <Card className="bg-card border-white/10">
                <CardContent className="pt-6">
                  <p className="text-gray-400">Account settings placeholder.</p>
                </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}
