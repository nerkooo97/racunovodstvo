"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors print:hidden"
    >
      Štampaj / PDF
    </button>
  );
}
