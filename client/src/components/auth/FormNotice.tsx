import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export function FormNotice({ title, children, testId }: { title: string; children?: ReactNode; testId: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
      role="alert"
      data-testid={testId}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" aria-hidden="true" />
      <div className="min-w-0 text-sm leading-relaxed">
        <p className="font-semibold text-gray-900">{title}</p>
        {children && <div className="mt-0.5 text-gray-600">{children}</div>}
      </div>
    </div>
  );
}
