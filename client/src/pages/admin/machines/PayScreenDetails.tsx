"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoodInput } from "@shared/admin/machines";
import type { Good } from "@shared/admin/machinesSchema";
import { Card } from "../AdminUi";
import { FormRow, TextInput } from "./formBits";

export const DETAIL_LIMITS = {
  tagline: 80,
  nutritionRows: 8,
  nutritionName: 24,
  nutritionValue: 16,
  ingredients: 20,
  ingredient: 40,
};

const STARTER_ROWS = ["Energy", "Protein", "Carbohydrates", "Fat"];

type NutritionDraft = { key: number; name: string; value: string };
type IngredientDraft = { key: number; text: string };

export type DetailsDraft = {
  tagline: string;
  nutrition: NutritionDraft[];
  ingredients: IngredientDraft[];
};

type Details = Pick<GoodInput, "tagline" | "nutrition" | "ingredients">;

let nextKey = 1;

export function detailsDraftOf(good: Good | null): DetailsDraft {
  if (!good) {
    return {
      tagline: "",
      nutrition: STARTER_ROWS.map((name) => ({
        key: nextKey++,
        name,
        value: "",
      })),
      ingredients: [],
    };
  }
  return {
    tagline: good.tagline,
    nutrition: good.nutrition.map((row) => ({ key: nextKey++, ...row })),
    ingredients: good.ingredients.map((text) => ({ key: nextKey++, text })),
  };
}

export function splitIngredients(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function checkDetails(draft: DetailsDraft): {
  errors: Record<string, string>;
  details: Details;
  sent: { nutrition: number[]; ingredients: number[] };
} {
  const errors: Record<string, string> = {};
  const tagline = draft.tagline.trim();
  if (tagline.length > DETAIL_LIMITS.tagline) errors.tagline = `Up to ${DETAIL_LIMITS.tagline} characters.`;

  const sentNutrition: number[] = [];
  const nutrition: Details["nutrition"] = [];
  draft.nutrition.forEach((row, i) => {
    const name = row.name.trim();
    const value = row.value.trim();
    if (!value) return;
    if (!name) errors[`nutrition.${i}.name`] = "Required.";
    else if (name.length > DETAIL_LIMITS.nutritionName) errors[`nutrition.${i}.name`] = `Up to ${DETAIL_LIMITS.nutritionName} characters.`;
    if (value.length > DETAIL_LIMITS.nutritionValue) errors[`nutrition.${i}.value`] = `Up to ${DETAIL_LIMITS.nutritionValue} characters.`;
    sentNutrition.push(i);
    nutrition.push({ name, value });
  });
  if (nutrition.length > DETAIL_LIMITS.nutritionRows) errors.nutrition = `Up to ${DETAIL_LIMITS.nutritionRows} rows.`;

  const sentIngredients: number[] = [];
  const ingredients: string[] = [];
  draft.ingredients.forEach((item, i) => {
    const text = item.text.trim();
    if (!text) return;
    if (text.length > DETAIL_LIMITS.ingredient) errors[`ingredients.${i}`] = `Up to ${DETAIL_LIMITS.ingredient} characters.`;
    sentIngredients.push(i);
    ingredients.push(text);
  });
  if (ingredients.length > DETAIL_LIMITS.ingredients) errors.ingredients = `Up to ${DETAIL_LIMITS.ingredients} ingredients.`;

  return {
    errors,
    details: { tagline, nutrition, ingredients },
    sent: { nutrition: sentNutrition, ingredients: sentIngredients },
  };
}

export function draftErrorsOf(
  server: Record<string, string>,
  sent: { nutrition: number[]; ingredients: number[] },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(server)) {
    const match = /^(nutrition|ingredients)\.(\d+)(\..+)?$/.exec(key);
    const list = match ? sent[match[1] as "nutrition" | "ingredients"] : undefined;
    const at = match && list ? list[Number(match[2])] : undefined;
    out[at === undefined ? key : `${match![1]}.${at}${match![3] ?? ""}`] = message;
  }
  return out;
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function useDragOrder<T>(setList: (update: (list: T[]) => T[]) => void) {
  const [dragging, setDragging] = useState<number | null>(null);
  const rowProps = (i: number) => ({
    onDragOver: (event: React.DragEvent) => {
      if (dragging === null) return;
      event.preventDefault();
      if (dragging !== i) {
        setList((list) => reorder(list, dragging, i));
        setDragging(i);
      }
    },
    onDrop: (event: React.DragEvent) => event.preventDefault(),
  });
  const handleProps = (i: number, label: string) => ({
    draggable: true,
    "aria-label": `Reorder ${label}. Drag, or use the up and down arrow keys.`,
    title: "Drag to reorder",
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      setDragging(i);
    },
    onDragEnd: () => setDragging(null),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      setList((list) => reorder(list, i, i + (event.key === "ArrowUp" ? -1 : 1)));
    },
  });
  return { dragging, rowProps, handleProps };
}

