"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMaterials, uploadGoodsPicture, type MachineCall } from "@/lib/adminMachineApi";
import type { GoodInput, RecipeLineInput, ServeTemp } from "@shared/admin/machines";
import type { Good, MachineModel, Material } from "@shared/admin/machinesSchema";
import { Card, SuccessPanel } from "../AdminUi";
import { FormRow, hasTwoDecimalsAtMost, NativeSelect, parseNumber, TextInput } from "./formBits";
import { GoodsPicture, problemOf, ProblemPanel, REFRESH_NOTE, type Problem } from "./MachinesUi";
import { checkDetails, detailsDraftOf, draftErrorsOf, PayScreenDetails, type DetailsDraft } from "./PayScreenDetails";
import { ComingSoonField } from "./ComingSoonField";
import { ServeTempField } from "./ServeTempField";

const MAX_LINES = 20;
const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
const MIN_PICTURE_PX = 420;

type Line = { key: number; materialId: string; amount: string; waterType: "1" | "2" };

type Values = {
  no: string;
  name: string;
  nameEn: string;
  spec: string;
  price: string;
  sort: string;
  modelId: string;
};

export type AmountField = "qty" | "waterQty" | "kqty";

export function amountFieldOf(rawType: string | undefined): AmountField {
  const type = (rawType ?? "").toLowerCase();
  if (type.includes("water")) return "waterQty";
  if (type.includes("ice")) return "kqty";
  return "qty";
}

const AMOUNT_LABEL: Record<AmountField, string> = { qty: "Powder amount", waterQty: "Water amount", kqty: "Ice amount" };

const isCup = (m: Material) => m.rawType.toLowerCase().includes("cup");

let nextKey = 1;

function linesOf(good: Good | null): Line[] {
  if (!good) return [{ key: nextKey++, materialId: "", amount: "", waterType: "1" }];
  return good.recipe.map((line) => ({
    key: nextKey++,
    materialId: line.materialId,
    amount: String(line.waterQty || line.kqty || line.qty || ""),
    waterType: line.waterType === 2 ? "2" : "1",
  }));
}

export function checkPicture(file: { type: string; size: number }, dims: { width: number; height: number } | null): string | null {
  if (file.type !== "image/png" && file.type !== "image/jpeg") return "PNG or JPG only.";
  if (file.size > MAX_PICTURE_BYTES) return "Up to 2 MB.";
  if (!dims) return "This isn't a PNG or JPG picture.";
  if (dims.width !== dims.height) return `The picture must be square. This one is ${dims.width}×${dims.height} px.`;
  if (dims.width < MIN_PICTURE_PX) {
    return `The picture must be at least ${MIN_PICTURE_PX}×${MIN_PICTURE_PX} px. This one is ${dims.width}×${dims.height} px.`;
  }
  return null;
}

function readDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function validateGood(
  values: Values,
  lines: Line[],
  image: string | null,
  materials: Material[],
  details: DetailsDraft = { tagline: "", nutrition: [], ingredients: [] },
  serveTemp: ServeTemp | null = null,
  comingSoon = false,
): { errors: Record<string, string>; input: GoodInput | null; sent: ReturnType<typeof checkDetails>["sent"] } {
  const checkedDetails = checkDetails(details);
  const errors: Record<string, string> = { ...checkedDetails.errors };
  const sent = checkedDetails.sent;
  const no = values.no.trim();
  if (!no) errors.no = "Required.";
  else if (no.length > 20) errors.no = "Up to 20 characters.";
  const name = values.name.trim();
  if (!name) errors.name = "Required.";
  else if (name.length > 40) errors.name = "Up to 40 characters.";
  const nameEn = values.nameEn.trim();
  if (nameEn.length > 40) errors.nameEn = "Up to 40 characters.";
  const spec = values.spec.trim();
  if (spec.length > 40) errors.spec = "Up to 40 characters.";
  const price = parseNumber(values.price);
  if (price === null) errors.priceInr = "Required.";
  else if (Number.isNaN(price) || price < 0 || price > 10000) errors.priceInr = "0 to 10000.";
  else if (!hasTwoDecimalsAtMost(price)) errors.priceInr = "Up to 2 decimals.";
  const sort = parseNumber(values.sort);
  if (sort === null) errors.sort = "Required.";
  else if (Number.isNaN(sort) || !Number.isInteger(sort) || sort < -9999 || sort > 9999) {
    errors.sort = "A whole number, -9999 to 9999.";
  }
  if (!values.modelId) errors.modelId = "Required.";
  if (!image) errors.image = "Upload a picture.";

  const noRecipe = comingSoon && lines.every((line) => !line.materialId && !line.amount.trim());
  if (!noRecipe && lines.length === 0) errors.recipe = "Add at least one line.";
  else if (lines.length > MAX_LINES) errors.recipe = `Up to ${MAX_LINES} lines.`;
  const byId = new Map(materials.map((m) => [m.materialId, m]));
  const recipe: RecipeLineInput[] = (noRecipe ? [] : lines).map((line, i) => {
    const at = `recipe.${i}`;
    const material = byId.get(line.materialId);
    const field = amountFieldOf(material?.rawType);
    const amount = parseNumber(line.amount);
    if (!material) errors[`${at}.materialId`] = "Choose a material.";
    else if (!material.enabled) errors[`${at}.materialId`] = `${material.name} is disabled.`;
    if (amount === null || Number.isNaN(amount) || amount <= 0 || amount > 100000) errors[`${at}.${field}`] = "Must be above 0.";
    const out: RecipeLineInput = {
      materialId: line.materialId,
      qty: 0,
      waterQty: 0,
      waterType: line.waterType === "2" ? 2 : 1,
      kqty: 0,
    };
    out[field] = amount ?? 0;
    return out;
  });

  if (Object.keys(errors).length > 0) return { errors, input: null, sent };
  return {
    errors,
    sent,
    input: {
      no,
      name,
      nameEn,
      spec,
      priceInr: price ?? 0,
      sort: sort ?? 0,
      modelId: values.modelId,
      image: { url: image! },
      recipe,
      ...checkedDetails.details,
      serveTemp,
      comingSoon,
    },
  };
}

