import type { ReactNode } from "react";

export default function ObrasciLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="w-full [&>*]:mx-auto [&>*]:w-full">
        {children}
      </div>
    </div>
  );
}
