import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import pureWheyImg from "@assets/generated_images/pure_vanilla_protein_shake_in_glass.png";
import chocolateBananaImg from "@assets/generated_images/chocolate_banana_protein_shake.png";
import premiumDateImg from "@assets/generated_images/premium_date_banana_shake.png";
import creamyVanillaImg from "@assets/generated_images/creamy_milk_based_vanilla_shake.png";
import darkChocolateImg from "@assets/generated_images/premium_dark_chocolate_shake.png";
import tropicalBananaImg from "@assets/generated_images/fresh_tropical_banana_shake.png";

const shakeVariants = [
  {
    id: 1,
    name: "Pure Whey",
    category: "Classic",
    ingredients: ["Protein Isolate", "Water"],
    protein: 30,
    carbs: 2,
    fat: 1,
    calories: 130,
    price: 4.50,
    color: "from-blue-500 to-cyan-500",
    image: pureWheyImg,
  },
  {
    id: 2,
    name: "Banana Blend",
    category: "Popular",
    ingredients: ["Protein Isolate", "Fresh Banana", "Water"],
    protein: 28,
    carbs: 35,
    fat: 1,
    calories: 270,
    price: 5.00,
    color: "from-yellow-500 to-orange-500",
    badge: "BESTSELLER",
    image: tropicalBananaImg,
  },
  {
    id: 3,
    name: "Date Delight",
    category: "Premium",
    ingredients: ["Protein Isolate", "Fresh Banana", "Medjool Dates", "Water"],
    protein: 28,
    carbs: 48,
    fat: 2,
    calories: 360,
    price: 5.50,
    color: "from-amber-600 to-red-600",
    badge: "PREMIUM",
    image: premiumDateImg,
  },
  {
    id: 4,
    name: "Chocolate Pure",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Water"],
    protein: 30,
    carbs: 3,
    fat: 1,
    calories: 140,
    price: 4.75,
    color: "from-amber-900 to-orange-700",
    image: darkChocolateImg,
  },
  {
    id: 5,
    name: "Chocolate Banana",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Water"],
    protein: 28,
    carbs: 36,
    fat: 1,
    calories: 280,
    price: 5.25,
    color: "from-amber-800 to-amber-600",
    image: chocolateBananaImg,
  },
  {
    id: 6,
    name: "Chocolate Date",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Medjool Dates", "Water"],
    protein: 28,
    carbs: 50,
    fat: 2,
    calories: 370,
    price: 5.75,
    color: "from-amber-900 to-orange-900",
    image: darkChocolateImg,
  },
  {
    id: 7,
    name: "Creamy Whey",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Whole Milk"],
    protein: 30,
    carbs: 11,
    fat: 8,
    calories: 240,
    price: 5.50,
    color: "from-purple-400 to-pink-400",
    image: creamyVanillaImg,
  },
  {
    id: 8,
    name: "Creamy Banana",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Fresh Banana", "Whole Milk"],
    protein: 28,
    carbs: 44,
    fat: 8,
    calories: 380,
    price: 6.00,
    color: "from-purple-500 to-pink-500",
    image: chocolateBananaImg,
  },
  {
    id: 9,
    name: "Creamy Date",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Fresh Banana", "Medjool Dates", "Whole Milk"],
    protein: 28,
    carbs: 57,
    fat: 8,
    calories: 470,
    price: 6.50,
    color: "from-purple-600 to-pink-600",
    image: premiumDateImg,
  },
  {
    id: 10,
    name: "Chocolate Creamy",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Whole Milk"],
    protein: 30,
    carbs: 12,
    fat: 8,
    calories: 250,
    price: 5.75,
    color: "from-purple-900 to-pink-900",
    image: darkChocolateImg,
  },
  {
    id: 11,
    name: "Chocolate Creamy Banana",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Whole Milk"],
    protein: 28,
    carbs: 45,
    fat: 8,
    calories: 390,
    price: 6.25,
    color: "from-purple-950 to-pink-950",
    image: chocolateBananaImg,
  },
  {
    id: 12,
    name: "Chocolate Creamy Date",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Medjool Dates", "Whole Milk"],
    protein: 28,
    carbs: 58,
    fat: 8,
    calories: 480,
    price: 6.75,
    color: "from-red-900 to-orange-900",
    image: darkChocolateImg,
  },
];

export default function ShakeVariants() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            THE MENU
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Twelve scientifically-formulated blends. Choose your protein, your base, and your flavor.
          </p>
        </motion.div>

        {/* Filter by Category */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {["Classic", "Popular", "Premium", "Flavor", "Milk-Based"].map((cat) => (
            <Badge key={cat} variant="outline" className="px-4 py-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer">
              {cat.toUpperCase()}
            </Badge>
          ))}
        </div>

        {/* Shake Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shakeVariants.map((shake, i) => (
            <motion.div
              key={shake.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Card className="relative overflow-hidden bg-card border-white/10 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group">
                {/* Product Image */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-white/5 to-white/10">
                  <img
                    src={shake.image}
                    alt={shake.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>

                {/* Gradient Background */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${shake.color} opacity-0 group-hover:opacity-10 rounded-full -mr-16 -mt-16 transition-opacity duration-500`} />

                <div className="relative p-6 z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-primary font-mono uppercase tracking-wider mb-1">{shake.category}</p>
                      <h3 className="text-xl font-display font-bold text-white">{shake.name}</h3>
                    </div>
                    {shake.badge && (
                      <Badge className="bg-primary text-background text-xs font-bold">{shake.badge}</Badge>
                    )}
                  </div>

                  {/* Ingredients */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 font-mono uppercase mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                      {shake.ingredients.map((ing) => (
                        <span key={ing} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-2 mb-4 py-4 border-y border-white/10">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">PROTEIN</p>
                      <p className="font-mono font-bold text-white text-sm">{shake.protein}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">CARBS</p>
                      <p className="font-mono font-bold text-white text-sm">{shake.carbs}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">FAT</p>
                      <p className="font-mono font-bold text-white text-sm">{shake.fat}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">KCAL</p>
                      <p className="font-mono font-bold text-white text-sm">{shake.calories}</p>
                    </div>
                  </div>

                  {/* Price Only */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-2xl font-display font-bold text-primary">${shake.price.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 font-mono">Per serving</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-20 p-12 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl text-center"
        >
          <h3 className="text-3xl font-display font-bold text-white mb-4">Custom Blends Available</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Want a combination not listed? Our machines support unlimited customization. Ask your gym staff or franchise owner about custom blend options.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
