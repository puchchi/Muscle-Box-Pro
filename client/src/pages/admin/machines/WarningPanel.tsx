export function WarningPanel({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="status" data-testid={testId}>
      {children}
    </p>
  );
}
