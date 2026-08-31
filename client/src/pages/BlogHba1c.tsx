"use client";

import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import PreferredSourceButton from "@/components/seo/PreferredSourceButton";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import {
  TrendingDown,
  Activity,
  ShieldAlert,
  Lightbulb,
  ArrowRight,
  FlaskConical,
  Heart,
  ChevronDown,
  Moon,
  Zap,
  Egg,
  Wheat,
  Droplets,
  Leaf,
  Coffee,
  Footprints,
  Pizza,
  Clock,
  Brain,
  Dumbbell,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── HbA1C milestone data ── */
const hba1cJourney = [
  { date: "Mar 2024", value: 6.1, label: "Warning zone", valueColor: "text-yellow-400", labelColor: "text-yellow-400/80" },
  { date: "Jul 2025", value: 5.9, label: "Improving", valueColor: "text-blue-400", labelColor: "text-blue-400/80" },
  { date: "Oct 2025", value: 5.2, label: "Normal range", valueColor: "text-green-400", labelColor: "text-green-400/80" },
];

/* ── Learnings data ── */
type Learning = { icon: LucideIcon; iconClass: string; title: string; body: string };
const learnings: Learning[] = [
  {
    icon: Moon,
    iconClass: "text-indigo-600 bg-indigo-50",
    title: "Night spikes were my biggest problem",
    body: "Even eating the same meal, my glucose spiked much more at dinner than at lunch. My sedentary office work during the day seemed to blunt the lunch spike. Dinner = danger zone.",
  },
  {
    icon: Zap,
    iconClass: "text-amber-600 bg-amber-50",
    title: "80g paneer reduced my dinner spike by ~20%",
    body: "Adding a serving of paneer (cottage cheese) to my dinner meaningfully flattened the glucose curve. Protein slows gastric emptying, giving your body more time to handle carbs.",
  },
  {
    icon: Egg,
    iconClass: "text-green-600 bg-green-50",
    title: "2 boiled eggs or an omelette kept glucose nearly flat",
    body: "Eggs were the single most effective food change I made. With eggs in the meal, my spike stayed within 10–20% of baseline. No drama.",
  },
  {
    icon: Wheat,
    iconClass: "text-orange-600 bg-orange-50",
    title: "Wheat roti and rice cause similar spikes",
    body: "I tested both carefully. Surprise: white rice and wheat roti produced nearly identical glucose responses for me. Neither was clearly 'safe'.",
  },
  {
    icon: Wheat,
    iconClass: "text-red-600 bg-red-50",
    title: "Multigrain roti was a disappointment",
    body: "My blend was 50% wheat, 10% jowar, 20% besan, 20% ragi, and the glucose spike was almost identical to plain wheat roti. Context matters more than the flour.",
  },
  {
    icon: Droplets,
    iconClass: "text-cyan-600 bg-cyan-50",
    title: "Apple Cider Vinegar (ACV) does wonders",
    body: "Having ACV (with or without lemon juice) before or during a meal produced a noticeably lower spike. The acetic acid slows starch digestion. This is one of the most evidence-backed food hacks.",
  },
  {
    icon: Leaf,
    iconClass: "text-emerald-600 bg-emerald-50",
    title: "Salad with lemon juice blunted spikes",
    body: "Cucumber with lemon juice and salt before or during a meal reduced my post-meal spike. The lemon's acidity seems to slow glucose absorption. Add lemon to your meals.",
  },
  {
    icon: Coffee,
    iconClass: "text-amber-700 bg-amber-50",
    title: "Tea does spike glucose  but less if you're active",
    body: "2–4 cups of tea per day did cause small spikes, but they were noticeably less when I was doing something physical vs sitting still. Stay moving.",
  },
  {
    icon: Footprints,
    iconClass: "text-blue-600 bg-blue-50",
    title: "20 min post-dinner walk: didn't help much for me",
    body: "Walking after dinner is commonly recommended, but in my personal CGM data it didn't make a significant difference. Your mileage may vary.",
  },
  {
    icon: Pizza,
    iconClass: "text-purple-600 bg-purple-50",
    title: "Cheese burst pizza: surprisingly low spike",
    body: "The fat in the cheese slows digestion significantly. High fat meals can sometimes produce lower immediate spikes, though they can cause prolonged elevation.",
  },
  {
    icon: Clock,
    iconClass: "text-slate-600 bg-slate-50",
    title: "Stale rice and roti from the fridge spike less",
    body: "Cooling cooked carbs overnight converts some starch to resistant starch, which your body can't digest as rapidly. Leftover rice is literally healthier.",
  },
  {
    icon: Brain,
    iconClass: "text-rose-600 bg-rose-50",
    title: "Context is everything: same food, different response",
    body: "Stress, sleep quality, time of day, activity level - all of these changed how my body responded to the exact same meal. A CGM teaches you this viscerally.",
  },
];

/* ── Formula data ── */
type FormulaTip = { icon: LucideIcon; iconClass: string; title: string; body: string };
const formulaTips: FormulaTip[] = [
  {
    icon: Droplets,
    iconClass: "text-cyan-400 bg-cyan-400/15",
    title: "Add acid to every meal",
    body: "Lemon juice, ACV, or salad with lemon. This alone can reduce your spike by 20–30%. Add it to dal, raita, or as a side.",
  },
  {
    icon: Egg,
    iconClass: "text-green-400 bg-green-400/15",
    title: "Always add a protein source",
    body: "Eggs, paneer, dal, tofu - pick one. Protein slows carb absorption and keeps you fuller longer. Non-negotiable.",
  },
  {
    icon: Flame,
    iconClass: "text-amber-400 bg-amber-400/15",
    title: "A small amount of fat helps",
    body: "Fat slows gastric emptying. A little ghee on roti or cheese in a meal smooths the glucose curve.",
  },
];

/* ── FAQ data ── */
const faqs = [
  {
    q: "What is HbA1C and what does it measure?",
    a: "HbA1C (glycated haemoglobin) is a blood test that measures your average blood sugar over the past 2–3 months. A value below 5.7% is normal, 5.7–6.4% is pre-diabetic, and 6.5%+ is diabetic.",
  },
  {
    q: "What is a CGM and how does it work?",
    a: "A Continuous Glucose Monitor (CGM) is a sensor worn on your arm or abdomen that measures glucose in your interstitial fluid every 5–15 minutes. The LibreSensor (FreeStyle Libre) I used syncs data to a phone app called Gurucose, which exported the CSV.",
  },
  {
    q: "How long does it take to lower HbA1C through diet?",
    a: "HbA1C reflects your 2–3 month average. Most people see measurable improvement in one HbA1C test cycle (about 3 months) with consistent dietary changes. I went from 6.1 to 5.2 in roughly 18 months of gradual effort.",
  },
  {
    q: "Is this approach safe for someone on diabetes medication?",
    a: "If you are on insulin or any glucose-lowering medication, do NOT make dietary changes without consulting your doctor first. Reducing carbs while on insulin can cause dangerous hypoglycaemia.",
  },
  {
    q: "Can everyone achieve the same results?",
    a: "No. Glucose response is highly individual. Genetics, gut microbiome, activity level, stress, and sleep all play a role. A CGM is valuable precisely because it shows YOUR personal response, not an average.",
  },
];

/* ── Glucose chart component ── */
type GlucosePoint = { ts: number; value: number; label: string };

function GlucoseChart() {
  const [data, setData] = useState<GlucosePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/assets/fix_hba1c/gurucose.csv")
      .then((r) => r.text())
      .then((text) => {
        const lines = text.trim().split("\n").slice(1);
        const parsed: GlucosePoint[] = [];
        lines.forEach((line, i) => {
          if (i % 5 !== 0) return;
          const [timestamp, glucoseStr] = line.split(",");
          const value = parseInt(glucoseStr, 10);
          if (!timestamp || isNaN(value) || value < 20) return;
          const ts = new Date(timestamp).getTime();
          if (isNaN(ts)) return;
          const d = new Date(ts);
          const label = `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
          parsed.push({ ts, value, label });
        });
        setData(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const visibleTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: number[] = [];
    data.forEach((d) => {
      const day = new Date(d.ts).toDateString();
      if (!seen.has(day)) { seen.add(day); ticks.push(d.ts); }
    });
    return ticks;
  }, [data]);

  const formatTick = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  const stats = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((d) => d.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const inRange = Math.round((values.filter((v) => v >= 70 && v <= 140).length / values.length) * 100);
    const peak = Math.max(...values);
    return { avg, inRange, peak };
  }, [data]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Loading glucose data…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Could not load glucose data.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Avg Glucose", value: `${stats.avg} mg/dL`, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
            { label: "Time in Range", value: `${stats.inRange}%`, color: stats.inRange >= 70 ? "text-green-600" : "text-amber-600", bg: stats.inRange >= 70 ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100" },
            { label: "Peak Reading", value: `${stats.peak} mg/dL`, color: stats.peak > 180 ? "text-red-600" : "text-amber-600", bg: stats.peak > 180 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 text-center ${s.bg}`}>
              <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          {/* Risk zone bands */}
          <ReferenceArea y1={50} y2={70} fill="#fca5a5" fillOpacity={0.22} />
          <ReferenceArea y1={70} y2={140} fill="#86efac" fillOpacity={0.18} />
          <ReferenceArea y1={140} y2={200} fill="#fcd34d" fillOpacity={0.18} />
          {/* Threshold lines */}
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "Low 70", position: "insideTopLeft", fontSize: 10, fill: "#ef4444" }} />
          <ReferenceLine y={140} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "High 140", position: "insideTopLeft", fontSize: 10, fill: "#d97706" }} />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={visibleTicks}
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            scale="time"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[50, 200]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}`}
            width={32}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GlucosePoint;
              const val = d.value;
              const zone = val > 140
                ? { label: "High", color: "#d97706", dot: "bg-amber-400" }
                : val < 70
                ? { label: "Low", color: "#dc2626", dot: "bg-red-400" }
                : { label: "Normal", color: "#16a34a", dot: "bg-green-400" };
              return (
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-lg text-xs min-w-[130px]">
                  <p className="text-gray-400 mb-1.5 text-[10px]">{d.label}</p>
                  <p className="font-black text-base mb-1" style={{ color: zone.color }}>{val} mg/dL</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: zone.color }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${zone.dot} inline-block`} />
                    {zone.label}
                  </span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={1.8}
            fill="url(#glucoseFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Low (&lt;70)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" /> Normal (70–140)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-200 inline-block" /> High (&gt;140)
        </span>
      </div>
    </div>
  );
}

