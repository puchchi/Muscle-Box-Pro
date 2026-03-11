"use client";

import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Monitor, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Advertiser() {
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleCampaignRequest = async () => {
    setNotice(null);
    const values = { brandName, email, mobile };
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke(
        "campaign-request",
        { body: values },
      );
      if (error) throw error;
      setNotice({
        type: "success",
        message:
          (data as { message?: string })?.message ||
          "Thank you! Our advertising team will contact you shortly.",
      });
      setBrandName("");
      setEmail("");
      setMobile("");
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit inquiry right now. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section for Advertisers */}
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
              REACH ACTIVE USERS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                AT THE MOMENT OF IMPACT
              </span>
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed">
              Display your brand on our high-definition 32" screens while users wait for their shake. 
              The perfect captive audience for fitness, health, and lifestyle brands.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: Users, title: "Captive Audience", desc: "Users stare at the screen for 45 seconds while their shake blends." },
              { icon: Monitor, title: "4K Displays", desc: "Vibrant high-res screens ensure your brand looks premium." },
              { icon: TrendingUp, title: "High Conversion", desc: "Target health-conscious individuals right after their workout." }
            ].map((item, i) => (
              <div key={i} className="bg-card/50 border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-card/80 transition-colors">
                <item.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-secondary rounded-3xl overflow-hidden border border-white/10">
            <div className="grid lg:grid-cols-2">
              <div className="p-12 flex flex-col justify-center">
                <h2 className="text-3xl font-display font-bold text-white mb-4">Start Your Campaign</h2>
                <p className="text-gray-400 mb-8">
                  Get real-time analytics on impressions and engagement. Packages start at just $500/month per location network.
                </p>
                <div className="space-y-4">
                  {notice && (
                    <div
                      className={
                        notice.type === "success"
                          ? "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                          : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      }
                    >
                      {notice.message}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="w-full">
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Brand Name</label>
                      <input 
                        className="w-full bg-background/50 border border-white/10 rounded-md p-3 text-white focus:border-primary outline-none" 
                        placeholder="Nike, GymShark..." 
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                      />
                    </div>
                     <div className="w-full">
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Work Email</label>
                      <input 
                        className="w-full bg-background/50 border border-white/10 rounded-md p-3 text-white focus:border-primary outline-none" 
                        placeholder="marketing@brand.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Mobile Number</label>
                    <input 
                      className="w-full bg-background/50 border border-white/10 rounded-md p-3 text-white focus:border-primary outline-none" 
                      placeholder="+91 98765 43210" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full bg-primary text-background font-bold text-lg hover:bg-primary/90"
                    onClick={handleCampaignRequest}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "SUBMITTING..." : "CONTACT FOR PRICING"}
                  </Button>
                </div>
              </div>
              <div className="relative h-64 lg:h-auto">
                 <img 
                  src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                  alt="Machine Screen" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
