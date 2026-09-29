"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAGE_SIZES } from "@shared/admin/machines";
import type { MachineCall } from "@/lib/adminMachineApi";
import { ErrorPanel } from "../AdminUi";

export const REFRESH_NOTE = "Sent to the machine. It updates within about a minute while online.";

export function MachinesHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          data-testid="link-back"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-black text-foreground tracking-tight mb-1">{title}</h1>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function formatRupees(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const IST_PARTS = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

export function formatIstStamp(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    IST_PARTS.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  const hour = part("hour") === "24" ? "00" : part("hour");
  return `${part("year")}-${part("month")}-${part("day")} ${hour}:${part("minute")}:${part("second")}`;
}

export function problemOf<T>(result: MachineCall<T>): Problem | null {
  return result.ok ? null : { message: result.error.message, issues: result.issues };
}

export type Problem = { message: string; issues: string[] };

export function ProblemPanel({ problem, testId }: { problem: Problem | null; testId: string }) {
  if (!problem) return null;
  return (
    <div className="mb-4">
      <ErrorPanel message={problem.message} issues={problem.issues} testId={testId} />
    </div>
  );
}

const filterInputClass = "bg-card border-border h-9 rounded-lg text-sm";

export function FilterBar({
  onSearch,
  onReset,
  children,
}: {
  onSearch: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
      data-testid="machine-filters"
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="rounded-lg cursor-pointer" data-testid="button-search">
          Search
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReset}
          className="rounded-lg cursor-pointer"
          data-testid="button-reset"
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

export function TextFilter({
  label,
  value,
  onChange,
  testId,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
  type?: "text" | "datetime-local" | "date";
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${filterInputClass} ${type === "datetime-local" ? "w-52" : "w-40"}`}
        data-testid={testId}
      />
    </label>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  testId: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${filterInputClass} w-36 border px-2 text-foreground cursor-pointer`}
        data-testid={testId}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DataTable({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-x-auto" data-testid={testId}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Head({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-secondary/50 border-b border-border">
      <tr>{children}</tr>
    </thead>
  );
}

export function Col({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Cell({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td className={`px-3 py-2.5 align-middle ${align === "right" ? "text-right" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function NoData({ colSpan, loading }: { colSpan: number; loading: boolean }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="no-data">
        {loading ? "Loading…" : "No Data"}
      </td>
    </tr>
  );
}

export function Pager({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const [goTo, setGoTo] = useState("");
  const numbers = pageWindow(page, pages);
  const jump = () => {
    const target = Number(goTo);
    if (Number.isInteger(target) && target >= 1 && target <= pages) onPage(target);
    setGoTo("");
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground" data-testid="pager">
      <span data-testid="pager-total">Total {total}</span>
      <select
        value={pageSize}
        onChange={(event) => onPageSize(Number(event.target.value))}
        className="h-8 rounded-lg border border-border bg-card px-2 text-foreground cursor-pointer"
        aria-label="Rows per page"
        data-testid="pager-size"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}/page
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => onPage(page - 1)} testId="pager-prev">
          ‹
        </PageButton>
        {numbers.map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="px-1">
              …
            </span>
          ) : (
            <PageButton key={n} active={n === page} onClick={() => onPage(n)} testId={`pager-page-${n}`}>
              {n}
            </PageButton>
          ),
        )}
        <PageButton disabled={page >= pages} onClick={() => onPage(page + 1)} testId="pager-next">
          ›
        </PageButton>
      </div>
      <label className="flex items-center gap-1.5">
        Go to
        <Input
          value={goTo}
          onChange={(event) => setGoTo(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") jump();
          }}
          onBlur={() => goTo && jump()}
          inputMode="numeric"
          className="h-8 w-14 rounded-lg bg-card border-border text-center"
          data-testid="pager-goto"
        />
      </label>
    </div>
  );
}

function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push(null);
  for (let n = start; n <= end; n++) out.push(n);
  if (end < pages - 1) out.push(null);
  out.push(pages);
  return out;
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={`h-8 min-w-8 rounded-lg px-2 text-sm tabular-nums cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary text-foreground"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export function LoadMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="mt-4">
      <Button
        variant="outline"
        onClick={onClick}
        disabled={loading}
        className="rounded-xl cursor-pointer"
        data-testid="button-load-more"
      >
        {loading ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}

export function GoodsPicture({ url, alt, size = 40 }: { url: string | null | undefined; alt: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size };
  if (!url || broken) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground/60"
        style={box}
        aria-label="No picture"
      >
        <ImageOff className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      style={box}
      className="rounded-lg border border-border object-cover"
      onError={() => setBroken(true)}
    />
  );
}

export function MachineLabel({ deviceExtNo, sn }: { deviceExtNo: string; sn: string }) {
  return (
    <span>
      <span className="font-semibold text-foreground">{deviceExtNo || "—"}</span>
      <span className="block font-mono text-[11px] text-muted-foreground">{sn}</span>
    </span>
  );
}

export function MachineDialog({
  open,
  onClose,
  title,
  description,
  footer,
  wide,
  testId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  testId: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* The portal mounts on body, outside AdminShell, so the console theme has to be set again here. */}
      <DialogContent
        className={`dark theme-console border-border bg-card rounded-2xl max-h-[85vh] overflow-y-auto ${wide ? "sm:max-w-3xl" : ""}`}
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
  testId,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  testId: string;
}) {
  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      testId={testId}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl cursor-pointer"
            data-testid={`${testId}-confirm`}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
