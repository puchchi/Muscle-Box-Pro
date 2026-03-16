"use client";
import Navbar from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CheckCircle2, Activity, Heart, ShieldAlert } from "lucide-react";

function MiniFooter() {
  return (
    <footer className="bg-black py-12 border-t border-white/10 mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h4 className="text-white font-display font-bold text-xl mb-6">Read More from Our Blog</h4>
        <div className="flex flex-col sm:flex-row justify-center gap-6 text-gray-400">
          <Link href="/blog/why-gyms-need-vending-machines" className="hover:text-primary transition-colors">
            Why Every Gym Should Install a Protein Shake Vending Machine
          </Link>
          <span className="hidden sm:inline text-gray-600">•</span>
          <Link href="/blog/best-protein-shake-after-workout" className="hover:text-primary transition-colors">
            The Best Protein Shake After a Workout: Whey vs. Plant
          </Link>
        </div>
        <p className="text-gray-600 text-xs mt-10 uppercase tracking-widest">
          © 2026 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}

export default function BlogProteinDiabetes() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-0">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Article Header */}
          <header className="text-center mb-12">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
              HEALTH & NUTRITION
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
              Why Protein Is Important for <span className="text-primary">Diabetes Management</span>
            </h1>
            <div className="flex items-center justify-center gap-4 text-gray-400 text-sm">
              <span>By Nutrition Science Team</span>
              <span>•</span>
              <span>7 min read</span>
            </div>
          </header>

          {/* Featured Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-video mb-16 border border-white/10 shadow-2xl shadow-primary/5">
            <img 
              src={"/assets/blog_diabetes_protein.png"} 
              alt="Healthy protein sources for diabetes management" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-white pb-16">
            <p className="lead text-xl text-gray-300">
              Diabetes is one of the fastest-growing health conditions worldwide. Managing blood sugar levels requires careful attention to diet, especially the balance of carbohydrates, fats, and protein. Research shows that adequate protein intake can help stabilize blood sugar, support muscle health, and improve overall metabolic control in people with diabetes.
            </p>

            <h2 className="text-3xl mt-12 mb-6 flex items-center gap-3">
              <Activity className="text-primary" /> 1. How Protein Affects Blood Sugar
            </h2>
            <p className="text-gray-400">
              Unlike carbohydrates, protein has a minimal direct effect on your blood glucose levels. However, when consumed as part of a meal, protein slows digestion, which reduces glucose spikes and increases satiety. Evidence suggests that protein can help improve glycemic control and support lean body mass in people with diabetes.
            </p>

            <div className="bg-card/30 border border-white/10 rounded-xl p-6 my-8 italic text-gray-300 border-l-4 border-l-primary">
            <p className="m-0">
                "According to research in the <a href="https://www.japi.org/article/japi-71-12-36" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Journal of the Association of Physicians of India</a>, protein can reduce the glycemic index of meals and help stabilize blood sugar."
              </p>
            </div>

            <h2 className="text-3xl mt-12 mb-6 flex items-center gap-3">
              <Heart className="text-red-500" /> 2. Benefits of Protein for People With Diabetes
            </h2>
            <p className="text-gray-400">
              Incorporating the right amount of protein into a diabetic diet offers multiple, scientifically-backed benefits:
            </p>
            <ul className="space-y-4 my-6 list-none pl-0">
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle2 className="text-primary w-6 h-6 shrink-0 mt-1" />
                <div>
                  <strong>Stabilizes blood sugar:</strong> Protein reduces the overall glycemic index of a meal when paired with carbohydrates.
                </div>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle2 className="text-primary w-6 h-6 shrink-0 mt-1" />
                <div>
                  <strong>Helps maintain muscle mass:</strong> More muscle mass naturally improves insulin sensitivity, making it easier for the body to process glucose.
                </div>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle2 className="text-primary w-6 h-6 shrink-0 mt-1" />
                <div>
                  <strong>Supports weight management:</strong> Protein increases satiety and aids weight loss. Weight loss significantly improves glucose control, particularly in type-2 diabetes.
                </div>
              </li>
            </ul>

            <h2 className="text-3xl mt-12 mb-6">3. Best Sources of Protein for Diabetes</h2>
            <p className="text-gray-400">
              Not all proteins are created equal. It's important to focus on healthy, lean sources to avoid excess saturated fats, which can negatively impact cardiovascular health.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6 my-8">
              <div className="bg-background/50 border border-white/10 p-6 rounded-xl">
                <h4 className="text-xl font-bold text-white mb-4">Plant Proteins</h4>
                <ul className="text-gray-400 space-y-2 m-0 pl-4">
                  <li>Lentils</li>
                  <li>Chickpeas</li>
                  <li>Tofu</li>
                  <li>Soy products</li>
                </ul>
              </div>
              <div className="bg-background/50 border border-white/10 p-6 rounded-xl">
                <h4 className="text-xl font-bold text-white mb-4">Lean Animal Proteins</h4>
                <ul className="text-gray-400 space-y-2 m-0 pl-4">
                  <li>Fish and seafood</li>
                  <li>Eggs</li>
                  <li>Chicken breast</li>
                  <li>Dairy (Greek yogurt, cottage cheese)</li>
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 italic mt-4">
              Note: Research published in the <a href="https://www.sciencedirect.com/science/article/pii/S0002916522031902" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">American Journal of Clinical Nutrition</a> indicates that plant protein may reduce diabetes risk more effectively than animal protein in some populations.
            </p>

            <h2 className="text-3xl mt-12 mb-6">4. Are Protein Shakes Safe for Diabetics?</h2>
            <p className="text-gray-400">
              Yes, low-sugar protein shakes can be a helpful and convenient addition to a diabetic diet. High-quality whey protein, in particular, may improve the body's insulin response. 
            </p>
            <p className="text-gray-400">
              In many modern gyms, fresh protein shakes are now available through automated <Link href="/gym-protein-shake-machine" className="text-primary hover:underline">protein shake vending machines</Link>, making it easier for people with diabetes to access balanced post-workout nutrition without the hidden sugars found in many commercial juice bars.
            </p>

            <h2 className="text-3xl mt-12 mb-6">5. How Much Protein Should Diabetics Eat?</h2>
            <p className="text-gray-400">
              According to findings published in <a href="https://www.mdpi.com/1422-0067/25/20/10959" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Frontiers in Nutrition / MDPI</a>, higher protein intake can improve glycemic control and muscle mass in adults with diabetes. 
            </p>
            <p className="text-gray-400">
              The typical recommendation is that protein should make up about <strong>20–30% of total daily calories</strong>, or roughly <strong>1.0–1.5 grams per kilogram of body weight</strong>. This range is commonly used in diabetes nutrition studies to achieve optimal metabolic control.
            </p>

            <h2 className="text-3xl mt-12 mb-6 flex items-center gap-3">
              <ShieldAlert className="text-amber-500" /> 6. Important Considerations
            </h2>
            <p className="text-gray-400">
              While protein is crucial, there are caveats. People with pre-existing <strong>kidney disease</strong> (diabetic nephropathy) may need to limit their protein intake to prevent further kidney damage. Always consult with a healthcare provider or registered dietitian.
            </p>
            <p className="text-gray-400">
              Furthermore, some studies show that excessive intake of highly processed animal proteins (like processed meats) may actually <em>increase</em> diabetes risk. Focus on clean, whole-food sources.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-display font-bold text-white mb-4">Conclusion</h2>
            <p className="text-gray-400">
              Protein plays an important role in managing diabetes by supporting stable blood sugar levels, maintaining muscle mass, and promoting healthy metabolism. When combined with balanced carbohydrates and regular physical activity, protein-rich foods can help people with diabetes maintain better long-term health.
            </p>
          </div>
        </article>
      </main>

      <MiniFooter />
    </div>
  );
}