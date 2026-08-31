"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import PreferredSourceButton from "@/components/seo/PreferredSourceButton";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";

const posts = [
  {
    href: "/blog/why-gyms-need-vending-machines",
    tag: "Business",
    tagColor: "text-accent bg-accent/10",
    title: "Why Every Gym Should Install a Protein Shake Vending Machine",
    excerpt:
      "Protein shake vending machines are becoming the most profitable and member-retaining asset for modern gyms. Here's the data behind the trend.",
    readTime: "6 min read",
    date: "Jan 15, 2026",
    image: "/assets/machine/machine_gym_bg2.png",
    imageClass: "object-top",
    featured: true,
  },
  {
    href: "/blog/best-protein-shake-after-workout",
    tag: "Nutrition",
    tagColor: "text-primary bg-primary/10",
    title: "The Best Protein Shake After a Workout: Whey vs. Plant",
    excerpt:
      "The science behind post-workout protein timing. We compare whey and plant-based protein to help you find the perfect recovery drink.",
    readTime: "5 min read",
    date: "Jan 20, 2026",
    image: "/images/chocolate_banana_milk_protein_shake.png",
    featured: false,
  },
  {
    href: "/blog/protein-for-diabetes",
    tag: "Health",
    tagColor: "text-blue-600 bg-blue-50",
    title: "Why Protein Is Important for Diabetes Management",
    excerpt:
      "Adequate protein intake can stabilize blood sugar, preserve muscle mass, and improve long-term metabolic control in people with diabetes.",
    readTime: "7 min read",
    date: "Feb 1, 2026",
    image: "/images/pure_vanilla_protein_shake_in_glass.png",
    featured: false,
  },
  {
    href: "/blog/gym-member-retention",
    tag: "Retention",
    tagColor: "text-emerald-700 bg-emerald-50",
    title: "Gym Member Retention: The Role of On-Site Nutrition",
    excerpt:
      "50% of Indian gym members cancel within 90 days. Here's how on-site post-workout nutrition closes the habit loop and keeps members renewing.",
    readTime: "7 min read",
    date: "Mar 25, 2026",
    image: "/assets/machine/machine_gym_bg2.png",
    imageClass: "object-top",
    featured: false,
  },
  {
    href: "/blog/how-i-fixed-my-hba1c",
    tag: "Personal Story",
    tagColor: "text-green-700 bg-green-50",
    title: "How I Dropped My HbA1C from 6.1 to 5.2: A Real Data Story",
    excerpt:
      "Real lab reports, 14 days of CGM glucose data, and 12 dietary findings from a borderline pre-diabetic who reversed it without medication.",
    readTime: "10 min read",
    date: "Oct 15, 2025",
    image: "/assets/fix_hba1c/10_10_2025.png",
    featured: false,
  },
];

const featuredPost = posts[0];
const remainingPosts = posts.slice(1);

export default function Blog() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="hero-rise">
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Insights
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
            >
              The{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                MuscleBoxPro
              </span>{" "}
              Blog
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-xl mx-auto">
              Nutrition science, gym business insights, and fitness technology, straight from our team.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* ── Featured Post ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-5 block">
              Featured
            </span>
            <Link
              href={featuredPost.href}
              className="group bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col lg:flex-row cursor-pointer"
            >
              <div className="relative lg:w-1/2 aspect-video lg:aspect-auto overflow-hidden bg-gray-100">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  priority
                  className={`object-cover group-hover:scale-[1.02] transition-transform duration-500 ${featuredPost.imageClass ?? ""}`}
                />
              </div>
              <div className="lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${featuredPost.tagColor}`}>
                    <Tag className="w-3 h-3" />
                    {featuredPost.tag}
                  </span>
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {featuredPost.readTime}
                  </span>
                </div>
                <h2 className="font-display font-black text-gray-900 uppercase leading-tight mb-3"
                  style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.75rem)" }}
                >
                  {featuredPost.title}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{featuredPost.date}</span>
                  <span className="inline-flex items-center gap-1.5 text-primary text-sm font-bold group-hover:gap-2.5 transition-all duration-200">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ── Remaining Posts Grid ── */}
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-gray-400 uppercase mb-5 block">
              More Articles
            </span>
            <div className="grid sm:grid-cols-2 gap-6">
              {remainingPosts.map((post, i) => (
                <motion.div
                  key={post.href}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    href={post.href}
                    className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col h-full cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        sizes="(min-width: 640px) 456px, 100vw"
                        className={`object-cover group-hover:scale-[1.03] transition-transform duration-500 ${post.imageClass ?? ""}`}
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${post.tagColor}`}>
                          <Tag className="w-3 h-3" />
                          {post.tag}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </span>
                      </div>
                      <h2 className="font-display font-black text-gray-900 uppercase leading-tight text-base mb-2">
                        {post.title}
                      </h2>
                      <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-gray-400 text-xs">{post.date}</span>
                        <span className="inline-flex items-center gap-1 text-primary text-xs font-bold group-hover:gap-2 transition-all duration-200">
                          Read <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── CTA Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 bg-gray-900 rounded-3xl p-10 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <h3
                className="font-display font-black text-white uppercase leading-none mb-3"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}
              >
                Ready to fuel your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  gym?
                </span>
              </h3>
              <p className="text-white/50 text-sm mb-7 max-w-sm mx-auto">
                Install a MuscleBoxPro machine and start earning passive revenue from day one.
              </p>
              <Link
                href="/gym-demo"
                className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors text-sm cursor-pointer shadow-lg shadow-primary/25"
              >
                Request a Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          <PreferredSourceButton className="mt-8" />

        </div>
      </main>

      <Footer />
    </div>
  );
}
