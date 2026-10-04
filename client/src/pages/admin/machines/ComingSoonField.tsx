import { Switch } from "@/components/ui/switch";
import { Pill } from "../AdminUi";

export function ComingSoonField({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="space-y-1.5" data-testid="field-coming-soon">
      <label htmlFor="coming-soon" className="block text-sm font-semibold text-muted-foreground">
        Coming soon
      </label>
      <div className="flex h-9 items-center gap-3">
        <Switch id="coming-soon" checked={value} onCheckedChange={onChange} data-testid="switch-coming-soon" />
        {value && <ComingSoonPill />}
      </div>
      <p className="text-xs text-muted-foreground">
        Shows the drink on the machine&apos;s menu with a Coming soon sash and no price. It can&apos;t be bought or redeemed until
        you turn this off. It needs no recipe yet.
      </p>
    </div>
  );
}

export function ComingSoonPill({ testId = "coming-soon-pill" }: { testId?: string }) {
  return (
    <Pill className="bg-sky-400/10 text-sky-200" testId={testId}>
      Coming soon
    </Pill>
  );
}
