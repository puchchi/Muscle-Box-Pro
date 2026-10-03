import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { ShopHeader } from "./ShopHolding";
import { DRINKS_COPY, DRINKS_LIVE_COPY } from "./shopCopy";
import {
  CHIP,
  CHIP_LABEL,
  CONTAINER,
  GRADIENT_TEXT,
  MenuLink,
  PillLink,
  SectionHeader,
  SplitHero,
  StepCards,
} from "./shopUi";

export function DrinksHolding({ sn, live = false }: { sn: string | null; live?: boolean }) {
  const copy = live ? { ...DRINKS_COPY, ...DRINKS_LIVE_COPY } : DRINKS_COPY;
  const joinHref = sn ? `/join?sn=${encodeURIComponent(sn)}` : "/join";
  return (
    <div className="min-h-screen bg-background" data-testid="shop-drinks">
      <ShopHeader sn={sn} />
      <main>
        <SplitHero
          badge={copy.badge}
          titleLead={copy.titleLead}
          titleHighlight={copy.titleHighlight}
          lead={copy.lead}
          stats={copy.quickStats}
          image={{
            src: "/images/premium_dark_chocolate_shake.png",
            alt: "A MuscleBoxPro chocolate protein shake",
          }}
          actions={
            <>
              <PillLink href="#buy-today" primary>
                {copy.buyCta}
              </PillLink>
              <PillLink href="/menu">{copy.menuCta}</PillLink>
            </>
          }
          chips={
            <>
              <div className={`absolute -right-6 top-10 hidden px-5 py-4 lg:block ${CHIP}`}>
                <p className={`mb-1 ${CHIP_LABEL}`}>{copy.blendChip.label}</p>
                <p
                  className={`font-display font-black leading-none ${GRADIENT_TEXT}`}
                  style={{ fontSize: "2.4rem" }}
                >
                  {copy.blendChip.value}
                </p>
              </div>
              <a
                href="#have-a-code"
                className={`relative mx-4 -mt-14 flex items-start gap-3 p-5 transition-shadow hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:absolute lg:-left-12 lg:bottom-10 lg:m-0 lg:w-[320px] ${CHIP}`}
                data-testid="shop-code-card"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                  <KeyRound className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">
                    {copy.codeChip.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                    {copy.codeChip.body}
                  </span>
                </span>
              </a>
            </>
          }
        />

        <section id="buy-today" className="scroll-mt-16 bg-muted py-16 lg:py-20">
          <div className={CONTAINER}>
            <SectionHeader
              centered
              eyebrow={copy.stepsEyebrow}
              titleLead={copy.stepsTitleLead}
              titleHighlight={copy.stepsTitleHighlight}
              lead={copy.stepsLead}
            />
            <StepCards steps={copy.steps} />
          </div>
        </section>

        <section id="have-a-code" className="scroll-mt-16 py-16 lg:py-20">
          <div className={CONTAINER}>
            <SectionHeader
              eyebrow={copy.codeEyebrow}
              titleLead={copy.codeTitleLead}
              titleHighlight={copy.codeTitleHighlight}
              lead={copy.codeLead}
            />
            <StepCards steps={copy.codeSteps} />
            <MenuLink label={copy.menuLink} />
          </div>
        </section>

        <section className="bg-gradient-to-r from-accent to-primary-fill px-4 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className="mb-5 font-display font-black uppercase leading-none text-white text-balance"
              style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}
            >
              {copy.joinTitleLead} {copy.joinTitleHighlight}
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-lg leading-relaxed text-white/90">
              {copy.joinLead}
            </p>
            <Link
              href={joinHref}
              className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-white px-10 text-base font-semibold text-gray-900 shadow-xl transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-fill"
            >
              {copy.joinCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
