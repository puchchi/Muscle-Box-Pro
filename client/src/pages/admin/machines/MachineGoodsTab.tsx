"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  addMachineGoods,
  fetchAvailableGoods,
  fetchMachineGoods,
  updateMachineGoods,
  type MachineCall,
} from "@/lib/adminMachineApi";
import type { MachineGoodsPatch } from "@shared/admin/machines";
import type { AvailableGood, MachineGood } from "@shared/admin/machinesSchema";
import { SuccessPanel } from "../AdminUi";
import { hasTwoDecimalsAtMost, parseNumber } from "./formBits";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  formatRupees,
  GoodsPicture,
  Head,
  MachineDialog,
  NoData,
  problemOf,
  ProblemPanel,
  REFRESH_NOTE,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./MachinesUi";

type Draft = { price: string; sort: string };

const priceText = (good: MachineGood) => (good.devicePriceInr === null ? "" : String(good.devicePriceInr));

export function checkRowDraft(draft: Draft): { patch: Omit<MachineGoodsPatch, "goodsId">; errors: Partial<Draft> } {
  const errors: Partial<Draft> = {};
  const patch: Omit<MachineGoodsPatch, "goodsId"> = {};
  const price = parseNumber(draft.price);
  if (price === null) patch.devicePriceInr = null;
  else if (Number.isNaN(price) || price < 0 || price > 10000) errors.price = "0 to 10000.";
  else if (!hasTwoDecimalsAtMost(price)) errors.price = "Up to 2 decimals.";
  else patch.devicePriceInr = price;
  const sort = parseNumber(draft.sort);
  if (sort === null || Number.isNaN(sort) || !Number.isInteger(sort) || sort < 0 || sort > 9999) {
    errors.sort = "0 to 9999.";
  } else patch.sort = sort;
  return { patch, errors };
}