function DragHandle(props: ReturnType<ReturnType<typeof useDragOrder>["handleProps"]>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-10 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

function DeleteButton({ label, onClick, testId }: { label: string; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
      data-testid={testId}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}

const rowError = (message: string | undefined) =>
  message ? <span className="mt-0.5 block text-[11px] text-rose-300">{message}</span> : null;

export function PayScreenDetails({
  draft,
  onChange,
  errors,
}: {
  draft: DetailsDraft;
  onChange: (update: (draft: DetailsDraft) => DetailsDraft) => void;
  errors: Record<string, string>;
}) {
  const setNutrition = (update: (rows: NutritionDraft[]) => NutritionDraft[]) =>
    onChange((d) => ({ ...d, nutrition: update(d.nutrition) }));
  const setIngredients = (update: (items: IngredientDraft[]) => IngredientDraft[]) =>
    onChange((d) => ({ ...d, ingredients: update(d.ingredients) }));
  const nutritionDrag = useDragOrder(setNutrition);
  const ingredientDrag = useDragOrder(setIngredients);

  function pasteIngredients(event: React.ClipboardEvent<HTMLInputElement>, index: number) {
    const parts = splitIngredients(event.clipboardData.getData("text"));
    if (parts.length < 2) return;
    event.preventDefault();
    setIngredients((items) => {
      const before = items.slice(0, index);
      const after = items.slice(index + 1);
      const room = DETAIL_LIMITS.ingredients - before.length - after.length;
      return [...before, ...parts.slice(0, Math.max(room, 1)).map((text) => ({ key: nextKey++, text })), ...after];
    });
  }

  return (
    <Card
      title="Pay screen details"
      note="Shown on the machine's pay screen before the customer orders. All optional."
      testId="card-pay-screen-details"
    >
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <FormRow
            label="Tagline"
            htmlFor="tagline"
            error={errors.tagline}
            hint={`${draft.tagline.trim().length}/${DETAIL_LIMITS.tagline} characters`}
          >
            <TextInput
              id="tagline"
              value={draft.tagline}
              onChange={(tagline) => onChange((d) => ({ ...d, tagline }))}
              placeholder="Chilled chocolate flavour shake with monk fruit goodness"
              maxLength={DETAIL_LIMITS.tagline}
            />
          </FormRow>

          <section aria-labelledby="nutrition-heading" data-testid="nutrition-editor">
            <h3 id="nutrition-heading" className="text-sm font-semibold text-muted-foreground">
              Nutrition (per serving)
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">Rows without a value are left out when you save.</p>
            <ul className="space-y-2">
              {draft.nutrition.map((row, i) => (
                <li
                  key={row.key}
                  {...nutritionDrag.rowProps(i)}
                  className={`flex items-start gap-2 rounded-lg ${nutritionDrag.dragging === i ? "bg-secondary/60" : ""}`}
                  data-testid={`nutrition-row-${i}`}
                >
                  <DragHandle {...nutritionDrag.handleProps(i, row.name || `row ${i + 1}`)} />
                  <span className="min-w-0 flex-[3]">
                    <TextInput
                      id={`nutrition-${i}-name`}
                      value={row.name}
                      onChange={(name) => setNutrition((rows) => rows.map((r) => (r.key === row.key ? { ...r, name } : r)))}
                      placeholder="Name"
                      aria-label={`Nutrition row ${i + 1} name`}
                      maxLength={DETAIL_LIMITS.nutritionName}
                    />
                    {rowError(errors[`nutrition.${i}.name`])}
                  </span>
                  <span className="min-w-0 flex-[2]">
                    <TextInput
                      id={`nutrition-${i}-value`}
                      value={row.value}
                      onChange={(value) => setNutrition((rows) => rows.map((r) => (r.key === row.key ? { ...r, value } : r)))}
                      placeholder="with its unit, for example 21 g"
                      aria-label={`${row.name || `Nutrition row ${i + 1}`} value`}
                      maxLength={DETAIL_LIMITS.nutritionValue}
                    />
                    {rowError(errors[`nutrition.${i}.value`])}
                  </span>
                  <DeleteButton
                    label={`Delete ${row.name || `row ${i + 1}`}`}
                    onClick={() => setNutrition((rows) => rows.filter((r) => r.key !== row.key))}
                    testId={`nutrition-${i}-delete`}
                  />
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={draft.nutrition.length >= DETAIL_LIMITS.nutritionRows}
              onClick={() => setNutrition((rows) => [...rows, { key: nextKey++, name: "", value: "" }])}
              className="mt-2 rounded-xl cursor-pointer"
              data-testid="button-add-nutrition"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add row
            </Button>
            <span className="ml-2 text-xs text-muted-foreground">
              {draft.nutrition.length}/{DETAIL_LIMITS.nutritionRows} rows
            </span>
            {rowError(errors.nutrition)}
          </section>

          <section aria-labelledby="ingredients-heading" data-testid="ingredients-editor">
            <h3 id="ingredients-heading" className="text-sm font-semibold text-muted-foreground">
              Ingredients
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">In order. Paste a comma-separated list to add several at once.</p>
            <ul className="space-y-2">
              {draft.ingredients.map((item, i) => (
                <li
                  key={item.key}
                  {...ingredientDrag.rowProps(i)}
                  className={`flex items-start gap-2 rounded-lg ${ingredientDrag.dragging === i ? "bg-secondary/60" : ""}`}
                  data-testid={`ingredient-row-${i}`}
                >
                  <DragHandle {...ingredientDrag.handleProps(i, item.text || `ingredient ${i + 1}`)} />
                  <span className="min-w-0 flex-1">
                    <TextInput
                      id={`ingredient-${i}`}
                      value={item.text}
                      onChange={(text) => setIngredients((items) => items.map((it) => (it.key === item.key ? { ...it, text } : it)))}
                      onPaste={(event) => pasteIngredients(event, i)}
                      aria-label={`Ingredient ${i + 1}`}
                      maxLength={DETAIL_LIMITS.ingredient}
                    />
                    {rowError(errors[`ingredients.${i}`])}
                  </span>
                  <DeleteButton
                    label={`Delete ${item.text || `ingredient ${i + 1}`}`}
                    onClick={() => setIngredients((items) => items.filter((it) => it.key !== item.key))}
                    testId={`ingredient-${i}-delete`}
                  />
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={draft.ingredients.length >= DETAIL_LIMITS.ingredients}
              onClick={() => setIngredients((items) => [...items, { key: nextKey++, text: "" }])}
              className="mt-2 rounded-xl cursor-pointer"
              data-testid="button-add-ingredient"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add ingredient
            </Button>
            <span className="ml-2 text-xs text-muted-foreground">
              {draft.ingredients.length}/{DETAIL_LIMITS.ingredients}
            </span>
            {rowError(errors.ingredients)}
          </section>
        </div>

        <DetailsPreview draft={draft} />
      </div>
    </Card>
  );
}

function DetailsPreview({ draft }: { draft: DetailsDraft }) {
  const { details } = checkDetails(draft);
  const empty = !details.tagline && details.nutrition.length === 0 && details.ingredients.length === 0;
  return (
    <aside aria-label="Preview" className="self-start lg:sticky lg:top-4" data-testid="details-preview">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</span>
      <div className="rounded-xl border border-border bg-black/40 p-4 text-sm text-foreground">
        {empty ? (
          <p className="text-xs text-muted-foreground">Nothing to show. The machine keeps its usual pay screen.</p>
        ) : (
          <div className="space-y-3">
            {details.tagline && <p className="italic text-foreground/90">{details.tagline}</p>}
            {details.nutrition.length > 0 && (
              <dl className="divide-y divide-border/60">
                {details.nutrition.map((row, i) => (
                  <div key={i} className="flex justify-between gap-3 py-1">
                    <dt className="text-muted-foreground">{row.name}</dt>
                    <dd className="text-right tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {details.ingredients.length > 0 && <p className="text-xs text-muted-foreground">{details.ingredients.join(" · ")}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
