import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { ShopHeader } from "./ShopHolding";
import { DRINKS_COPY } from "./shopCopy";
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

export function DrinksHolding({ sn }: { sn: string | null }) {
  const joinHref = sn ? `/join?sn=${encodeURIComponent(sn)}` : "/join";
  return (
    <div className="min-h-screen bg-background" data-testid="shop-drinks">
      <ShopHeader sn={sn} />
      <main>
        <SplitHero
          badge={DRINKS_COPY.badge}
          titleLead={DRINKS_COPY.titleLead}
          titleHighlight={DRINKS_COPY.titleHighlight}
          lead={DRINKS_COPY.lead}
          stats={DRINKS_COPY.quickStats}
          image={{
            src: "/images/premium_dark_chocolate_shake.png",
            alt: "A MuscleBoxPro chocolate protein shake",
          }}
          actions={
            <>
              <PillLink href="#buy-today" primary>
                {DRINKS_COPY.buyCta}
              </PillLink>
              <PillLink href="/menu">{DRINKS_COPY.menuCta}</PillLink>
            </>
          }
          chips={
            <>
              <div className={`absolute -right-6 top-10 hidden px-5 py-4 lg:block ${CHIP}`}>
                <p className={`mb-1 ${CHIP_LABEL}`}>{DRINKS_COPY.blendChip.label}</p>
                <p
                  className={`font-display font-black leading-none ${GRADIENT_TEXT}`}
                  style={{ fontSize: "2.4rem" }}
                >
                  {DRINKS_COPY.blendChip.value}
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
                    {DRINKS_COPY.codeChip.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                    {DRINKS_COPY.codeChip.body}
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
              eyebrow={DRINKS_COPY.stepsEyebrow}
              titleLead={DRINKS_COPY.stepsTitleLead}
              titleHighlight={DRINKS_COPY.stepsTitleHighlight}
              lead={DRINKS_COPY.stepsLead}
            />
            <StepCards steps={DRINKS_COPY.steps} />
          </div>
        </section>

        <section id="have-a-code" className="scroll-mt-16 py-16 lg:py-20">
          <div className={CONTAINER}>
            <SectionHeader
              eyebrow={DRINKS_COPY.codeEyebrow}
              titleLead={DRINKS_COPY.codeTitleLead}
              titleHighlight={DRINKS_COPY.codeTitleHighlight}
              lead={DRINKS_COPY.codeLead}
            />
            <StepCards steps={DRINKS_COPY.codeSteps} />
            <MenuLink label={DRINKS_COPY.menuLink} />
          </div>
        </section>

        <section className="bg-gradient-to-r from-accent to-primary-fill px-4 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className="mb-5 font-display font-black uppercase leading-none text-white text-balance"
              style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}
            >
              {DRINKS_COPY.joinTitleLead} {DRINKS_COPY.joinTitleHighlight}
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-lg leading-relaxed text-white/90">
              {DRINKS_COPY.joinLead}
            </p>
            <Link
              href={joinHref}
              className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-white px-10 text-base font-semibold text-gray-900 shadow-xl transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-fill"
            >
              {DRINKS_COPY.joinCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
