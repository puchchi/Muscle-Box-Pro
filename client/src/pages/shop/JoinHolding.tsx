import { Gift } from "lucide-react";
import { ShopHeader } from "./ShopHolding";
import { JOIN_COPY } from "./shopCopy";
import {
  CARD,
  CHIP,
  CHIP_LABEL,
  CONTAINER,
  GRADIENT_TEXT,
  ICONS,
  MenuLink,
  PillLink,
  SectionHeader,
  SplitHero,
  StepCards,
} from "./shopUi";

const STAMPS = 10;

export function JoinHolding({ sn }: { sn: string | null }) {
  return (
    <div className="min-h-screen bg-background" data-testid="shop-join">
      <ShopHeader sn={sn} />
      <main>
        <SplitHero
          badge={JOIN_COPY.badge}
          titleLead={JOIN_COPY.titleLead}
          titleHighlight={JOIN_COPY.titleHighlight}
          lead={JOIN_COPY.lead}
          stats={JOIN_COPY.quickStats}
          image={{
            src: "/images/fresh_banana_date_protein_shake_advertising_shot.png",
            alt: "A MuscleBoxPro shake with banana and dates",
          }}
          actions={
            <>
              <PillLink href="/menu" primary>
                {JOIN_COPY.menuCta}
              </PillLink>
              <PillLink href="#buy-today">{JOIN_COPY.buyTodayCta}</PillLink>
            </>
          }
          chips={
            <>
              <div className={`absolute -right-6 top-10 hidden px-5 py-4 lg:block ${CHIP}`}>
                <p className={`mb-1 ${CHIP_LABEL}`}>{JOIN_COPY.expiryChip.label}</p>
                <p
                  className={`font-display font-black leading-none ${GRADIENT_TEXT}`}
                  style={{ fontSize: "2.4rem" }}
                >
                  {JOIN_COPY.expiryChip.value}
                </p>
              </div>
              <StampCard />
            </>
          }
        />
        <Benefits />
        <section id="buy-today" className="scroll-mt-16 py-16 lg:py-20">
          <div className={CONTAINER}>
            <SectionHeader
              centered
              eyebrow={JOIN_COPY.stepsEyebrow}
              titleLead={JOIN_COPY.stepsTitleLead}
              titleHighlight={JOIN_COPY.stepsTitleHighlight}
              lead={JOIN_COPY.stepsLead}
            />
            <StepCards steps={JOIN_COPY.steps} />
            <MenuLink label={JOIN_COPY.menuLink} />
          </div>
        </section>
      </main>
    </div>
  );
}

function StampCard() {
  return (
    <div
      className={`relative mx-4 -mt-14 p-5 lg:absolute lg:-left-12 lg:bottom-10 lg:m-0 lg:w-[340px] ${CHIP}`}
      data-testid="shop-stamp-card"
    >
      <p className={`mb-3 ${CHIP_LABEL}`}>{JOIN_COPY.card.label}</p>
      <div className="grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: STAMPS }, (_, i) =>
          i === STAMPS - 1 ? (
            <span
              key={i}
              className="flex aspect-square items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary-fill"
            >
              <Gift className="h-1/2 w-1/2 text-white" />
            </span>
          ) : (
            <span
              key={i}
              className="aspect-square rounded-full border-2 border-dashed border-gray-300"
            />
          ),
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {JOIN_COPY.card.body}
      </p>
    </div>
  );
}

function Benefits() {
  return (
    <section className="bg-muted py-16 lg:py-20">
      <div className={CONTAINER}>
        <SectionHeader
          eyebrow={JOIN_COPY.benefitsEyebrow}
          titleLead={JOIN_COPY.benefitsTitleLead}
          titleHighlight={JOIN_COPY.benefitsTitleHighlight}
          lead={JOIN_COPY.benefitsLead}
        />
        <ul className="grid gap-6 md:grid-cols-3" data-testid="join-benefits">
          {JOIN_COPY.benefits.map((benefit) => {
            const Icon = ICONS[benefit.icon]!;
            return (
              <li key={benefit.title} className={`group p-7 ${CARD}`}>
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 transition-colors duration-300 group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <h3 className="mb-2 font-display text-xl font-black uppercase tracking-wide text-foreground">
                  {benefit.title}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {benefit.body}
                </p>
                <div className="flex items-baseline gap-2 border-t border-gray-100 pt-5">
                  <span
                    className={`font-display font-black leading-none ${GRADIENT_TEXT}`}
                    style={{ fontSize: "1.75rem" }}
                  >
                    {benefit.stat}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {benefit.statLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
