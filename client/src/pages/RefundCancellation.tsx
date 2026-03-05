import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function RefundCancellationPolicy() {
  const sections = [
    {
      title: "1. Order Cancellation",
      content:
        "Orders placed through MuscleBoxPro vending machines are processed instantly and therefore cannot be cancelled once the preparation of the beverage has started.",
    },
    {
      title: "2. Eligible Refund Cases",
      content:
        "Refunds may be issued when payment is successfully deducted but the vending machine fails to dispense the product, when the beverage is only partially dispensed due to a machine malfunction, or when a technical error occurs during payment processing.",
    },
    {
      title: "3. Refund Request Window",
      content:
        "Users must report refund requests within 24 hours of the transaction through the customer support contact provided on the website.",
    },
    {
      title: "4. Verification Process",
      content:
        "Refund requests will be reviewed based on transaction records and machine logs.",
    },
    {
      title: "5. Refund Processing Timeline",
      content:
        "Approved refunds will be processed within 3–5 business days to the original payment method used during the transaction.",
    },
    {
      title: "6. Refund Decision Rights",
      content:
        "MuscleBoxPro reserves the right to decline refund requests where transaction records indicate successful dispensing of the product.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-8 text-primary">
            REFUND & <span className="text-white">CANCELLATION POLICY</span>
          </h1>
          <p className="text-gray-400 mb-12 italic">
            Last Updated: March 03, 2026
          </p>

          <div className="space-y-12">
            {sections.map((section, index) => (
              <section key={index} className="border-l-2 border-primary/30 pl-6">
                <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">
                  {section.title}
                </h2>
                <p className="text-gray-400 leading-relaxed">{section.content}</p>
              </section>
            ))}
          </div>

          <div className="mt-20 p-8 bg-secondary rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-4">Need refund support?</h3>
            <p className="text-gray-400 mb-6">
              For refund or cancellation assistance, please contact support at{" "}
              <span className="text-primary">contact@muscleboxpro.com</span>.
            </p>
            <a
              href="mailto:contact@muscleboxpro.com"
              className="inline-block bg-primary text-background font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors"
            >
              CONTACT SUPPORT
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
