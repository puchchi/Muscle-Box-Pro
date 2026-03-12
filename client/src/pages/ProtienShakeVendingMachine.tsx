import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, TrendingUp, Zap, Shield, Monitor } from "lucide-react";

export default function ProteinShakeVendingMachine() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">THE FUTURE OF GYM REVENUE</Badge>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
                            Start Your <span className="text-primary">Protein Shake Vending Machine</span> Business
                        </h1>
                        <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto">
                            Transform unused floor space into a passive income stream. Our fully automated, high-tech protein shake vending machines are designed for modern fitness centers, offering premium post-workout nutrition with zero staff required.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/gym-demo">
                                <Button size="lg" className="bg-primary text-background font-bold h-14 px-8 text-lg w-full sm:w-auto hover:bg-primary/90">
                                    REQUEST MACHINE DEMO
                                </Button>
                            </Link>
                            <Link href="/specs">
                                <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 h-14 px-8 text-lg w-full sm:w-auto">
                                    VIEW MACHINE SPECS
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Choose Section */}
            <section className="py-24 bg-card/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
                            Why Invest in a <span className="text-primary">Protein Vending Machine?</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Gym owners and entrepreneurs are upgrading from traditional juice bars to automated vending solutions to maximize ROI and minimize overhead.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: TrendingUp, title: "High ROI", desc: "Premium pricing for fresh, customized protein shakes leads to excellent profit margins." },
                            { icon: Zap, title: "Zero Staff Needed", desc: "Fully automated dispensing, payment, and self-cleaning mechanisms." },
                            { icon: Shield, title: "Turnkey Operation", desc: "We handle maintenance, restocking, and technical support. You collect the revenue." },
                            { icon: Monitor, title: "Dual Revenue", desc: "High-resolution displays allow brands to advertise directly to gym members, creating a second income stream." }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="bg-background/50 border border-white/10 p-6 rounded-2xl"
                            >
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-400">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEO Content Section */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-invert prose-lg">
                    <h2 className="font-display font-bold text-3xl text-white">How a Protein Shake Vending Machine Boosts Gym Revenue</h2>
                    <p className="text-gray-400">
                        For gym owners, providing on-site nutrition is a proven strategy to increase member retention and satisfaction. However, running a manned juice bar requires hiring staff, managing inventory, and dealing with significant overhead costs. A <strong>protein shake vending machine</strong> solves these problems by providing 24/7 access to premium supplements without any of the operational headaches.
                    </p>

                    <h3 className="font-display font-bold text-2xl text-white mt-12">The Ultimate Post-Workout Convenience</h3>
                    <p className="text-gray-400">
                        The anabolic window is critical for muscle recovery. By placing a protein vending machine directly on your gym floor, you offer members the ultimate convenience—a perfectly mixed, chilled protein shake within seconds of finishing their last set. Users can seamlessly pay using the MuscleBoxPro digital wallet, credit cards, or UPI.
                    </p>

                    <ul className="space-y-4 my-8 text-gray-400 list-none pl-0">
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
                            <span><strong>Cashless Payments:</strong> Integrated wallet system for frictionless purchases.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
                            <span><strong>Customizable Options:</strong> Pre-workout, BCAA, and Whey protein options.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
                            <span><strong>Smart Telemetry:</strong> Real-time inventory tracking and sales analytics.</span>
                        </li>
                    </ul>

                    <h3 className="font-display font-bold text-2xl text-white mt-12">More Than Just a Vending Machine</h3>
                    <p className="text-gray-400">
                        MuscleBoxPro protein shake vending machines include high-resolution displays that allow brands to advertise directly to gym members. This captive audience model means you aren't just selling shakes; you're monetizing screen real estate, turning your machine into a highly profitable digital billboard.
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-primary relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-background mb-6">
                        Ready to Upgrade Your Gym?
                    </h2>
                    <p className="text-background/80 text-xl mb-10 max-w-2xl mx-auto">
                        Join the network of modern fitness centers generating passive income with our smart vending solutions.
                    </p>
                    <Link href="/gym-demo">
                        <Button size="lg" className="bg-background text-primary font-bold h-14 px-10 text-lg hover:bg-background/90 shadow-2xl">
                            SECURE YOUR MACHINE TODAY
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Simple Footer for SEO Page */}
            <footer className="bg-black py-12 border-t border-white/10 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest">
                    © 2024 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
                </p>
            </footer>
        </div>
    );
}

function Badge({ children, className, variant }: any) {
    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${className}`}>
            {children}
        </span>
    );
}