export function MachineGoodsTab({ sn }: { sn: string }) {
  const [rows, setRows] = useState<MachineGood[]>([]);
  const [name, setName] = useState("");
  const [listed, setListed] = useState("");
  const [filters, setFilters] = useState<{ name?: string; listed?: "yes" | "no" }>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, Partial<Draft>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchMachineGoods(sn, filters);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setRows(result.data.items);
    setSelected(new Set());
  }, [sn, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patches: MachineGoodsPatch[], done: string): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    const result = await updateMachineGoods(sn, patches);
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      setRowErrors(errorsByRow(result, patches));
      return false;
    }
    setProblem(null);
    setNotice(`${done} ${REFRESH_NOTE}`);
    await load();
    return true;
  }

  const draftOf = (good: MachineGood): Draft => drafts[good.goodsId] ?? { price: priceText(good), sort: String(good.sort) };
  const changed = rows.filter((good) => {
    const draft = drafts[good.goodsId];
    return draft && (draft.price.trim() !== priceText(good) || draft.sort.trim() !== String(good.sort));
  });

  async function saveEdits() {
    const errors: Record<string, Partial<Draft>> = {};
    const patches: MachineGoodsPatch[] = [];
    for (const good of changed) {
      const checked = checkRowDraft(draftOf(good));
      if (Object.keys(checked.errors).length > 0) errors[good.goodsId] = checked.errors;
      else patches.push({ goodsId: good.goodsId, ...checked.patch });
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0 || patches.length === 0) return;
    if (await save(patches, "Prices and order saved.")) setDrafts({});
  }

  const edit = (good: MachineGood, key: keyof Draft) => (value: string) =>
    setDrafts((d) => ({ ...d, [good.goodsId]: { ...draftOf(good), [key]: value } }));

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.goodsId));

  return (
    <div>
      <ProblemPanel problem={problem} testId="machine-goods-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="machine-goods-saved">{notice}</SuccessPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => setFilters({ name: name.trim() || undefined, listed: (listed || undefined) as "yes" | "no" | undefined })}
        onReset={() => {
          setName("");
          setListed("");
          setFilters({});
        }}
      >
        <TextFilter label="Goods Name" value={name} onChange={setName} testId="filter-goods-name" />
        <SelectFilter
          label="Listed"
          value={listed}
          onChange={setListed}
          options={[
            { value: "", label: "All" },
            { value: "yes", label: "Listed" },
            { value: "no", label: "Unlisted" },
          ]}
          testId="filter-listed"
        />
      </FilterBar>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setPicking(true)} className="rounded-lg cursor-pointer" data-testid="button-add-goods">
          <Plus className="h-4 w-4" aria-hidden />
          Add goods
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || busy}
          onClick={() => save([...selected].map((goodsId) => ({ goodsId, listed: true })), "Listed.")}
          className="rounded-lg cursor-pointer"
          data-testid="button-batch-list"
        >
          List
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || busy}
          onClick={() => save([...selected].map((goodsId) => ({ goodsId, listed: false })), "Unlisted.")}
          className="rounded-lg cursor-pointer"
          data-testid="button-batch-unlist"
        >
          Unlist
        </Button>
        {selected.size > 0 && <span className="text-xs text-muted-foreground">{selected.size} selected</span>}
        <span className="ml-auto flex items-center gap-2">
          {changed.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDrafts({});
                setRowErrors({});
              }}
              className="rounded-lg cursor-pointer"
            >
              Discard
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={changed.length === 0 || busy}
            onClick={saveEdits}
            className="rounded-lg cursor-pointer"
            data-testid="button-save-goods"
          >
            {changed.length > 0 ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Save changes"}
          </Button>
        </span>
      </div>

      <DataTable testId="machine-goods-table">
        <Head>
          <Col>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => setSelected(checked ? new Set(rows.map((r) => r.goodsId)) : new Set())}
              aria-label="Select all"
              data-testid="select-all-goods"
            />
          </Col>
          <Col>Sort</Col>
          <Col>Picture</Col>
          <Col>Goods Number</Col>
          <Col>Goods Name</Col>
          <Col>Specification</Col>
          <Col align="right">Library price</Col>
          <Col>Machine price</Col>
          <Col align="right">Shown price</Col>
          <Col>Listed</Col>
          <Col>Sold out</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={11} loading={loading} />
          ) : (
            rows.map((good) => {
              const draft = draftOf(good);
              const errors = rowErrors[good.goodsId] ?? {};
              return (
                <tr key={good.goodsId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-good-${good.goodsId}`}>
                  <Cell>
                    <Checkbox
                      checked={selected.has(good.goodsId)}
                      onCheckedChange={(checked) =>
                        setSelected((s) => {
                          const next = new Set(s);
                          if (checked) next.add(good.goodsId);
                          else next.delete(good.goodsId);
                          return next;
                        })
                      }
                      aria-label={`Select ${good.name}`}
                      data-testid={`select-good-${good.goodsId}`}
                    />
                  </Cell>
                  <Cell>
                    <CellInput
                      value={draft.sort}
                      onChange={edit(good, "sort")}
                      error={errors.sort}
                      width="w-16"
                      label={`Sort for ${good.name}`}
                      testId={`sort-${good.goodsId}`}
                    />
                  </Cell>
                  <Cell>
                    <GoodsPicture url={good.image?.url} alt={good.name} />
                  </Cell>
                  <Cell className="font-mono text-xs">{good.no}</Cell>
                  <Cell className="min-w-[8rem]">
                    {good.name}
                    {good.nameEn && good.nameEn !== good.name && (
                      <span className="block text-xs text-muted-foreground">{good.nameEn}</span>
                    )}
                  </Cell>
                  <Cell className="text-muted-foreground">{good.spec || "—"}</Cell>
                  <Cell align="right" className="tabular-nums">{formatRupees(good.libraryPriceInr)}</Cell>
                  <Cell>
                    <CellInput
                      value={draft.price}
                      onChange={edit(good, "price")}
                      error={errors.price}
                      width="w-24"
                      placeholder="Library"
                      label={`Machine price for ${good.name}`}
                      testId={`price-${good.goodsId}`}
                    />
                  </Cell>
                  <Cell align="right" className="tabular-nums font-semibold">{formatRupees(good.shownPriceInr)}</Cell>
                  <Cell>
                    <Switch
                      checked={good.listed}
                      disabled={busy}
                      onCheckedChange={(checked) =>
                        save([{ goodsId: good.goodsId, listed: checked }], checked ? "Listed." : "Unlisted.")
                      }
                      aria-label={`Listed: ${good.name}`}
                      data-testid={`listed-${good.goodsId}`}
                    />
                  </Cell>
                  <Cell>
                    <span className={good.soldOut ? "font-semibold text-amber-300" : "text-muted-foreground"} data-testid={`soldout-${good.goodsId}`}>
                      {good.soldOut ? "Yes" : "No"}
                    </span>
                  </Cell>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        Leave Machine price empty to use the library price. Lower Sort comes first on the machine.
      </p>

      <GoodsPicker
        open={picking}
        sn={sn}
        onClose={() => setPicking(false)}
        onAdded={async (count) => {
          setPicking(false);
          setNotice(`${count} added and listed. ${REFRESH_NOTE}`);
          await load();
        }}
      />
    </div>
  );
}

function errorsByRow(result: MachineCall<unknown>, patches: MachineGoodsPatch[]): Record<string, Partial<Draft>> {
  if (result.ok || !result.error.fieldErrors) return {};
  const out: Record<string, Partial<Draft>> = {};
  for (const [key, message] of Object.entries(result.error.fieldErrors)) {
    const match = /^items\.(\d+)\.(devicePriceInr|sort)$/.exec(key);
    const goodsId = match ? patches[Number(match[1])]?.goodsId : undefined;
    if (!match || !goodsId) continue;
    out[goodsId] = { ...out[goodsId], [match[2] === "sort" ? "sort" : "price"]: message };
  }
  return out;
}

function CellInput({
  value,
  onChange,
  error,
  width,
  placeholder,
  label,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  width: string;
  placeholder?: string;
  label: string;
  testId: string;
}) {
  return (
    <span className="block">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={Boolean(error)}
        className={`h-8 ${width} rounded-lg bg-secondary/50 border-border text-sm tabular-nums ${error ? "border-rose-400/60" : ""}`}
        data-testid={testId}
      />
      {error && <span className="mt-0.5 block text-[11px] text-rose-300">{error}</span>}
    </span>
  );
}

function GoodsPicker({
  open,
  sn,
  onClose,
  onAdded,
}: {
  open: boolean;
  sn: string;
  onClose: () => void;
  onAdded: (count: number) => void;
}) {
  const [goods, setGoods] = useState<AvailableGood[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState<Problem | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoods(null);
    setPicked(new Set());
    setProblem(null);
    fetchAvailableGoods(sn).then((result) => {
      if (result.ok) setGoods(result.data.items);
      else setProblem(problemOf(result));
    });
  }, [open, sn]);

  async function add() {
    setAdding(true);
    const result = await addMachineGoods(sn, [...picked]);
    setAdding(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    onAdded(picked.size);
  }

  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      wide
      title="Add goods"
      description="Library goods made for this machine's model that it doesn't sell yet. They are added as listed."
      testId="goods-picker"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={add}
            disabled={picked.size === 0 || adding}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-picked"
          >
            {adding ? "Adding…" : picked.size > 0 ? `Add ${picked.size}` : "Add"}
          </Button>
        </>
      }
    >
      <ProblemPanel problem={problem} testId="goods-picker-error" />
      <DataTable testId="goods-picker-table">
        <Head>
          <Col />
          <Col>Picture</Col>
          <Col>Goods Number</Col>
          <Col>Goods Name</Col>
          <Col>Specification</Col>
          <Col align="right">Price</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {!goods || goods.length === 0 ? (
            <NoData colSpan={6} loading={goods === null && !problem} />
          ) : (
            goods.map((good) => (
              <tr key={good.goodsId} data-testid={`pick-row-${good.goodsId}`}>
                <Cell>
                  <Checkbox
                    checked={picked.has(good.goodsId)}
                    onCheckedChange={(checked) =>
                      setPicked((s) => {
                        const next = new Set(s);
                        if (checked) next.add(good.goodsId);
                        else next.delete(good.goodsId);
                        return next;
                      })
                    }
                    aria-label={`Pick ${good.name}`}
                    data-testid={`pick-${good.goodsId}`}
                  />
                </Cell>
                <Cell>
                  <GoodsPicture url={good.image?.url} alt={good.name} size={32} />
                </Cell>
                <Cell className="font-mono text-xs">{good.no}</Cell>
                <Cell>{good.name}</Cell>
                <Cell className="text-muted-foreground">{good.spec || "—"}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(good.priceInr)}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </MachineDialog>
  );
}
