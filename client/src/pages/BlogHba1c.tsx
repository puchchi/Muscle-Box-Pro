"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
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
  ChevronUp,
} from "lucide-react";

/* ── HbA1C milestone data ── */
const hba1cJourney = [
  { date: "Mar 2024", value: 6.1, label: "Warning zone", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { date: "Jul 2025", value: 5.9, label: "Improving", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { date: "Oct 2025", value: 5.2, label: "Normal range", color: "text-green-600", bg: "bg-green-50 border-green-200" },
];

/* ── Learnings data ── */
const learnings = [
  {
    emoji: "🌙",
    title: "Night spikes were my biggest problem",
    body: "Even eating the same meal, my glucose spiked much more at dinner than at lunch. My sedentary office work during the day seemed to blunt the lunch spike. Dinner = danger zone.",
  },
  {
    emoji: "🧀",
    title: "80g paneer reduced my dinner spike by ~20%",
    body: "Adding a serving of paneer (cottage cheese) to my dinner meaningfully flattened the glucose curve. Protein slows gastric emptying, giving your body more time to handle carbs.",
  },
  {
    emoji: "🥚",
    title: "2 boiled eggs or an omelette kept glucose nearly flat",
    body: "Eggs were the single most effective food change I made. With eggs in the meal, my spike stayed within 10–20% of baseline. No drama.",
  },
  {
    emoji: "🍚",
    title: "Wheat roti and rice cause similar spikes",
    body: "I tested both carefully. Surprise: white rice and wheat roti produced nearly identical glucose responses for me. Neither was clearly 'safe'.",
  },
  {
    emoji: "🌾",
    title: "Multigrain roti was a disappointment",
    body: "My blend was 50% wheat, 10% jowar, 20% besan, 20% ragi — and the glucose spike was almost identical to plain wheat roti. Context matters more than the flour.",
  },
  {
    emoji: "🍋",
    title: "Apple Cider Vinegar (ACV) does wonders",
    body: "Having ACV (with or without lemon juice) before or during a meal produced a noticeably lower spike. The acetic acid slows starch digestion. This is one of the most evidence-backed food hacks.",
  },
  {
    emoji: "🥗",
    title: "Salad with lemon juice blunted spikes",
    body: "Cucumber with lemon juice and salt before or during a meal reduced my post-meal spike. The lemon's acidity seems to slow glucose absorption. Add lemon to your meals.",
  },
  {
    emoji: "☕",
    title: "Tea does spike glucose — but less if you're active",
    body: "2–4 cups of tea per day did cause small spikes, but they were noticeably less when I was doing something physical vs sitting still. Stay moving.",
  },
  {
    emoji: "🚶",
    title: "20 min post-dinner walk: didn't help much for me",
    body: "Walking after dinner is commonly recommended, but in my personal CGM data it didn't make a significant difference. Your mileage may vary.",
  },
  {
    emoji: "🍕",
    title: "Cheese burst pizza: surprisingly low spike",
    body: "The fat in the cheese slows digestion significantly. High fat meals can sometimes produce lower immediate spikes, though they can cause prolonged elevation.",
  },
  {
    emoji: "🍱",
    title: "Stale rice and roti from the fridge spike less",
    body: "Cooling cooked carbs overnight converts some starch to resistant starch, which your body can't digest as rapidly. Leftover rice is literally healthier.",
  },
  {
    emoji: "🧠",
    title: "Context is everything — same food, different response",
    body: "Stress, sleep quality, time of day, activity level — all of these changed how my body responded to the exact same meal. A CGM teaches you this viscerally.",
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
    a: "No. Glucose response is highly individual — genetics, gut microbiome, activity level, stress, and sleep all play a role. A CGM is valuable precisely because it shows YOUR personal response, not an average.",
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
        const lines = text.trim().split("\n").slice(1); // skip header
        const parsed: GlucosePoint[] = [];
        lines.forEach((line, i) => {
          if (i % 5 !== 0) return; // sample every 5th row (~420 points)
          const [timestamp, glucoseStr] = line.split(",");
          const value = parseInt(glucoseStr, 10);
          if (!timestamp || isNaN(value) || value < 20) return; // filter out sensor errors (value=18)
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

  // Compute tick positions: one per day
  const dayTicks: number[] = [];
  const seenDays = new Set<string>();
  data.forEach((d) => {
    const day = new Date(d.ts).toDateString();
    if (!seenDays.has(day)) {
      seenDays.add(day);
      dayTicks.push(d.ts);
    }
  });

  const formatTick = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

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
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {/* Green safe zone */}
          <ReferenceArea y1={70} y2={140} fill="#dcfce7" fillOpacity={0.4} />
          {/* Low threshold */}
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 3" label={{ value: "Low 70", position: "insideTopLeft", fontSize: 11, fill: "#ef4444" }} />
          {/* High threshold */}
          <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "High 140", position: "insideTopLeft", fontSize: 11, fill: "#f59e0b" }} />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={dayTicks}
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            scale="time"
          />
          <YAxis
            domain={[50, 200]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}`}
            width={36}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GlucosePoint;
              const val = d.value;
              const color = val > 140 ? "#f59e0b" : val < 70 ? "#ef4444" : "#16a34a";
              return (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                  <p className="text-gray-500 mb-1">{d.label}</p>
                  <p className="font-bold" style={{ color }}>{val} mg/dL</p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" /> Safe zone (70–140 mg/dL)</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-yellow-400 inline-block border-dashed" /> High threshold (140)</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-red-400 inline-block" /> Low threshold (70)</span>
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
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
          {a}
        </div>
      )}
    </div>
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center pb-10"
          >
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
              A borderline pre-diabetic's real data — reports, continuous glucose readings, and the 12 things I learned about my own body.
            </p>
            <div className="flex items-center justify-center gap-3 text-white/40 text-sm">
              <span>By Anurag Singh</span>
              <span>·</span>
              <span>10 min read</span>
              <span>·</span>
              <span>Oct 2025</span>
            </div>
          </motion.div>

          {/* HbA1C journey bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 mb-0"
          >
            {hba1cJourney.map((item, i) => (
              <div key={i} className="flex-1 bg-gray-900 px-4 py-5 text-center border-r border-white/10 last:border-0">
                <div className="text-3xl font-black text-white mb-1">{item.value}%</div>
                <div className="text-white/50 text-xs mb-1">{item.date}</div>
                <div className={`text-xs font-semibold ${item.color === "text-yellow-600" ? "text-yellow-400" : item.color === "text-blue-600" ? "text-blue-400" : "text-green-400"}`}>
                  {item.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* ── Intro ── */}
          <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
            In March 2024, a routine blood test came back with HbA1C of <strong>6.1%</strong> — right at the border of pre-diabetes. I wasn't on any medication, but the number was a warning. Instead of ignoring it, I decided to understand my body better. What followed was 18 months of data, experimentation, and some genuinely surprising discoveries about Indian food and blood sugar.
          </p>
          <p className="text-gray-700 leading-relaxed mb-12">
            By October 2025, my HbA1C had dropped to <strong>5.2%</strong> — solidly in the normal range. Here is everything I did, with the actual lab reports and continuous glucose data to back it up.
          </p>

          {/* ── Section 1: The Reports ── */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-green-600" />
            </span>
            The Lab Reports
          </h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Three blood tests over ~18 months tell the whole story. Here are the actual reports:
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { file: "3_11_2024.png", date: "3 Nov 2024", hba1c: "6.1%", status: "Pre-diabetic range", statusColor: "text-yellow-700 bg-yellow-50 border-yellow-200" },
              { file: "7_9_2025.png", date: "9 Jul 2025", hba1c: "5.9%", status: "Improving", statusColor: "text-blue-700 bg-blue-50 border-blue-200" },
              { file: "10_10_2025.png", date: "10 Oct 2025", hba1c: "5.2%", status: "Normal range", statusColor: "text-green-700 bg-green-50 border-green-200" },
            ].map((report) => (
              <div key={report.file} className="flex flex-col rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-primary" />
            </span>
            The Tool That Changed Everything: A CGM
          </h2>
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
                A 14-day CGM sensor that sits on your upper arm. No finger pricks. Just scan or glance at your phone to see your real-time glucose curve. The purchase receipt above is from PharmEasy — it's available at most major Indian pharmacies.
              </p>
              <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                <li>14 days of continuous data per sensor</li>
                <li>Syncs via Gurucose app (exports to CSV)</li>
                <li>Available without prescription</li>
                <li>No blood draw — reads interstitial fluid</li>
              </ul>
            </div>
          </div>

          {/* ── Section 3: 14-Day Glucose Graph ── */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-indigo-600" />
            </span>
            14 Days of Real Glucose Data
          </h2>
          <p className="text-gray-600 mb-3 leading-relaxed">
            Below is my continuous glucose profile across the 14-day sensor window (Jul 28 – Aug 12, 2025). Each spike is a meal. The overnight rises — especially in the first few days — clearly show the problem: <strong>my body struggled most at night</strong>.
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
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
            </span>
            12 Things I Learned About My Body
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Two weeks of CGM data is more educational than years of guessing. Here's what the data showed me — some expected, some genuinely surprising.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {learnings.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-primary/20 hover:shadow-sm transition-all"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
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
                <Heart className="w-5 h-5 text-green-400" />
                My Simple Formula
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: "🍋", title: "Add acid to every meal", body: "Lemon juice, ACV, or salad with lemon. This alone can reduce your spike by 20–30%. Add it to dal, raita, or as a side." },
                  { icon: "🥚", title: "Always add a protein source", body: "Eggs, paneer, dal, tofu — pick one. Protein slows carb absorption and keeps you fuller longer. Non-negotiable." },
                  { icon: "🫒", title: "A small amount of fat helps", body: "Fat slows gastric emptying. A little ghee on roti or cheese in a meal smooths the glucose curve." },
                ].map((tip) => (
                  <div key={tip.title} className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <div className="text-3xl mb-3">{tip.icon}</div>
                    <p className="font-bold text-white text-sm mb-2">{tip.title}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{tip.body}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm mt-6 leading-relaxed">
                Eat your rice and roti — but pair every meal with <strong className="text-white/80">acid + protein + a little fat</strong>. That combination is what actually moved the needle for me.
              </p>
            </div>
          </div>

          {/* ── Section 6: How I'd help family ── */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-blue-600" />
            </span>
            How I'd Approach This for a Family Member
          </h2>
          <p className="text-gray-600 mb-4 leading-relaxed">
            If someone in my family had elevated HbA1C, here's exactly what I'd do:
          </p>
          <ol className="space-y-3 mb-12">
            {[
              { step: "1", text: "Buy a CGM sensor (FreeStyle LibreSensor from PharmEasy). 14 days of data is worth more than any nutrition advice." },
              { step: "2", text: "Track their existing diet for 7 days without changing anything. Understand the baseline — which meals cause the worst spikes for them specifically." },
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
                <li>Results are highly individual — your body may respond differently to the same foods.</li>
                <li><strong>If you are on insulin or diabetes medication</strong>, do not change your diet without consulting your doctor. Dietary changes can cause dangerous hypoglycaemia.</li>
                <li>Pre-diabetes is a spectrum. My case was mild (borderline). More advanced diabetes requires professional management.</li>
                <li>Think of this as a starting point for your own investigation — not a prescription.</li>
              </ul>
            </div>
          </div>

          {/* ── FAQ ── */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4 h-4 text-gray-600" />
            </span>
            Questions People Ask
          </h2>
          <div className="space-y-3 mb-16">
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
                Protein &amp; blood sugar — the science
              </h3>
              <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                Want to understand <em>why</em> protein flattens glucose spikes? We broke down the research.
              </p>
              <Link
                href="/blog/protein-for-diabetes"
                className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors text-sm cursor-pointer shadow-lg shadow-primary/25"
              >
                Read the Article <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}
