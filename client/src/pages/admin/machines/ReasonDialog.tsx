"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MachineDialog } from "./MachinesUi";

const REASON_MAX = 200;

export function ReasonField({ value, onChange, testId, placeholder = "For example: the machine didn't pour the drink" }: { value: string; onChange: (v: string) => void; testId: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      Reason
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={REASON_MAX}
        rows={3}
        placeholder={placeholder}
        className="rounded-xl"
        data-testid={testId}
      />
    </label>
  );
}

export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy,
  onClose,
  onConfirm,
  testId,
  ready = true,
  placeholder,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  testId: string;
  ready?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      testId={testId}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(trimmed)}
            disabled={busy || !ready || trimmed.length === 0}
            className="rounded-xl cursor-pointer"
            data-testid={`${testId}-confirm`}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <ReasonField value={reason} onChange={setReason} testId={`${testId}-reason`} placeholder={placeholder} />
    </MachineDialog>
  );
}
