import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CupSoda,
  Infinity as NoExpiry,
  KeyRound,
  Mail,
  Pointer,
  QrCode,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

export const CARD =
  "rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";

export const EYEBROW =
  "mb-3 block text-xs font-bold uppercase tracking-[0.25em] text-primary-ink";

export const H2 = "font-display font-black uppercase leading-none text-foreground";
export const H2_SIZE = { fontSize: "clamp(2rem, 4.5vw, 3.5rem)" };

export const GRADIENT_TEXT =
  "bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent";

export const CHIP = "rounded-2xl border border-gray-100 bg-white shadow-xl";
export const CHIP_LABEL = "text-[10px] uppercase tracking-[0.25em] text-muted-foreground";

export const ICONS: Record<string, LucideIcon> = {
  phone: Smartphone,
  expiry: NoExpiry,
  email: Mail,
  tap: Pointer,
  qr: QrCode,
  cup: CupSoda,
  code: KeyRound,
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function PillLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
}) {
  const look = primary
    ? "bg-primary-fill text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-fill/90"
    : "border border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-100";
  const className = `inline-flex h-14 cursor-pointer items-center gap-2 rounded-full px-8 text-base font-semibold transition-colors ${look} ${FOCUS}`;
  return href.startsWith("#") ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SplitHero({
  badge,
  titleLead,
  titleHighlight,
  lead,
  actions,
  stats,
  image,
  chips,
}: {
  badge: string;
  titleLead: string;
  titleHighlight: string;
  lead: string;
  actions: ReactNode;
  stats: { val: string; label: string }[];
  image: { src: string; alt: string };
  chips: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gray-50 lg:block" />
      <div
        className={`relative grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16 lg:py-16 ${CONTAINER}`}
      >
        <div className="hero-rise">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary-ink">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {badge}
          </span>
          <h1
            className="mb-6 font-display font-black uppercase leading-[0.88] text-foreground"
            style={{ fontSize: "clamp(2.75rem, 5vw, 4.25rem)" }}
          >
            {titleLead} <br />
            <span className={GRADIENT_TEXT}>{titleHighlight}</span>
          </h1>
          <p className="mb-8 max-w-md text-lg leading-relaxed text-muted-foreground">
            {lead}
          </p>
          <div className="flex flex-wrap gap-3">{actions}</div>
          <dl className="mt-12 flex gap-8">
            {stats.map((item) => (
              <div key={item.label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="font-display text-base font-bold text-foreground">
                  {item.val}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero-rise relative">
          <div className="relative aspect-square overflow-hidden rounded-2xl shadow-2xl shadow-gray-300/60 ring-1 ring-black/5">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(min-width: 1024px) 440px, 100vw"
              className="object-cover"
            />
          </div>
          {chips}
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  titleLead,
  titleHighlight,
  lead,
  centered,
}: {
  eyebrow: string;
  titleLead: string;
  titleHighlight: string;
  lead: string;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <div className="mb-12 text-center">
        <span className={EYEBROW}>{eyebrow}</span>
        <h2 className={`mb-5 ${H2}`} style={H2_SIZE}>
          {titleLead}
          <br />
          <span className={GRADIENT_TEXT}>{titleHighlight}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
          {lead}
        </p>
      </div>
    );
  }
  return (
    <div className="mb-12 grid items-end gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        <span className={EYEBROW}>{eyebrow}</span>
        <h2 className={H2} style={H2_SIZE}>
          {titleLead}
          <br />
          <span className={GRADIENT_TEXT}>{titleHighlight}</span>
        </h2>
      </div>
      <p className="text-base leading-relaxed text-muted-foreground text-balance lg:text-right">
        {lead}
      </p>
    </div>
  );
}

export function StepCards({
  steps,
}: {
  steps: { icon: string; title: string; body: string }[];
}) {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {steps.map((step, i) => {
        const Icon = ICONS[step.icon]!;
        return (
          <li key={step.title} className={`relative p-7 ${CARD}`}>
            <span
              className="absolute right-6 top-6 select-none font-display text-[3rem] font-black leading-none text-gray-100"
              aria-hidden
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8">
              <Icon className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <p className="mb-2 text-lg font-bold text-gray-900">{step.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function MenuLink({ label }: { label: string }) {
  return (
    <div className="mt-12 text-center">
      <PillLink href="/menu">
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </PillLink>
    </div>
  );
}
