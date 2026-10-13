"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countStock, receiveStock, writeOffStock } from "@/lib/inventoryApi";
import {
  WRITE_OFF_REASONS,
  type InventoryItem,
  type ReceiptLine,
  type StockBalance,
  type Warehouse,
  type WriteOffReason,
} from "@shared/admin/inventorySchema";
import { FormRow, IconButton, NativeSelect, parseNumber, TextInput } from "./formBits";
import { formatRupees, MachineDialog, ProblemPanel, type Problem } from "./MachinesUi";
import {
  emptyReceiptLine,
  entryUnit,
  formatQty,
  parseQtyIn,
  validateReceiptLine,
  type ReceiptLineValues,
} from "./inventoryRules";
import { inventoryProblem } from "./inventoryBits";
import { istToday } from "./statsRules";

type DialogProps = {
  items: InventoryItem[];
  warehouses: Warehouse[];
  onClose: () => void;
  onDone: (message: string) => void;
};

const activeOnly = (items: InventoryItem[]) => items.filter((i) => i.active);

const warehouseOptions = (warehouses: Warehouse[]) =>
  warehouses.filter((w) => w.active).map((w) => ({ value: w.warehouseId, label: w.name }));

const itemOptions = (items: InventoryItem[]) => [
  { value: "", label: "Choose an item" },
  ...items.map((i) => ({ value: i.itemId, label: i.name })),
];