/* ── FAQ accordion ── */
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-4 pt-3 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Section heading ── */
function SectionHeading({ icon: Icon, iconClass, children }: { icon: LucideIcon; iconClass: string; children: React.ReactNode }) {
  return (
    <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 flex items-center gap-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </span>
      {children}
    </h2>
  );
}

/* ── Main component ── */
export default function BlogHba1c() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-0 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[240px] bg-gradient-to-r from-green-500/15 to-primary/15 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="hero-rise text-center pb-10">
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Personal Health Story
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-5"
              style={{ fontSize: "clamp(1.9rem, 5vw, 3rem)" }}
            >
              How I dropped my HbA1C from{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-400">
                6.1 to 5.2
              </span>{" "}
              with a CGM and diet tweaks
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-xl mx-auto mb-6">
              A borderline pre-diabetic's real data. Reports, continuous glucose readings, and the 12 things I learned about my own body.
            </p>
            <div className="flex items-center justify-center gap-3 text-white/40 text-sm">
              <span>By Anurag Singh</span>
              <span>·</span>
              <span>10 min read</span>
              <span>·</span>
              <span>Apr 2026</span>
            </div>
          </div>

          {/* HbA1C journey bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10"
          >
            {hba1cJourney.map((item, i) => (
              <div key={i} className="flex-1 bg-gray-900 px-4 py-5 text-center border-r border-white/10 last:border-0">
                <div className={`text-3xl font-black mb-1 ${item.valueColor}`}>{item.value}%</div>
                <div className="text-white/40 text-xs mb-1">{item.date}</div>
                <div className={`text-xs font-semibold ${item.labelColor}`}>{item.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* ── Intro ── */}
          <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
            In March 2024, a routine blood test came back with HbA1C of <strong>6.1%</strong>, right at the border of pre-diabetes. I wasn't on any medication, but the number was a warning. Instead of ignoring it, I decided to understand my body better. What followed was 18 months of data, experimentation, and some genuinely surprising discoveries about Indian food and blood sugar.
          </p>
          <p className="text-gray-700 leading-relaxed mb-12">
            By October 2025, my HbA1C had dropped to <strong>5.2%</strong>, solidly in the normal range. Here is everything I did, with the actual lab reports and continuous glucose data to back it up.
          </p>

          {/* ── Section 1: The Reports ── */}
          <SectionHeading icon={TrendingDown} iconClass="bg-green-100 text-green-600">
            The Lab Reports
          </SectionHeading>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Three blood tests over ~18 months tell the whole story. Here are the actual reports:
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { file: "3_11_2024.png", date: "3 Nov 2024", hba1c: "6.1%", status: "Pre-diabetic range", statusColor: "text-yellow-700 bg-yellow-50 border-yellow-200" },
              { file: "7_9_2025.png", date: "9 Jul 2025", hba1c: "5.9%", status: "Improving", statusColor: "text-blue-700 bg-blue-50 border-blue-200" },
              { file: "10_10_2025.png", date: "10 Oct 2025", hba1c: "5.2%", status: "Normal range", statusColor: "text-green-700 bg-green-50 border-green-200" },
            ].map((report) => (
              <div key={report.file} className="flex flex-col rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                  <Image
                    src={`/assets/fix_hba1c/${report.file}`}
                    alt={`HbA1C blood test report dated ${report.date}`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <div className="text-2xl font-black text-gray-900 mb-0.5">{report.hba1c}</div>
                  <div className="text-xs text-gray-500 mb-2">{report.date}</div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${report.statusColor}`}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Section 2: The CGM ── */}
          <SectionHeading icon={Activity} iconClass="bg-primary/10 text-primary">
            The Tool That Changed Everything: A CGM
          </SectionHeading>
          <p className="text-gray-600 mb-6 leading-relaxed">
            An HbA1C test only gives you a 3-month average. It tells you <em>something</em> is wrong, but not <em>what</em> specifically is causing it. I needed real-time data.
          </p>
          <p className="text-gray-600 mb-6 leading-relaxed">
            I bought a <strong>FreeStyle LibreSensor</strong> (a Continuous Glucose Monitor, or CGM) from PharmEasy. The sensor sticks to your upper arm and measures interstitial glucose every few minutes for 14 days. I used the <strong>Gurucose app</strong> to read the sensor and export data to CSV.
          </p>

          {/* LibreSensor invoice */}
          <div className="flex flex-col sm:flex-row gap-6 items-start mb-12 bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <div className="relative w-full sm:w-48 aspect-square rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
              <Image
                src="/assets/fix_hba1c/LibreSensor.png"
                alt="FreeStyle LibreSensor purchase invoice from PharmEasy"
                fill
                className="object-contain p-2"
                sizes="192px"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                <span className="font-bold text-gray-900 text-sm">FreeStyle LibreSensor</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                A 14-day CGM sensor that sits on your upper arm. No finger pricks. Just scan or glance at your phone to see your real-time glucose curve. The purchase receipt above is from PharmEasy, it's available at most major Indian pharmacies.
              </p>
              <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                <li>14 days of continuous data per sensor</li>
                <li>Syncs via Gurucose app (exports to CSV)</li>
                <li>Available without prescription</li>
                <li>No blood draw, reads interstitial fluid</li>
              </ul>
            </div>
          </div>

          {/* ── Section 3: 14-Day Glucose Graph ── */}
          <SectionHeading icon={Activity} iconClass="bg-indigo-100 text-indigo-600">
            14 Days of Real Glucose Data
          </SectionHeading>
          <p className="text-gray-600 mb-3 leading-relaxed">
            Below is my continuous glucose profile across the 14-day sensor window (Jul 28 – Aug 12, 2025). Each spike is a meal. The overnight rises, especially in the first few days, clearly show the problem: <strong>my body struggled most at night</strong>.
          </p>
          <p className="text-gray-600 mb-6 leading-relaxed text-sm">
            The green band (70–140 mg/dL) is the normal fasting + post-meal range. Sustained readings above 140 after meals indicate poor glycaemic control.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
            <GlucoseChart />
          </div>
          <p className="text-xs text-gray-400 text-center mb-12">
            Raw data from Gurucose app (FreeStyle LibreSensor). Values in mg/dL. Sampled every 5 readings for display performance.
          </p>

          {/* ── Section 4: Learnings ── */}
          <SectionHeading icon={Lightbulb} iconClass="bg-yellow-100 text-yellow-600">
            12 Things I Learned About My Body
          </SectionHeading>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Two weeks of CGM data is more educational than years of guessing. Here's what the data showed me. Some expected, some genuinely surprising.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {learnings.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.iconClass}`}>
                  <item.icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Section 5: The Formula ── */}
          <div className="bg-gray-950 rounded-2xl p-8 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/20 to-primary/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-display font-black text-white uppercase text-xl mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-green-400/15 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-green-400" />
                </span>
                My Simple Formula
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {formulaTips.map((tip) => (
                  <div key={tip.title} className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tip.iconClass}`}>
                      <tip.icon className="w-5 h-5" />
                    </span>
                    <p className="font-bold text-white text-sm mb-2">{tip.title}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{tip.body}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm mt-6 leading-relaxed">
                Eat your rice and roti - but pair every meal with <strong className="text-white/80">acid + protein + a little fat</strong>. That combination is what actually moved the needle for me.
              </p>
            </div>
          </div>

          {/* ── Section 6: How I'd help family ── */}
          <SectionHeading icon={Heart} iconClass="bg-blue-100 text-blue-600">
            How I'd Approach This for a Family Member
          </SectionHeading>
          <p className="text-gray-600 mb-4 leading-relaxed">
            If someone in my family had elevated HbA1C, here's exactly what I'd do:
          </p>
          <ol className="space-y-3 mb-12">
            {[
              { step: "1", text: "Buy a CGM sensor (FreeStyle LibreSensor from PharmEasy). 14 days of data is worth more than any nutrition advice." },
              { step: "2", text: "Track their existing diet for 7 days without changing anything. Understand the baseline, which meals cause the worst spikes for them specifically." },
              { step: "3", text: "Target the single worst meal first. Add acid (lemon/ACV) and a protein source. See if it moves the needle in the data." },
              { step: "4", text: "Iterate one change at a time. The CGM gives you feedback in real-time. No guessing needed." },
              { step: "5", text: "Retest HbA1C after 3 months. If it's moving in the right direction, keep going. If not, reconsider with a doctor." },
            ].map((item) => (
              <li key={item.step} className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
                  {item.step}
                </span>
                <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ol>

          {/* ── Disclaimer ── */}
          <div className="flex gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-12">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm mb-2">Important Disclaimer</p>
              <ul className="text-amber-800 text-sm space-y-1.5 list-disc list-inside leading-relaxed">
                <li>I am not a medical professional. This is a personal account, not medical advice.</li>
                <li>Results are highly individual. Your body may respond differently to the same foods.</li>
                <li><strong>If you are on insulin or diabetes medication</strong>, do not change your diet without consulting your doctor. Dietary changes can cause dangerous hypoglycaemia.</li>
                <li>Pre-diabetes is a spectrum. My case was mild (borderline). More advanced diabetes requires professional management.</li>
                <li>Think of this as a starting point for your own investigation, not a prescription.</li>
              </ul>
            </div>
          </div>

          {/* ── FAQ ── */}
          <SectionHeading icon={FlaskConical} iconClass="bg-gray-100 text-gray-600">
            Questions People Ask
          </SectionHeading>
          <div className="space-y-3 mb-16 mt-6">
            {faqs.map((faq) => (
              <FAQ key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="bg-gray-900 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[160px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <p className="text-white/50 text-xs tracking-widest uppercase mb-3">Related Reading</p>
              <h3 className="font-display font-black text-white uppercase leading-none text-xl mb-3">
                Protein &amp; blood sugar - the science
              </h3>
              <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                Want to understand <em>why</em> protein flattens glucose spikes? We broke down the research.
              </p>
              <Link
                href="/blog/protein-for-diabetes"
                className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors duration-200 text-sm cursor-pointer shadow-lg shadow-primary/25"
              >
                Read the Article <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <PreferredSourceButton className="mt-8" />

        </article>
      </main>

      <Footer />
    </div>
  );
}
