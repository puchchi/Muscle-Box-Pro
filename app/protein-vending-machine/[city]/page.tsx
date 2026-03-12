import type { Metadata } from "next";
import ProteinVendingMachineIndia from "@/pages/ProtienVendingMachineIndia";

const cityConfig = {
  delhi: { name: "Delhi" },
  mumbai: { name: "Mumbai" },
  bangalore: { name: "Bangalore" },
  hyderabad: { name: "Hyderabad" },
  pune: { name: "Pune" },
  chennai: { name: "Chennai" },
  ahmedabad: { name: "Ahmedabad" },
  kolkata: { name: "Kolkata" },
  chandigarh: { name: "Chandigarh" },
  gurgaon: { name: "Gurgaon" },
  noida: { name: "Noida" },
} as const;

type CitySlug = keyof typeof cityConfig;

function getCityFromSlug(slug: string) {
  return cityConfig[slug as CitySlug] ?? null;
}

function cityFromParams(params: { city?: string } | undefined) {
  if (!params?.city) return null;
  return getCityFromSlug(params.city);
}

export function generateStaticParams() {
  return Object.keys(cityConfig).map((city) => ({ city }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  return params.then(({ city: citySlug }) => {
    const city = getCityFromSlug(citySlug);
  if (!city) {
    return {
      title: "Protein Vending Machine for Gyms | MuscleBoxPro",
    };
  }

  return {
    title: `Protein Vending Machine for Gyms in ${city.name} | MuscleBoxPro`,
    description: `Install a protein vending machine for gyms in ${city.name}. Serve fresh protein shakes automatically and create additional recurring revenue for your fitness center.`,
    alternates: {
      canonical: `/protein-vending-machine-${citySlug}`,
    },
    openGraph: {
      type: "website",
      url: `/protein-vending-machine-${citySlug}`,
      title: `Protein Vending Machine for Gyms in ${city.name} | MuscleBoxPro`,
      description: `Install a protein vending machine for gyms in ${city.name}. Serve fresh protein shakes automatically and create additional recurring revenue for your fitness center.`,
    },
  };
  });
}

export default async function ProteinVendingMachineCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const resolvedParams = await params;
  const city = cityFromParams(resolvedParams) ?? cityConfig.delhi;

  return <ProteinVendingMachineIndia cityName={city.name} />;
}