export function GoodEditor({
  good,
  models,
  onSubmit,
  onReload,
}: {
  good: Good | null;
  models: MachineModel[];
  onSubmit: (input: GoodInput) => Promise<MachineCall<{ good: Good; machinesUpdated?: number }>>;
  onReload?: () => void;
}) {
  const creating = good === null;
  const [values, setValues] = useState<Values>(() => ({
    no: good?.no ?? "",
    name: good?.name ?? "",
    nameEn: good?.nameEn ?? "",
    spec: good?.spec ?? "",
    price: good ? String(good.priceInr) : "",
    sort: good ? String(good.sort) : "0",
    modelId: good?.modelId ?? models[0]?.id ?? "",
  }));
  const [lines, setLines] = useState<Line[]>(() => linesOf(good));
  const [details, setDetails] = useState<DetailsDraft>(() => detailsDraftOf(good));
  const [serveTemp, setServeTemp] = useState<ServeTemp | null>(good?.serveTemp ?? null);
  const [comingSoon, setComingSoon] = useState(good?.comingSoon ?? false);
  const [image, setImage] = useState<string | null>(good?.image?.url ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!values.modelId) return;
    fetchMaterials(values.modelId).then((result) => {
      if (result.ok) setMaterials(result.data.items);
      else setProblem(problemOf(result));
    });
  }, [values.modelId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (key: keyof Values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const move = (index: number, by: -1 | 1) =>
    setLines((ls) => {
      const next = [...ls];
      const [line] = next.splice(index, 1);
      next.splice(index + by, 0, line!);
      return next;
    });

  async function pickPicture(file: File | undefined) {
    if (!file) return;
    const local = URL.createObjectURL(file);
    const refusal = checkPicture(file, await readDimensions(local));
    if (refusal) {
      URL.revokeObjectURL(local);
      setErrors((e) => ({ ...e, image: refusal }));
      return;
    }
    setPreview(local);
    setErrors(({ image: _image, ...rest }) => rest);
    setUploading(true);
    const result = await uploadGoodsPicture(file);
    setUploading(false);
    if (!result.ok) {
      setPreview(null);
      setErrors((e) => ({ ...e, image: result.error.fieldErrors?.file ?? result.error.message }));
      return;
    }
    setImage(result.data.url);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(null);
    const checked = validateGood(values, lines, image, materials, details, serveTemp, comingSoon);
    setErrors(checked.errors);
    if (!checked.input) {
      setProblem({ message: "Some fields need fixing.", issues: [] });
      return;
    }
    setSaving(true);
    const result = await onSubmit(checked.input);
    setSaving(false);
    if (!result.ok) {
      setErrors(draftErrorsOf(result.error.fieldErrors ?? {}, checked.sent));
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setProblem(null);
    setStale(false);
    const n = result.data.machinesUpdated;
    if (!creating) {
      setSaved(n ? `Saved. ${n} machine${n === 1 ? "" : "s"} list this. ${REFRESH_NOTE}` : "Saved.");
    }
  }

  const usable = materials.filter((m) => !isCup(m));
  const materialOf = (id: string) => materials.find((m) => m.materialId === id);
  const firstWater = lines[0]?.waterType === "2" ? "Cold" : "Hot";

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid="good-form">
      <ProblemPanel problem={problem} testId="good-error" />
      {stale && onReload && (
        <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-xl cursor-pointer" data-testid="button-reload-good">
          Reload
        </Button>
      )}
      {saved && <SuccessPanel testId="good-saved">{saved}</SuccessPanel>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card title="Goods" testId="card-good-fields">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormRow label="Goods Number" htmlFor="no" error={errors.no} hint="Unique. Up to 20 characters.">
              <TextInput id="no" value={values.no} onChange={set("no")} mono />
            </FormRow>
            <FormRow label="Model" htmlFor="modelId" error={errors.modelId} hint={creating ? "Decides which materials the recipe can use. It can't be changed later." : undefined}>
              <NativeSelect
                id="modelId"
                value={values.modelId}
                onChange={(value) => {
                  set("modelId")(value);
                  setLines(linesOf(null));
                }}
                options={models.map((m) => ({ value: m.id, label: m.name }))}
                disabled={!creating}
              />
            </FormRow>
            <FormRow label="Name" htmlFor="name" error={errors.name}>
              <TextInput id="name" value={values.name} onChange={set("name")} />
            </FormRow>
            <FormRow
              label="English name"
              htmlFor="nameEn"
              error={errors.nameEn}
              hint="The machine shows it next to Name. For an English-only menu, leave it empty."
            >
              <TextInput id="nameEn" value={values.nameEn} onChange={set("nameEn")} />
            </FormRow>
            <FormRow label="Specification" htmlFor="spec" error={errors.spec} hint="For example 300 ml. Not shown on the machine.">
              <TextInput id="spec" value={values.spec} onChange={set("spec")} />
            </FormRow>
            <FormRow label="Price (₹)" htmlFor="priceInr" error={errors.priceInr} hint="0 makes it free.">
              <TextInput id="priceInr" value={values.price} onChange={set("price")} inputMode="decimal" />
            </FormRow>
            <FormRow label="Sort" htmlFor="sort" error={errors.sort} hint="Lower comes first.">
              <TextInput id="sort" value={values.sort} onChange={set("sort")} inputMode="numeric" />
            </FormRow>
            <ServeTempField value={serveTemp} onChange={setServeTemp} error={errors.serveTemp} />
            <ComingSoonField value={comingSoon} onChange={setComingSoon} />
          </div>
        </Card>

        <Card title="Picture" note="PNG or JPG, square, at least 420×420 px, up to 2 MB." testId="card-good-picture">
          <div className="space-y-3 p-4 sm:p-5">
            <GoodsPicture key={preview ?? image ?? "none"} url={preview ?? image} alt="Goods picture" size={160} />
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(event) => {
                void pickPicture(event.target.files?.[0]);
                event.target.value = "";
              }}
              data-testid="input-picture"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="rounded-xl cursor-pointer"
              data-testid="button-upload-picture"
            >
              {uploading ? "Uploading…" : image ? "Replace picture" : "Upload picture"}
            </Button>
            {errors.image && (
              <p className="text-xs text-rose-300" role="alert" data-testid="error-image">
                {errors.image}
              </p>
            )}
          </div>
        </Card>
      </div>

      <PayScreenDetails draft={details} onChange={setDetails} errors={errors} />

      <Card title="Recipe" note="Amounts are board units: motor and pump time on the machine. Machine calibration scales them." testId="card-recipe">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Amount (board units)</th>
                <th className="px-3 py-2">Water</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {lines.map((line, i) => {
                const material = materialOf(line.materialId);
                const field = amountFieldOf(material?.rawType);
                const options = [
                  { value: "", label: "Choose…" },
                  ...usable
                    .filter((m) => m.enabled || m.materialId === line.materialId)
                    .map((m) => ({ value: m.materialId, label: `Slot ${m.position}: ${m.name}${m.enabled ? "" : " (disabled)"}` })),
                ];
                const amountError = errors[`recipe.${i}.${field}`];
                return (
                  <tr key={line.key} data-testid={`recipe-line-${i}`}>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 min-w-[14rem]">
                      <NativeSelect
                        id={`recipe-${i}-material`}
                        value={line.materialId}
                        onChange={(materialId) => setLine(line.key, { materialId })}
                        options={options}
                      />
                      {errors[`recipe.${i}.materialId`] && (
                        <span className="mt-0.5 block text-[11px] text-rose-300">{errors[`recipe.${i}.materialId`]}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[10rem]">
                      <span className="mb-1 block text-[11px] text-muted-foreground">{AMOUNT_LABEL[field]}</span>
                      <TextInput
                        id={`recipe-${i}-amount`}
                        value={line.amount}
                        onChange={(amount) => setLine(line.key, { amount })}
                        inputMode="decimal"
                      />
                      {amountError && <span className="mt-0.5 block text-[11px] text-rose-300">{amountError}</span>}
                    </td>
                    <td className="px-3 py-2 min-w-[7rem]">
                      <span className="mb-1 block text-[11px] text-muted-foreground">&nbsp;</span>
                      <NativeSelect
                        id={`recipe-${i}-water`}
                        value={line.waterType}
                        onChange={(waterType) => setLine(line.key, { waterType: waterType === "2" ? "2" : "1" })}
                        options={[
                          { value: "1", label: "Hot" },
                          { value: "2", label: "Cold" },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)} testId={`recipe-${i}-up`}>
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Move down" disabled={i === lines.length - 1} onClick={() => move(i, 1)} testId={`recipe-${i}-down`}>
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Delete line"
                        disabled={lines.length === 1}
                        onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                        testId={`recipe-${i}-delete`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground" data-testid="recipe-water-hint">
            The first line is {firstWater}, so a {firstWater.toLowerCase()} water fault makes this drink sold out. Cups are added
            automatically.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lines.length >= MAX_LINES}
            onClick={() => setLines((ls) => [...ls, { key: nextKey++, materialId: "", amount: "", waterType: ls[0]?.waterType ?? "1" }])}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-line"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add line
          </Button>
        </div>
        {errors.recipe && (
          <p className="px-4 pb-3 text-xs text-rose-300 sm:px-5" role="alert">
            {errors.recipe}
          </p>
        )}
      </Card>

      <Button type="submit" disabled={saving || uploading} className="rounded-xl cursor-pointer" data-testid="button-save-good">
        {saving ? "Saving…" : creating ? "Create goods" : "Save"}
      </Button>
    </form>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  testId,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
      data-testid={testId}
    >
      {children}
    </button>
  );
}
