import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function FormSection({
  title,
  description,
  children,
  className,
  compact = false,
}: FormSectionProps) {
  if (compact) {
    return (
      <section
        className={cn(
          "rounded-xl border bg-card/50 shadow-sm overflow-hidden",
          className
        )}
      >
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        <div className="p-4">{children}</div>
      </section>
    );
  }

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div>
        <h2 className="text-lg font-semibold border-b pb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
