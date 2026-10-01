"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getFeedback, listFeedback, updateFeedback } from "@/lib/adminMachineApi";
import {
  FEEDBACK_NOTE_MAX,
  FEEDBACK_STATES,
  FEEDBACK_TYPES,
  type Feedback,
  type FeedbackFilters,
  type FeedbackList,
  type FeedbackState,
  type FeedbackType,
} from "@shared/admin/feedbackSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { Chip, Pill } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { FormRow, NativeSelect, inputClass } from "./machines/formBits";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  formatIstStamp,
  Head,
  LoadMore,
  MachineDialog,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";
import {
  countsTowardBadge,
  firstLine,
  ORDER_NOT_FOUND_HINT,
  REASON_LABEL,
  STATE_LABEL,
  STATE_PILL_CLASS,
  stars,
  TYPE_LABEL,
  TYPE_PILL_CLASS,
} from "./machines/feedbackLabels";
import { adjustNewFeedbackCount, setNewFeedbackCount } from "./machines/newFeedbackCount";

export default function AdminMachineFeedback() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <FeedbackPage session={guard.session} />;
}

function isType(v: string | null | undefined): v is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(v ?? "");
}

function FeedbackPage({ session }: { session: AdminSession }) {
  const search = useSearchParams();
  const [initial] = useState(() => {
    const type = search?.get("type");
    const sn = search?.get("sn") ?? "";
    const linked = isType(type) || sn !== "";
    return { type: isType(type) ? type : undefined, sn, state: linked ? "" : "new" };
  });
  const [stateDraft, setStateDraft] = useState(initial.state);
  const [snDraft, setSnDraft] = useState(initial.sn);
  const [filters, setFilters] = useState<FeedbackFilters>({
    type: initial.type,
    sn: initial.sn || undefined,
    state: (initial.state || undefined) as FeedbackState | undefined,
  });
  const [rows, setRows] = useState<Feedback[]>([]);
  const [counts, setCounts] = useState<FeedbackList["counts"]>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [open, setOpen] = useState<Feedback | null>(null);

  const page = useCallback(
    async (from: string | null) => {
      setLoading(true);
      const result = await listFeedback(filters, from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows((r) => (from ? [...r, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
      setCounts(result.data.counts);
      setNewFeedbackCount(result.data.newCount);
    },
    [filters],
  );

  useEffect(() => {
    void page(null);
  }, [page]);

  function changed(next: Feedback, before: Feedback) {
    adjustNewFeedbackCount(Number(countsTowardBadge(next)) - Number(countsTowardBadge(before)));
    setRows((r) => r.map((row) => (row.id === next.id ? next : row)));
    setOpen(next);
  }

  const total = counts ? counts.query + counts.review + counts.complaint : undefined;

  return (
    <MachinesShell session={session} section="feedback">
      <MachinesHeader
        title="Feedback"
        subtitle="Messages customers send from a machine's Contact us button, newest first. Times are IST."
      />
      <ProblemPanel problem={problem} testId="feedback-error" />

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Type">
        <Chip
          label="All"
          count={total}
          selected={!filters.type}
          onClick={() => setFilters((f) => ({ ...f, type: undefined }))}
          testId="chip-type-all"
        />
        {FEEDBACK_TYPES.map((type) => (
          <Chip
            key={type}
            label={TYPE_LABEL[type]}
            count={counts?.[type]}
            selected={filters.type === type}
            onClick={() => setFilters((f) => ({ ...f, type }))}
            testId={`chip-type-${type}`}
          />
        ))}
      </div>

      <FilterBar
        onSearch={() =>
          setFilters((f) => ({
            ...f,
            state: (stateDraft || undefined) as FeedbackState | undefined,
            sn: snDraft.trim() || undefined,
          }))
        }
        onReset={() => {
          setStateDraft("new");
          setSnDraft("");
          setFilters({ state: "new" });
        }}
      >
        <SelectFilter
          label="State"
          value={stateDraft}
          onChange={setStateDraft}
          options={[{ value: "", label: "All" }, ...FEEDBACK_STATES.map((s) => ({ value: s, label: STATE_LABEL[s] }))]}
          testId="filter-state"
        />
        <TextFilter label="Machine (SN)" value={snDraft} onChange={setSnDraft} testId="filter-sn" />
      </FilterBar>

      <DataTable testId="feedback-table">
        <Head>
          <Col>Received</Col>
          <Col>Machine</Col>
          <Col>Type</Col>
          <Col>What</Col>
          <Col>Message</Col>
          <Col>Contact</Col>
          <Col>Order</Col>
          <Col>State</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={8} loading={loading} />
          ) : (
            rows.map((item) => (
              <tr
                key={item.id}
                onClick={() => setOpen(item)}
                className="cursor-pointer hover:bg-secondary/40 transition-colors"
                data-testid={`row-feedback-${item.id}`}
              >
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(item.receivedAt)}</Cell>
                <Cell className="whitespace-nowrap">
                  <span className="block font-semibold text-foreground">{item.shopName || item.sn}</span>
                  {item.shopName && <span className="block font-mono text-xs text-muted-foreground">{item.sn}</span>}
                </Cell>
                <Cell>
                  <Pill className={TYPE_PILL_CLASS[item.type]} testId={`type-${item.id}`}>
                    {TYPE_LABEL[item.type]}
                  </Pill>
                </Cell>
                <Cell className="min-w-[10rem]">
                  <span data-testid={`what-${item.id}`}>
                    <What item={item} />
                  </span>
                </Cell>
                <Cell className="min-w-[12rem] max-w-[16rem]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(item);
                    }}
                    className="block w-full truncate rounded-md text-left text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    data-testid={`open-${item.id}`}
                  >
                    {firstLine(item.message) || <span className="text-muted-foreground">No message</span>}
                  </button>
                </Cell>
                <Cell className="whitespace-nowrap">
                  <ContactIcons item={item} />
                </Cell>
                <Cell className="whitespace-nowrap font-mono text-xs">
                  <OrderRef item={item} />
                </Cell>
                <Cell>
                  <Pill className={STATE_PILL_CLASS[item.state]} testId={`state-${item.id}`}>
                    {STATE_LABEL[item.state]}
                  </Pill>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {cursor && <LoadMore onClick={() => page(cursor)} loading={loading} />}

      {open && <FeedbackDialog key={open.id} item={open} onClose={() => setOpen(null)} onChanged={changed} />}
    </MachinesShell>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <>
      <span className="text-amber-300" aria-hidden>
        {stars(rating)}
      </span>
      <span className="sr-only">{rating} out of 5 stars</span>
    </>
  );
}

function What({ item }: { item: Feedback }) {
  if (item.type === "review") {
    return (
      <>
        <span className="block text-foreground">{item.goodsName || item.goodsId || "A drink"}</span>
        {item.rating !== null && <Stars rating={item.rating} />}
      </>
    );
  }
  if (item.type === "complaint" && item.reason) return <>{REASON_LABEL[item.reason]}</>;
  return <span className="text-muted-foreground">—</span>;
}

function ContactIcons({ item }: { item: Feedback }) {
  if (!item.email && !item.phone) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      {item.email && <Mail className="h-4 w-4" aria-label="Email given" role="img" data-testid={`contact-email-${item.id}`} />}
      {item.phone && <Phone className="h-4 w-4" aria-label="Phone given" role="img" data-testid={`contact-phone-${item.id}`} />}
    </span>
  );
}

function OrderRef({ item }: { item: Feedback }) {
  if (!item.orderId) return <span className="text-muted-foreground">—</span>;
  if (item.orderLinked) {
    return (
      <Link
        href={`/machines/orders/${encodeURIComponent(item.orderId)}`}
        onClick={(event) => event.stopPropagation()}
        className="text-primary hover:underline"
        data-testid={`order-${item.id}`}
      >
        {item.orderId}
      </Link>
    );
  }
  return (
    <span title={ORDER_NOT_FOUND_HINT} data-testid={`order-${item.id}`}>
      <span className="block text-muted-foreground">{item.orderId}</span>
      <span className="block font-sans text-[11px] text-amber-200">Not found</span>
    </span>
  );
}

function FeedbackDialog({
  item,
  onClose,
  onChanged,
}: {
  item: Feedback;
  onClose: () => void;
  onChanged: (next: Feedback, before: Feedback) => void;
}) {
  const [current, setCurrent] = useState(item);
  const [state, setState] = useState<FeedbackState>(item.state);
  const [note, setNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    let live = true;
    getFeedback(item.id).then((result) => {
      if (!live || !result.ok) return;
      onChanged(result.data, item);
      setCurrent(result.data);
      setState(result.data.state);
      setNote(result.data.note ?? "");
    });
    return () => {
      live = false;
    };
  }, [item.id]);

  const changed = state !== current.state || note.trim() !== (current.note ?? "");

  async function save() {
    setBusy(true);
    const result = await updateFeedback(current.id, { state, note: note.trim() });
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    onChanged(result.data, current);
    setCurrent(result.data);
    setNote(result.data.note ?? "");
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      wide
      title={`${TYPE_LABEL[current.type]} from ${current.shopName || current.sn}`}
      description={`Received ${formatIstStamp(current.receivedAt)} IST on ${current.sn}.`}
      testId="feedback-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={busy || !changed}
            className="rounded-xl cursor-pointer"
            data-testid="button-save-feedback"
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-sm">
        <ProblemPanel problem={problem} testId="feedback-save-error" />
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Type">
            <Pill className={TYPE_PILL_CLASS[current.type]}>{TYPE_LABEL[current.type]}</Pill>
          </Detail>
          {current.type === "review" && (
            <Detail label="Drink">
              {current.goodsName || current.goodsId || "—"}
              {current.rating !== null && (
                <span className="ml-2">
                  <Stars rating={current.rating} />
                </span>
              )}
            </Detail>
          )}
          {current.type === "complaint" && <Detail label="Reason">{current.reason ? REASON_LABEL[current.reason] : "—"}</Detail>}
          <Detail label="Email">
            {current.email ? (
              <a href={`mailto:${current.email}`} className="break-all text-primary hover:underline" data-testid="feedback-email">
                {current.email}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Phone">
            {current.phone ? (
              <a href={`tel:${current.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline" data-testid="feedback-phone">
                {current.phone}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Order">
            {current.orderId ? (
              current.orderLinked ? (
                <Link
                  href={`/machines/orders/${encodeURIComponent(current.orderId)}`}
                  className="font-mono text-xs text-primary hover:underline"
                  data-testid="feedback-order"
                >
                  {current.orderId}
                </Link>
              ) : (
                <span data-testid="feedback-order">
                  <span className="font-mono text-xs">{current.orderId}</span>
                  <span className="block text-xs text-amber-200">{ORDER_NOT_FOUND_HINT}</span>
                </span>
              )
            ) : (
              "—"
            )}
          </Detail>
        </dl>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted-foreground">Message</p>
          <p
            className="whitespace-pre-wrap break-words rounded-xl border border-border bg-secondary/30 px-3 py-2 text-foreground"
            data-testid="feedback-message"
          >
            {current.message || <span className="text-muted-foreground">No message</span>}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <FormRow label="State" htmlFor="feedback-state">
            <NativeSelect
              id="feedback-state"
              value={state}
              onChange={(v) => setState(v as FeedbackState)}
              options={FEEDBACK_STATES.map((s) => ({ value: s, label: STATE_LABEL[s] }))}
            />
          </FormRow>
          <FormRow label="Note" htmlFor="feedback-note" hint={`For the team only. ${note.length} of ${FEEDBACK_NOTE_MAX}.`}>
            <Textarea
              id="feedback-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={FEEDBACK_NOTE_MAX}
              rows={3}
              className={`${inputClass} h-auto min-h-[5rem]`}
              data-testid="input-feedback-note"
            />
          </FormRow>
        </div>

        {current.updatedAt && (
          <p className="text-xs text-muted-foreground" data-testid="feedback-updated">
            Last changed {formatIstStamp(current.updatedAt)} IST{current.updatedBy ? ` by ${current.updatedBy}` : ""}.
          </p>
        )}
      </div>
    </MachineDialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}
