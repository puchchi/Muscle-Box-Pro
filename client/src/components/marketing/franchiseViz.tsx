/**
 * The figures on /franchise that carry the commercials.
 *
 * The page publishes a lot of contract detail, and three of its facts are ratios and
 * amounts that a reader has to hold side by side to understand the model at all: what
 * share of each profit stream is theirs, how that changes at capital recovery, and how a
 * distribution that straddles the recovery threshold is split. Those read faster as marks
 * than as sentences, so they are drawn here and the prose around them is cut to what a
 * mark cannot say.
 *
 * Two constraints carry over from the page:
 *
 *   - **Every figure is a prop, sourced from @shared/franchise/program.** Nothing here
 *     hardcodes a percentage or a rupee amount.
 *   - **No mark implies a measurement.** These are arithmetic on published terms, not
 *     observations, so nothing carries `aria-valuenow` or a time axis.
 *
 * The fill colours are literal hex rather than theme tokens, which is the one deliberate
 * exception on the page. Chart fills have their own contrast gates that `--primary` and
 * `--accent` are not stepped for: a lightness band against the surface they sit on, and
 * a colour-vision separation between adjacent marks. These are the brand hues moved
 * to the nearest step that clears every gate against the surface each figure renders on,
 * verified rather than judged by eye:
 *
 *   on gray-950   #EF4B29 / #6B7280   CVD ΔE 23.9, both ≥ 3:1 on the surface
 *   on white      #C7280F → #F0674C   monotone lightness, light end 3.11:1
 *
 * A label sitting inside a fill takes ink or white by that fill's luminance, never by
 * which looks better: white on #EF4B29 is 3.6:1 and fails, near-black on it is 5.8:1.
 */

type Stream = {
  /** Group heading, e.g. "Protein business". */
  title: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rows: { label: string; yourSharePct: number }[];
};

/** Brand hues stepped for the surface each figure sits on. See the file comment. */
const FILL = {
  dark: { you: "#EF4B29", mbp: "#6B7280" },
  light: { recovery: "#C7280F", share: "#F0674C", mbp: "#6B7280" },
} as const;

/**
 * Ink for a label set inside a fill, chosen by the fill's luminance so it always clears
 * 4.5:1. The two dark-surface fills land on opposite sides of that line.
 */
const INK_ON = { [FILL.dark.you]: "#0B0B0B", [FILL.dark.mbp]: "#FFFFFF" } as const;

/**
 * Your share of each profit stream, before and after capital recovery.
 *
 * Part-to-whole bars rather than a share-over-time line: there is no time axis in the
 * program, only a threshold, and a line drawn left to right would imply one. Three bars
 * in one frame is also what makes the comparison the section is about visible at a
 * glance: protein steps down at recovery, advertising does not move.
 */