function Footer({ onClose, onSave, saving, label, testId }: { onClose: () => void; onSave: () => void; saving: boolean; label: string; testId: string }) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
        Cancel
      </Button>
      <Button type="button" onClick={onSave} disabled={saving} className="rounded-xl cursor-pointer" data-testid={testId}>
        {saving ? "Saving…" : label}
      </Button>
    </>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ReceiveDialog({ items, warehouses, onClose, onDone }: DialogProps) {
  const choices = activeOnly(items);
  const today = istToday(Date.now());
  const [warehouseId, setWarehouseId] = useState(warehouseOptions(warehouses)[0]?.value ?? "");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [lines, setLines] = useState<ReceiptLineValues[]>([emptyReceiptLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(items.map((i) => [i.itemId, i])), [items]);
  const setLine = (index: number, key: keyof ReceiptLineValues) => (value: string) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const total = lines.reduce((sum, line) => {
    const packs = parseNumber(line.packs) ?? 0;
    const price = parseNumber(line.packPrice) ?? 0;
    return Number.isFinite(packs * price) ? sum + packs * price : sum;
  }, 0);

  async function save() {
    const head: Record<string, string> = {};
    if (!warehouseId) head.warehouseId = "Choose a warehouse.";
    if (!supplier.trim()) head.supplier = "Who you bought it from.";
    if (!invoiceNo.trim()) head.invoiceNo = "The number on their invoice.";
    if (!receivedOn || receivedOn > today) head.receivedOn = "Today or earlier.";
    const checked = lines.map((line) => validateReceiptLine(line, byId.get(line.itemId), today));
    setErrors(head);
    setLineErrors(checked.map((c) => c.errors));
    if (Object.keys(head).length > 0 || checked.some((c) => !c.line)) return;
    setSaving(true);
    const result = await receiveStock({
      warehouseId,
      supplier: supplier.trim(),
      invoiceNo: invoiceNo.trim(),
      receivedOn,
      lines: checked.map((c) => c.line as ReceiptLine),
    });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(inventoryProblem(result));
      return;
    }
    onDone(`Received ${plural(lines.length, "line")} on invoice ${invoiceNo.trim()}.`);
  }

  return (
    <MachineDialog
      open
      wide
      onClose={onClose}
      title="Receive stock"
      description="One supplier invoice. Prices are before GST."
      testId="receive-dialog"
      footer={<Footer onClose={onClose} onSave={save} saving={saving} label="Receive" testId="button-save-receipt" />}
    >
      <ProblemPanel problem={problem} testId="receive-error" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Warehouse" htmlFor="warehouseId" error={errors.warehouseId}>
          <NativeSelect id="warehouseId" value={warehouseId} onChange={setWarehouseId} options={warehouseOptions(warehouses)} />
        </FormRow>
        <FormRow label="Received on" htmlFor="receivedOn" error={errors.receivedOn}>
          <TextInput id="receivedOn" type="date" value={receivedOn} onChange={setReceivedOn} />
        </FormRow>
        <FormRow label="Supplier" htmlFor="supplier" error={errors.supplier}>
          <TextInput id="supplier" value={supplier} onChange={setSupplier} placeholder="Nutrabay Wholesale" />
        </FormRow>
        <FormRow label="Invoice number" htmlFor="invoiceNo" error={errors.invoiceNo}>
          <TextInput id="invoiceNo" value={invoiceNo} onChange={setInvoiceNo} />
        </FormRow>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const item = byId.get(line.itemId);
          const e = lineErrors[index] ?? {};
          const id = (key: string) => `line-${index}-${key}`;
          return (
            <fieldset key={index} className="rounded-xl border border-border px-3 pb-3 pt-2" data-testid={`receipt-line-${index}`}>
              <legend className="flex w-full items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
                Line {index + 1}
                {lines.length > 1 && (
                  <IconButton label={`Remove line ${index + 1}`} onClick={() => setLines((all) => all.filter((_, i) => i !== index))} testId={`remove-line-${index}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                )}
              </legend>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <FormRow label="Item" htmlFor={id("item")} error={e.itemId}>
                    <NativeSelect id={id("item")} value={line.itemId} onChange={setLine(index, "itemId")} options={itemOptions(choices)} />
                  </FormRow>
                </div>
                <div className="sm:col-span-2">
                  <FormRow label="Packs" htmlFor={id("packs")} error={e.packs} hint={item ? `${item.packLabel}, ${formatQty(item.packSize, item.unit)}` : undefined}>
                    <TextInput id={id("packs")} value={line.packs} onChange={setLine(index, "packs")} inputMode="numeric" />
                  </FormRow>
                </div>
                <div className="sm:col-span-2">
                  <FormRow label="Price per pack" htmlFor={id("price")} error={e.packPrice} hint="₹, before GST">
                    <TextInput id={id("price")} value={line.packPrice} onChange={setLine(index, "packPrice")} inputMode="decimal" />
                  </FormRow>
                </div>
                <div className="sm:col-span-2">
                  <FormRow label="GST paid" htmlFor={id("gst")} error={e.gst} hint="₹, whole line">
                    <TextInput id={id("gst")} value={line.gst} onChange={setLine(index, "gst")} inputMode="decimal" />
                  </FormRow>
                </div>
                <div className="sm:col-span-3">
                  <FormRow label="Batch code" htmlFor={id("batch")} error={e.batchCode} hint="Printed on the pack">
                    <TextInput id={id("batch")} value={line.batchCode} onChange={setLine(index, "batchCode")} />
                  </FormRow>
                </div>
                <div className="sm:col-span-3">
                  <FormRow label="Expires on" htmlFor={id("expires")} error={e.expiresOn}>
                    <TextInput id={id("expires")} type="date" value={line.expiresOn} onChange={setLine(index, "expiresOn")} />
                  </FormRow>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => setLines((all) => [...all, emptyReceiptLine()])} className="rounded-xl cursor-pointer" data-testid="button-add-line">
          <Plus className="h-4 w-4" aria-hidden />
          Add a line
        </Button>
        <p className="text-sm text-muted-foreground" data-testid="receipt-total">
          Before GST: <span className="font-semibold tabular-nums text-foreground">{formatRupees(total)}</span>
        </p>
      </div>
    </MachineDialog>
  );
}

type QtyLine = { itemId: string; qty: string };

export function WriteOffDialog({ items, warehouses, onClose, onDone }: DialogProps) {
  const choices = activeOnly(items);
  const [warehouseId, setWarehouseId] = useState(warehouseOptions(warehouses)[0]?.value ?? "");
  const [reason, setReason] = useState<WriteOffReason>("expired");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<QtyLine[]>([{ itemId: "", qty: "" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const byId = new Map(items.map((i) => [i.itemId, i]));

  async function save() {
    const next: Record<string, string> = {};
    if (!warehouseId) next.warehouseId = "Choose a warehouse.";
    if (note.trim().length < 3) next.note = "Say what happened, such as which batch expired.";
    const parsed = lines.map((line, index) => {
      const item = byId.get(line.itemId);
      if (!item) next[`item-${index}`] = "Choose an item.";
      const qty = item ? parseQtyIn(line.qty, item.unit) : null;
      if (item && (qty === null || qty <= 0)) next[`qty-${index}`] = item.unit === "pcs" ? "A whole number above 0." : "Above 0.";
      return { itemId: line.itemId, qty: qty ?? 0 };
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const result = await writeOffStock({ warehouseId, reason, note: note.trim(), lines: parsed });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(inventoryProblem(result));
      return;
    }
    onDone(`Wrote off ${plural(lines.length, "item")}.`);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      title="Write off stock"
      description="Stock in a warehouse that can't be used. It counts as wastage at its average cost."
      testId="writeoff-dialog"
      footer={<Footer onClose={onClose} onSave={save} saving={saving} label="Write off" testId="button-save-writeoff" />}
    >
      <ProblemPanel problem={problem} testId="writeoff-error" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Warehouse" htmlFor="warehouseId" error={errors.warehouseId}>
          <NativeSelect id="warehouseId" value={warehouseId} onChange={setWarehouseId} options={warehouseOptions(warehouses)} />
        </FormRow>
        <FormRow label="Reason" htmlFor="reason">
          <NativeSelect
            id="reason"
            value={reason}
            onChange={(v) => setReason(v as WriteOffReason)}
            options={WRITE_OFF_REASONS.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))}
          />
        </FormRow>
      </div>
      {lines.map((line, index) => {
        const item = byId.get(line.itemId);
        return (
          <div key={index} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2" data-testid={`writeoff-line-${index}`}>
            <FormRow label={index === 0 ? "Item" : ""} htmlFor={`wo-item-${index}`} error={errors[`item-${index}`]}>
              <NativeSelect
                id={`wo-item-${index}`}
                value={line.itemId}
                onChange={(v) => setLines((all) => all.map((l, i) => (i === index ? { ...l, itemId: v } : l)))}
                options={itemOptions(choices)}
              />
            </FormRow>
            <FormRow label={index === 0 ? `Amount${item ? ` (${entryUnit(item.unit)})` : ""}` : ""} htmlFor={`wo-qty-${index}`} error={errors[`qty-${index}`]}>
              <TextInput
                id={`wo-qty-${index}`}
                value={line.qty}
                onChange={(v) => setLines((all) => all.map((l, i) => (i === index ? { ...l, qty: v } : l)))}
                inputMode="decimal"
                aria-label={item ? `Amount in ${entryUnit(item.unit)}` : "Amount"}
              />
            </FormRow>
            <div className={index === 0 ? "pt-7" : ""}>
              {lines.length > 1 && (
                <IconButton label={`Remove line ${index + 1}`} onClick={() => setLines((all) => all.filter((_, i) => i !== index))} testId={`remove-wo-${index}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </IconButton>
              )}
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={() => setLines((all) => [...all, { itemId: "", qty: "" }])} className="w-fit rounded-xl cursor-pointer">
        <Plus className="h-4 w-4" aria-hidden />
        Add an item
      </Button>
      <FormRow label="What happened" htmlFor="note" error={errors.note}>
        <TextInput id="note" value={note} onChange={setNote} placeholder="Batch B12 expired on 30 September" />
      </FormRow>
    </MachineDialog>
  );
}

export function CountDialog({ items, warehouses, balances, onClose, onDone }: DialogProps & { balances: StockBalance[] }) {
  const choices = activeOnly(items);
  const [warehouseId, setWarehouseId] = useState(warehouseOptions(warehouses)[0]?.value ?? "");
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const booked = (itemId: string) =>
    balances.find((b) => b.place.kind === "warehouse" && b.place.id === warehouseId && b.itemId === itemId)?.qty ?? 0;

  async function save() {
    const next: Record<string, string> = {};
    const lines: { itemId: string; counted: number }[] = [];
    for (const item of choices) {
      const text = counted[item.itemId] ?? "";
      if (text.trim() === "") continue;
      const qty = parseQtyIn(text, item.unit);
      if (qty === null) next[item.itemId] = item.unit === "pcs" ? "A whole number." : "0 or more.";
      else lines.push({ itemId: item.itemId, counted: qty });
    }
    if (!warehouseId) next.warehouseId = "Choose a warehouse.";
    if (lines.length === 0 && Object.keys(next).length === 0) next.form = "Enter at least one count.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const result = await countStock({ warehouseId, lines });
    setSaving(false);
    if (!result.ok) {
      setProblem(inventoryProblem(result));
      return;
    }
    const corrected = result.data.movements.length;
    onDone(corrected === 0 ? "Count saved. Everything matched." : `Count saved. ${plural(corrected, "item")} corrected.`);
  }

  return (
    <MachineDialog
      open
      wide
      onClose={onClose}
      title="Count stock"
      description="Enter what is on the shelf. Leave an item empty to skip it. A difference is corrected and kept in History."
      testId="count-dialog"
      footer={<Footer onClose={onClose} onSave={save} saving={saving} label="Save count" testId="button-save-count" />}
    >
      <ProblemPanel problem={problem} testId="count-error" />
      <FormRow label="Warehouse" htmlFor="warehouseId" error={errors.warehouseId}>
        <NativeSelect id="warehouseId" value={warehouseId} onChange={setWarehouseId} options={warehouseOptions(warehouses)} />
      </FormRow>
      {errors.form && (
        <p className="text-sm text-rose-300" role="alert" data-testid="count-empty">
          {errors.form}
        </p>
      )}
      <ul className="divide-y divide-border/70 rounded-xl border border-border">
        {choices.map((item) => {
          const books = booked(item.itemId);
          const qty = parseQtyIn(counted[item.itemId] ?? "", item.unit);
          const diff = (counted[item.itemId] ?? "").trim() !== "" && qty !== null ? qty - books : null;
          return (
            <li key={item.itemId} className="grid grid-cols-[1fr_7rem] items-center gap-3 px-3 py-2.5 sm:grid-cols-[1fr_8rem_7rem]" data-testid={`count-row-${item.itemId}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">Should be {formatQty(books, item.unit)}</p>
              </div>
              <p className={`hidden text-right text-xs tabular-nums sm:block ${diff === null || diff === 0 ? "text-muted-foreground" : "text-amber-300"}`}>
                {diff === null ? "" : diff === 0 ? "Matches" : `${diff > 0 ? "+" : ""}${formatQty(diff, item.unit)}`}
              </p>
              <div>
                <TextInput
                  id={`count-${item.itemId}`}
                  value={counted[item.itemId] ?? ""}
                  onChange={(v) => setCounted((all) => ({ ...all, [item.itemId]: v }))}
                  inputMode="decimal"
                  placeholder={entryUnit(item.unit)}
                  aria-label={`${item.name}, counted in ${entryUnit(item.unit)}`}
                />
                {errors[item.itemId] && <p className="mt-1 text-xs text-rose-300">{errors[item.itemId]}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </MachineDialog>
  );
}
