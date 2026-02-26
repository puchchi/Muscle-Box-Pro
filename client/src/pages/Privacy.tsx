import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, add funds to your wallet, or contact us for support. This may include your name, email address, phone number, and gym affiliation."
    },
    {
      title: "2. How We Use Your Information",
      content: "We use the information we collect to provide, maintain, and improve our services, including processing transactions, sending technical notices, and responding to your comments and questions."
    },
    {
      title: "3. Data Security",
      content: "We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction."
    },
    {
      title: "4. Sharing of Information",
      content: "We do not share your personal information with third parties except as described in this policy, such as with your consent or to comply with legal obligations."
    },
    {
      title: "5. Your Choices",
      content: "You may update or correct your account information at any time by logging into your account or contacting us. You can also opt out of receiving promotional communications from us."
    },
    {
      title: "6. Changes to This Policy",
      content: "We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy."
    }
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
            PRIVACY <span className="text-white">POLICY</span>
          </h1>
          <p className="text-gray-400 mb-12 italic">Last Updated: February 26, 2026</p>

          <div className="space-y-12">
            {sections.map((section, index) => (
              <section key={index} className="border-l-2 border-primary/30 pl-6">
                <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">
                  {section.title}
                </h2>
                <p className="text-gray-400 leading-relaxed">
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-20 p-8 bg-secondary rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-4">Privacy Concerns?</h3>
            <p className="text-gray-400 mb-6">
              If you have any questions or concerns about our privacy practices, please contact our data protection team.
            </p>
            <a 
              href="mailto:privacy@muscleboxpro.com" 
              className="inline-block bg-primary text-background font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors"
            >
              CONTACT PRIVACY TEAM
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
