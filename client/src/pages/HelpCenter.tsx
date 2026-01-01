import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { HelpCircle, Search, CreditCard, Droplets, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function HelpCenter() {
  const faqs = [
    {
      icon: CreditCard,
      question: "How do I add funds to my wallet?",
      answer: "Login to your account, click on 'Add Funds', select or enter an amount, and choose your preferred payment method (UPI, Card, or QR)."
    },
    {
      icon: Droplets,
      question: "Are the shakes freshly mixed?",
      answer: "Yes! Every shake is mixed on-demand using our independent mechanical stirring system to ensure perfect consistency and freshness."
    },
    {
      icon: User,
      question: "I'm a gym owner. How can I get a machine?",
      answer: "Visit our 'Gym Demo' page and fill out the request form. Our team will contact you to schedule a demo and discuss installation."
    },
    {
      icon: HelpCircle,
      question: "What if my shake doesn't dispense?",
      answer: "In the rare event of a technical issue, please use the 'Report Problem' button in your order history or contact our 24/7 support line."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 uppercase tracking-tighter">
              HELP <span className="text-primary">CENTER</span>
            </h1>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
              <Input className="bg-card border-white/10 pl-12 h-14 text-lg focus:border-primary" placeholder="Search for answers..." />
            </div>
          </motion.div>

          <div className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-white/10 bg-card rounded-2xl px-6 mb-4">
                  <AccordionTrigger className="hover:no-underline py-6">
                    <div className="flex items-center gap-4 text-left">
                      <faq.icon className="text-primary h-6 w-6 shrink-0" />
                      <span className="font-display text-xl uppercase tracking-wider">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-lg leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  );
}
