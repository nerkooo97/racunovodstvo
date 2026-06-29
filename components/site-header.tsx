import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface SiteHeaderProps {
  title?: string
}

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4">
        <SidebarTrigger className="-ml-1" />
        {title && (
          <>
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </>
        )}
      </div>
    </header>
  )
}
