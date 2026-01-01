import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Cpu, Wifi, Droplets, Layers, Maximize, Thermometer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import machineSpecsImg from '@/assets/futuristic_protein_shake_vending_machine_specs.png';

export default function MachineSpecs() {
  const specs = [
    {
      group: "Smart Core",
      items: [
        { icon: Cpu, label: "OS", value: "Android System & Smart Cloud Management" },
        { icon: Maximize, label: "Display", value: "27-inch HD Touch Screen Interface" },
        { icon: Wifi, label: "Connectivity", value: "WiFi & 4G High-Speed Mode" },
        { icon: Droplets, label: "Maintenance", value: "Automated Pipe Cleaning System" }
      ]
    },
    {
      group: "Mixing & Capacity",
      items: [
        { icon: Layers, label: "Flavors", value: "20+ Dynamic Mixed Drink Varieties" },
        { icon: Thermometer, label: "Stirring", value: "Independent Mechanical Stirring System" },
        { icon: Droplets, label: "Canisters", value: "7 Tall Canisters (28L Total Capacity)" },
        { icon: Layers, label: "Dispenser", value: "Auto Cup Dispenser (70pcs / 14oz)" }
      ]
    },
    {
      group: "Hardware & Precision",
      items: [
        { icon: ShieldCheck, label: "Build", value: "Industrial Carbon Steel Panel Material" },
        { icon: Thermometer, label: "Thermals", value: "Hot (1.8L) & Compressor Refrig (2L)" },
        { icon: Maximize, label: "Motion", value: "X/Y Two-Axis Motion Track Precision" },
        { icon: ShieldCheck, label: "Security", value: "Electromagnetic Automatic Door" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">ENGINEERING EXCELLENCE</Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 uppercase tracking-tighter">
              MACHINE <span className="text-primary">SPECIFICATIONS</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
              The ultimate high-performance vending solution designed for premium gym environments.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative aspect-[3/4] max-w-md mx-auto bg-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-primary/20 group"
            >
              <img 
                src={machineSpecsImg} 
                alt="Muscle Box Pro Technical View" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
              <div className="absolute bottom-8 left-8 z-20">
                <p className="text-white font-display text-3xl font-bold">SIZE: 76x60x180 CM</p>
                <p className="text-primary font-mono text-sm tracking-widest">W x D x H</p>
              </div>
            </motion.div>

            <div className="space-y-12">
              {specs.map((group, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <h3 className="text-primary font-mono text-sm tracking-[0.3em] uppercase mb-6">{group.group}</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {group.items.map((item, i) => (
                      <Card key={i} className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 flex items-start gap-4">
                          <item.icon className="w-5 h-5 text-primary mt-1 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                            <p className="text-white text-sm font-medium leading-tight">{item.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Technical Details Banner */}
          <div className="bg-primary/10 rounded-3xl p-8 border border-primary/20 grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-primary font-display text-4xl font-bold mb-1">28L</p>
              <p className="text-gray-400 text-xs uppercase tracking-widest">Total Canister Storage</p>
            </div>
            <div className="border-x border-primary/20">
              <p className="text-primary font-display text-4xl font-bold mb-1">14oz</p>
              <p className="text-gray-400 text-xs uppercase tracking-widest">Standard Cup Capacity</p>
            </div>
            <div>
              <p className="text-primary font-display text-4xl font-bold mb-1">MDB</p>
              <p className="text-gray-400 text-xs uppercase tracking-widest">Payment Protocol Installed</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
