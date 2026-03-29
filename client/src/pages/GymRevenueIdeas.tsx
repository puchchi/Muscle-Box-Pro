"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  ShoppingBag,
  UserCheck,
  Lock,
  Droplets,
  Car,
  Megaphone,
  TrendingUp,
  IndianRupee,
} from "lucide-react";

function AffiliationBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
      <div className="max-w-4xl mx-auto text-center text-amber-800 text-xs leading-relaxed">
        <strong>Disclosure:</strong> This page is published by{" "}
        <strong>BlendBox Innovations LLP</strong>, the company behind MuscleBoxPro, which appears as
        item #1 on this list. We have made every effort to present accurate, balanced information
        about all revenue methods. All figures are estimates as of Q1 2026 and should not be taken
        as guarantees of income.
      </div>
    </div>
  );
}

interface RevenueIdea {
  rank: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  pros: string[];
  cons: string[];
  investment: string;
  monthlyRevenue: string;
  roiRating: number; // 1–5
  isMBP?: boolean;
}

const ideas: RevenueIdea[] = [
  {
    rank: 1,
    icon: Zap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Protein Shake Vending Machine (MuscleBoxPro)",
    subtitle: "Highest ROI · Truly Passive · Zero Upfront Cost",
    description:
      "A smart automated protein shake vending machine installed on your gym floor generates passive income 24 hours a day, 7 days a week — without any staff, capital, or operational effort from the gym owner. MuscleBoxPro (operated by BlendBox Innovations LLP) supplies, installs, and maintains the machine entirely at its own cost. The gym earns a revenue share on every shake sold and a second stream from the machine's HD advertising display. With 12+ shake variants prepared in 60 seconds, cashless UPI payments, and a placement right where post-workout impulse is highest, the machine converts at a rate few other passive revenue tools can match. Available across 11 Indian cities: Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Jaipur, Noida, and Gurugram.",
    pros: [
      "Zero capital investment — machine installed free of charge",
      "Fully passive: no staff, no ordering, no operations for gym owner",
      "Dual revenue: shake sales share + advertising display income",
      "24/7 operation, including early mornings and late nights",
      "MuscleBoxPro handles all maintenance, restocking, and support",
      "High impulse-purchase conversion at point of post-workout need",
    ],
    cons: [
      "Gym earns a revenue share rather than 100% of margin",
      "Revenue depends on machine uptime — any mechanical issue halts income until resolved",
      "Menu is curated by MuscleBoxPro; gym cannot add arbitrary items",
    ],
    investment: "₹0 upfront (revenue-share model; machine, installation, and maintenance covered by MuscleBoxPro)",
    monthlyRevenue: "₹15,000–₹70,000+ depending on daily footfall and shake volume (estimate as of Q1 2026)",
    roiRating: 5,
    isMBP: true,
  },
  {
    rank: 2,
    icon: ShoppingBag,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Branded Merchandise Sales",
    subtitle: "Steady Secondary Revenue · Brand Building Benefit",
    description:
      "Selling branded gym merchandise — T-shirts, water bottles, resistance bands, gym bags, and shakers bearing your gym's logo — creates a secondary revenue stream while turning paying members into walking brand ambassadors. The key to merchandise profitability is inventory discipline: start with three to five fast-moving SKUs, order in small batches of 20–30 units, and avoid overstocking seasonal items. Gyms that build strong community identity (challenge programmes, transformation contests) see the best merchandise sell-through rates. Pricing merchandise at 2.5–3x landed cost delivers healthy margins. The downside is that this requires active management: ordering, display, restocking, and occasional markdowns on slow sellers.",
    pros: [
      "Doubles as free advertising every time a member wears your branded gear",
      "Members associate quality merchandise with gym prestige — supports premium pricing",
      "Accessories (resistance bands, straps) are consumable and drive repeat purchases",
      "No FSSAI or food hygiene compliance requirements",
    ],
    cons: [
      "Requires upfront inventory investment and ongoing reordering",
      "Slow-moving SKUs tie up capital; seasonal items can go stale",
      "Online platforms (Amazon, Decathlon) undercut on commodity items like bottles and bands",
      "Needs dedicated display space and someone to manage the store",
    ],
    investment: "₹30,000–₹80,000 initial inventory (est. Q1 2026)",
    monthlyRevenue: "₹8,000–₹35,000 for a mid-size gym with strong community culture (estimate as of Q1 2026)",
    roiRating: 3,
  },
  {
    rank: 3,
    icon: UserCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "Personal Training Upsells & Specialised Programmes",
    subtitle: "High Margin · Requires Trainer Quality Investment",
    description:
      "Personal training is one of the highest-margin revenue streams available to a gym — but it is fundamentally active income that scales only as fast as you can hire and retain quality trainers. The real passive leverage comes from structured group PT programmes, transformation challenges, and online coaching add-ons that a single trainer can run for 10–20 clients simultaneously. Gyms in metro India that offer specialised programmes (posture correction, sports conditioning, bridal fitness) command premium pricing that commodity PT at ₹500/session cannot. The risk is trainer retention: losing a popular trainer to a competing gym or independent practice can wipe out this revenue stream overnight.",
    pros: [
      "Very high gross margins — trainer cost is the primary variable",
      "Group programmes and challenges scale one trainer across many clients",
      "Builds member loyalty and reduces churn compared to members on standard memberships",
      "Online coaching components can extend reach beyond the physical gym",
    ],
    cons: [
      "Dependent on retaining quality trainers — high churn risk",
      "Requires ongoing trainer education and certification investment",
      "Active income, not passive — revenue stops if trainer leaves",
      "Hard to standardise quality across multiple trainers at scale",
    ],
    investment: "₹0–₹50,000 for certification support, programme materials, and marketing (est. Q1 2026)",
    monthlyRevenue: "₹25,000–₹1,50,000+ depending on trainer quality, programme pricing, and client volume (estimate as of Q1 2026)",
    roiRating: 4,
  },
  {
    rank: 4,
    icon: Lock,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "Locker Rentals",
    subtitle: "Genuinely Passive · Low Management Overhead",
    description:
      "Monthly or annual locker rentals are one of the most genuinely passive revenue streams available to gym owners. Members who rent lockers develop a stronger attachment to the gym — their belongings are there, creating a psychological switching cost that reduces churn. Locker rental pricing in metro India typically runs ₹300–₹600/month, and lockers require almost no ongoing management once installed. The key metrics are utilisation rate and the cost of the locker installation amortised over time. A bank of 30 lockers at 80% utilisation at ₹400/month generates ₹9,600/month in near-pure passive income. Maintenance requirements are minimal — occasional lock replacement, a quarterly inspection — and the revenue is highly predictable.",
    pros: [
      "Genuinely passive after installation — no ongoing staff involvement",
      "Reduces member churn by creating switching cost",
      "Predictable monthly revenue with low volatility",
      "Requires minimal floor space relative to revenue generated",
    ],
    cons: [
      "Meaningful upfront capital for quality locker installation",
      "Occasional lock failure, hinge repair, or theft incident requires maintenance",
      "Revenue ceiling is fixed by the number of lockers installed",
      "Members who leave may delay clearing lockers, creating admin",
    ],
    investment: "₹80,000–₹2,50,000 for locker bank installation depending on size and material (est. Q1 2026)",
    monthlyRevenue: "₹5,000–₹20,000 for a 20–50 locker bank at 70–85% utilisation (estimate as of Q1 2026)",
    roiRating: 3,
  },
  {
    rank: 5,
    icon: Droplets,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    title: "Spa, Sauna & Recovery Services",
    subtitle: "Premium Positioning · High Capital Requirement",
    description:
      "Adding spa, sauna, steam, or ice-bath recovery services transforms a gym's positioning from a commodity fitness space to a premium wellness destination. Premium gyms in metro India charge ₹200–₹600 per session for sauna or steam, and monthly spa-access add-ons at ₹1,500–₹3,000/month are increasingly common in upscale markets. The service differentiates from budget gyms that cannot afford the infrastructure and creates a new member segment: recovery-focused individuals who may not be heavy lifters but value the facility. The significant downside is the capital requirement and ongoing utility, plumbing, and maintenance costs. Sauna and steam rooms require specialist installation and carry higher compliance and liability obligations.",
    pros: [
      "Positions the gym as a premium wellness destination, supporting higher membership fees",
      "Monthly spa add-on packages generate predictable recurring revenue",
      "Attracts a recovery-focused segment that may not respond to traditional gym marketing",
      "Differentiates strongly from budget gym competitors",
    ],
    cons: [
      "High capital requirement (₹3–15 L for sauna/steam installation)",
      "Significant ongoing utility costs (electricity, water, heating)",
      "Requires specialist maintenance and periodic compliance checks",
      "Underutilised during off-peak hours — fixed costs don't scale down",
    ],
    investment: "₹3,00,000–₹15,00,000 depending on facility size and specification (est. Q1 2026)",
    monthlyRevenue: "₹20,000–₹80,000 for a mid-size facility with strong utilisation (estimate as of Q1 2026)",
    roiRating: 3,
  },
  {
    rank: 6,
    icon: Car,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    title: "Parking Fees",
    subtitle: "Location-Dependent · Passive When Systemised",
    description:
      "Gyms with dedicated parking — particularly in dense metro neighbourhoods where parking is scarce — can generate meaningful passive income by charging for parking on a per-visit or monthly basis. This model works best in markets like Bangalore, Mumbai, and Delhi where parking pressure is severe and members expect to pay. Monthly parking passes at ₹500–₹1,500/month effectively cross-subsidise the gym membership and create another layer of member stickiness. The revenue is genuinely passive once a barrier system or attendant rotation is in place. The obvious limitation: this only applies to gyms that have parking under their control, which excludes the majority of gym operators in high-rise commercial buildings.",
    pros: [
      "Near-passive revenue once a management system is in place",
      "Adds member stickiness — members prefer gyms where parking is easy",
      "Particularly valuable in high-density markets where parking is scarce",
      "Monthly parking passes are another recurring revenue line item",
    ],
    cons: [
      "Only applicable to gyms with controlled parking access",
      "May require barrier installation or attendant cost",
      "Risks member dissatisfaction if enforced too aggressively",
      "Revenue ceiling is fixed by available parking spaces",
    ],
    investment: "₹0–₹1,50,000 for barrier or management system (est. Q1 2026); or ₹0 if using a manual attendant rotation",
    monthlyRevenue: "₹5,000–₹30,000 depending on spaces available and market parking rates (estimate as of Q1 2026)",
    roiRating: 2,
  },
  {
    rank: 7,
    icon: Megaphone,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    title: "Brand Sponsorships & In-Gym Advertising",
    subtitle: "High Upside · Requires Audience Scale",
    description:
      "Gyms with strong footfall and an engaged membership base can sell advertising and sponsorship rights to brands looking to reach health-conscious Indian consumers. This includes wall branding, event sponsorships, flyer distribution, email list placements, and social media collaborations. Supplement brands, sports footwear companies, health food brands, and even non-fitness brands targeting active urban Indians are willing to pay for this access. The challenge is that this only generates meaningful income once the gym has achieved significant scale — typically 300+ active members and a recognisable brand in its market. Small gyms often find that the time spent negotiating deals is not proportional to the revenue generated.",
    pros: [
      "Can generate substantial income at scale with minimal operational overhead",
      "Builds relationships with premium brands that elevate gym prestige",
      "Event sponsorships can fund member events that also drive retention",
      "Social media brand partnerships can be managed from anywhere",
    ],
    cons: [
      "Requires significant scale (300+ members) before brands take notice",
      "Time-intensive to manage — deal negotiation, activation, and renewal",
      "Over-commercialisation risks member experience and brand dilution",
      "Seasonal — sports brands often concentrate spend in Q4 and post-New Year",
    ],
    investment: "₹0 cash; primary cost is time and relationship-building",
    monthlyRevenue: "₹5,000–₹50,000+ for well-established gyms with 400+ members; minimal for smaller operators (estimate as of Q1 2026)",
    roiRating: 2,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`w-2.5 h-2.5 rounded-full ${s <= rating ? "bg-primary" : "bg-gray-200"}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
    </div>
  );
}

export default function GymRevenueIdeas() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <AffiliationBanner />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <nav className="flex items-center justify-center gap-2 text-white/30 text-xs mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/50">Passive Revenue Ideas for Indian Gyms</span>
          </nav>

          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            Revenue Guide · Q1 2026
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-5"
            style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.4rem)" }}
          >
            7 Ways Indian Gyms Generate{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              Passive Revenue
            </span>
            <br />Ranked by ROI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/55 text-base leading-relaxed max-w-2xl mx-auto mb-8"
          >
            A no-fluff breakdown of every meaningful passive income stream available to gym owners
            in India in 2026 — ranked by realistic ROI, with honest pros, cons, and investment
            figures for each.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-7 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 shadow-lg shadow-primary/25">
                Add the #1 Revenue Stream Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Quick nav ── */}
        <section className="py-8 px-4 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mr-2">Jump to:</span>
              {ideas.map((idea) => (
                <a
                  key={idea.rank}
                  href={`#idea-${idea.rank}`}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                    idea.isMBP
                      ? "border-primary text-primary hover:bg-primary hover:text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  }`}
                >
                  #{idea.rank} {idea.isMBP ? "Protein Vending" : idea.title.split(" ").slice(0, 2).join(" ")}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── List ── */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-10">
            {ideas.map((idea, i) => (
              <motion.article
                key={idea.rank}
                id={`idea-${idea.rank}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border shadow-sm overflow-hidden ${
                  idea.isMBP
                    ? "border-primary/30 bg-white ring-2 ring-primary/10"
                    : "border-gray-100 bg-white"
                }`}
              >
                {/* Card header */}
                <div className={`px-6 py-5 flex items-start gap-5 border-b ${idea.isMBP ? "bg-primary/5 border-primary/15" : "bg-gray-50 border-gray-100"}`}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 relative">
                      <div className={`w-14 h-14 rounded-2xl ${idea.iconBg} flex items-center justify-center`}>
                        <idea.icon className={`w-7 h-7 ${idea.iconColor}`} />
                      </div>
                      <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-[11px] font-black text-white flex items-center justify-center ${idea.isMBP ? "bg-primary" : "bg-gray-500"}`}>
                        {idea.rank}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-display font-black text-gray-900 text-lg leading-tight">{idea.title}</h2>
                        {idea.isMBP && (
                          <span className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            Our Product
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold ${idea.isMBP ? "text-primary" : "text-gray-500"}`}>
                        {idea.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 hidden sm:block">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 text-right">ROI Rating</p>
                    <StarRating rating={idea.roiRating} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-6 space-y-6">
                  <p className="text-gray-600 leading-relaxed text-sm">{idea.description}</p>

                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Pros */}
                    <div>
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">Advantages</p>
                      <ul className="space-y-2">
                        {idea.pros.map((pro, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 text-sm leading-snug">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cons */}
                    <div>
                      <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-3">Limitations</p>
                      <ul className="space-y-2">
                        {idea.cons.map((con, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 text-sm leading-snug">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Investment & Revenue row */}
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className={`rounded-xl border p-4 ${idea.isMBP ? "bg-primary/5 border-primary/15" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <IndianRupee className={`w-4 h-4 ${idea.isMBP ? "text-primary" : "text-gray-500"}`} />
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Investment Required</p>
                      </div>
                      <p className="text-gray-800 text-sm font-semibold leading-snug">{idea.investment}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${idea.isMBP ? "bg-primary/5 border-primary/15" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <TrendingUp className={`w-4 h-4 ${idea.isMBP ? "text-primary" : "text-gray-500"}`} />
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Est. Monthly Revenue</p>
                      </div>
                      <p className="text-gray-800 text-sm font-semibold leading-snug">{idea.monthlyRevenue}</p>
                    </div>
                  </div>

                  {/* CTA for MBP item only */}
                  {idea.isMBP && (
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <Link href="/gym-demo">
                        <Button size="sm" className="h-9 px-5 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0">
                          Request Free Machine Demo <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Link href="/specs">
                        <Button size="sm" variant="outline" className="h-9 px-5 rounded-full font-semibold border-primary/30 text-primary hover:bg-primary/5">
                          View Machine Specs
                        </Button>
                      </Link>
                      <Link href="/vs/protein-shake-bar">
                        <Button size="sm" variant="ghost" className="h-9 px-5 rounded-full font-semibold text-gray-500 hover:text-gray-900">
                          Compare vs. Shake Bar
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Summary table ── */}
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">At a Glance</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl">
                All 7 Methods Compared
              </h2>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Revenue Method</th>
                    <th className="px-4 py-4 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">Upfront Cost</th>
                    <th className="px-4 py-4 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">Passive?</th>
                    <th className="px-4 py-4 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">Est. Monthly</th>
                    <th className="px-4 py-4 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">ROI Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { rank: 1, name: "Protein Vending Machine (MBP)", cost: "₹0", passive: "Yes", monthly: "₹15K–₹70K+", rating: 5, mbp: true },
                    { rank: 2, name: "Branded Merchandise", cost: "₹30K–₹80K", passive: "Partial", monthly: "₹8K–₹35K", rating: 3 },
                    { rank: 3, name: "Personal Training Upsells", cost: "₹0–₹50K", passive: "No", monthly: "₹25K–₹1.5L", rating: 4 },
                    { rank: 4, name: "Locker Rentals", cost: "₹80K–₹2.5L", passive: "Yes", monthly: "₹5K–₹20K", rating: 3 },
                    { rank: 5, name: "Spa / Sauna / Recovery", cost: "₹3L–₹15L", passive: "Partial", monthly: "₹20K–₹80K", rating: 3 },
                    { rank: 6, name: "Parking Fees", cost: "₹0–₹1.5L", passive: "Yes", monthly: "₹5K–₹30K", rating: 2 },
                    { rank: 7, name: "Brand Sponsorships", cost: "₹0", passive: "Partial", monthly: "₹5K–₹50K+", rating: 2 },
                  ].map((row) => (
                    <tr key={row.rank} className={row.mbp ? "bg-primary/5" : ""}>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white ${row.mbp ? "bg-primary" : "bg-gray-400"}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {row.mbp && <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded mr-2">Our Product</span>}
                        {row.name}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-700">{row.cost}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                          row.passive === "Yes" ? "bg-emerald-100 text-emerald-700" :
                          row.passive === "No" ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {row.passive}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-gray-900">{row.monthly}</td>
                      <td className="px-4 py-4 text-center">
                        <StarRating rating={row.rating} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              All figures are estimates as of Q1 2026. Revenue ranges reflect broad variation across gym sizes, cities, and management quality. Not a guarantee of income.
            </p>
          </div>
        </section>

        {/* ── Ranking methodology ── */}
        <section className="py-16 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display font-black text-foreground uppercase text-xl">How We Ranked These Methods</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Rankings are based on four weighted factors relevant to the Indian gym market in 2026:
            </p>
            <ul className="space-y-3">
              {[
                { label: "Capital Efficiency", desc: "Revenue generated per rupee of upfront investment. Methods requiring zero capital score highest." },
                { label: "Passivity", desc: "The degree to which the revenue stream operates without active time investment from the gym owner or staff. Fully automated = highest score." },
                { label: "Revenue Reliability", desc: "Consistency and predictability of monthly income. High-frequency, low-ticket transactions (shakes, lockers) score higher than lumpy, high-ticket sales (supplement tubs)." },
                { label: "Scalability", desc: "Whether the revenue scales with gym footfall without a proportional increase in cost or management complexity." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm leading-relaxed">
                    <strong className="text-gray-900">{item.label}:</strong> {item.desc}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 text-sm mt-5 leading-relaxed">
              Personal training ranks #3 (not #2) despite potentially the highest monthly revenue ceiling because it is fundamentally active income — it requires the gym to maintain, train, and retain quality trainers. Merchandise ranks #2 because while the income is modest, it builds brand equity that compounds over time.
            </p>
          </div>
        </section>

        {/* ── Related links ── */}
        <section className="py-10 px-4 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Dig Deeper</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Shake Bar vs Vending Machine", href: "/vs/protein-shake-bar" },
                { label: "Supplement Counter vs Vending Machine", href: "/vs/supplement-counter" },
                { label: "How MuscleBoxPro Works", href: "/protein-shake-vending-machine" },
                { label: "Machine Specifications", href: "/specs" },
                { label: "Request a Demo", href: "/gym-demo" },
                { label: "Protein Vending Machine — City Guide", href: "/protein-vending-machine-india" },
              ].map((l, i) => (
                <Link
                  key={i}
                  href={l.href}
                  className="text-sm text-primary border border-primary/30 hover:bg-primary hover:text-white rounded-full px-4 py-1.5 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-gradient-to-r from-accent to-primary relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center relative z-10"
          >
            <h2 className="font-display font-black text-white uppercase leading-none mb-4" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
              Start with the #1 ranked method — today
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              A MuscleBoxPro machine is the only revenue stream on this list that costs nothing to start, requires zero staff, and generates two income streams from day one. Available across 11 Indian cities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/gym-demo">
                <Button size="lg" className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 shadow-lg">
                  Request Free Demo <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/specs">
                <Button size="lg" variant="outline" className="h-12 px-7 rounded-full font-semibold border-white/30 text-white hover:bg-white/10">
                  View Machine Specs
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