export function StreamSplitFigure({
  streams,
  milestone,
  note,
}: {
  streams: Stream[];
  /** Label for the hairline between a stream's before and after rows. */
  milestone: string;
  note: React.ReactNode;
}) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 mb-7">
        <h3 className="font-display font-black uppercase text-lg tracking-tight text-white">
          Your share of each stream
        </h3>
        {/*
          The legend is not optional decoration. The second segment carries no label of
          its own, so it is the only thing that says whose the rest of the bar is.
        */}
        <ul className="flex items-center gap-4">
          {[
            { fill: FILL.dark.you, label: "You" },
            { fill: FILL.dark.mbp, label: "MuscleBox Pro" },
          ].map((key) => (
            <li key={key.label} className="flex items-center gap-2 text-gray-300 text-[13px]">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: key.fill }}
                aria-hidden="true"
              />
              {key.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-7">
        {streams.map((stream) => (
          <div key={stream.title}>
            <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3.5">
              <stream.icon className="w-3.5 h-3.5" aria-hidden={true} />
              {stream.title}
            </h4>

            <dl className="space-y-3">
              {stream.rows.map((row, i) => (
                <div key={row.label}>
                  {/*
                    The threshold, drawn where it actually falls: between the two rows it
                    separates. Solid hairline rather than dashed. A dash on a chart reads
                    as a projection, and this is a stated term.
                  */}
                  {i > 0 && (
                    <p className="flex items-center gap-3 mb-3" aria-hidden="true">
                      <span className="h-px flex-1 bg-white/15" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        {milestone}
                      </span>
                      <span className="h-px flex-1 bg-white/15" />
                    </p>
                  )}
                  <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-5">
                    <dt className="text-gray-300 text-[13px] leading-snug mb-1.5 sm:mb-0">
                      {row.label}
                    </dt>
                    <dd>
                      <ShareBar pct={row.yourSharePct} />
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <figcaption className="text-gray-300 text-[13px] leading-relaxed mt-7 pt-5 border-t border-white/10">
        {note}
      </figcaption>
    </figure>
  );
}

/**
 * One part-to-whole bar. 24px is the mark ceiling; a 2px gap in the surface colour does
 * the separating rather than a border, and only the far end is rounded, because the left
 * edge is the baseline both segments grow from.
 */
function ShareBar({ pct }: { pct: number }) {
  const whole = pct >= 100;
  return (
    <div className="flex items-stretch gap-[2px] h-6">
      <div
        className="flex items-center justify-end px-2 rounded-l-none"
        style={{
          width: `${pct}%`,
          backgroundColor: FILL.dark.you,
          borderTopRightRadius: whole ? 4 : 0,
          borderBottomRightRadius: whole ? 4 : 0,
        }}
      >
        <span
          className="text-[11px] font-bold leading-none"
          style={{ color: INK_ON[FILL.dark.you] }}
        >
          {pct}%
        </span>
      </div>
      {!whole && (
        <div
          className="flex items-center justify-end px-2"
          style={{
            width: `${100 - pct}%`,
            backgroundColor: FILL.dark.mbp,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          }}
        >
          <span
            className="text-[11px] font-bold leading-none"
            style={{ color: INK_ON[FILL.dark.mbp] }}
          >
            {100 - pct}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * How much of the threshold has been recovered.
 *
 * One hue rather than the page's accent-to-primary gradient, and specifically the same
 * hue as the recovery segment of the bar below it: the two marks measure the same thing,
 * and a gradient across a magnitude implies a second variable that is not there.
 */
export function RecoveryMeter({ fraction }: { fraction: number }) {
  return (
    <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="presentation">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.round(fraction * 100)}%`,
          backgroundColor: FILL.light.recovery,
        }}
      />
    </div>
  );
}

/**
 * A single distribution split into where each part of it goes.
 *
 * `aria-hidden`, and deliberately unlabelled: the table beside it is the accessible twin
 * and carries every amount in full. Labelling the segments too would either clip on a
 * phone, where the narrow ones are under 60px, or print each figure twice.
 */
export function DistributionBar({
  segments,
}: {
  segments: { key: string; amountInr: number; fill: keyof typeof FILL.light }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.amountInr, 0);
  return (
    <div className="flex items-stretch gap-[2px] h-6" aria-hidden="true">
      {segments.map((segment, i) => (
        <div
          key={segment.key}
          style={{
            width: `${(segment.amountInr / total) * 100}%`,
            backgroundColor: FILL.light[segment.fill],
            borderTopRightRadius: i === segments.length - 1 ? 4 : 0,
            borderBottomRightRadius: i === segments.length - 1 ? 4 : 0,
          }}
        />
      ))}
    </div>
  );
}

/** The swatch that ties a table row to its segment in the bar above it. */
export function Swatch({ fill }: { fill: keyof typeof FILL.light }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 align-middle mr-2"
      style={{ backgroundColor: FILL.light[fill] }}
      aria-hidden="true"
    />
  );
}

/**
 * A machine count, as machines.
 *
 * Five and ten are small enough to count at a glance, which is the whole comparison
 * between the two tiers, and a numeral makes the reader do arithmetic that a row of
 * glyphs does for them. `aria-hidden`, because the count is already stated beside it.
 */
export function MachineCount({ count }: { count: number }) {
  return (
    <span className="flex flex-wrap items-end gap-1 mt-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="w-2.5 h-4 rounded-[2px] bg-primary/25 border border-primary/50 flex items-start justify-center pt-0.5"
        >
          <span className="w-1 h-1 rounded-full bg-primary" />
        </span>
      ))}
    </span>
  );
}
