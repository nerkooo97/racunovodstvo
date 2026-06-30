"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import OrgSwitcher from "@/components/layout/org-switcher"
import { useOrganization } from "@/contexts/organization-context"
import { getVisibleNavSections } from "@/lib/organization/nav"

const ORG_TYPE_BADGE: Record<"obrt" | "doo", { label: string; className: string }> = {
  obrt: {
    label: "Obrt",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  doo: {
    label: "D.O.O.",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userEmail: string
}

export function AppSidebar({ userEmail, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { organization } = useOrganization()
  const nav = getVisibleNavSections(organization?.type)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="h-12 border-b flex items-center px-3 py-0 justify-center">
        <OrgSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {nav.map((section, idx) => (
          <SidebarGroup key={idx} className="py-1">
            {section.title && (
              <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 py-1 flex items-center gap-1.5">
                {section.title}
                {section.orgType && (
                  <span
                    className={`inline-flex items-center rounded px-1 py-0 text-[9px] font-bold tracking-normal normal-case leading-4 ${ORG_TYPE_BADGE[section.orgType].className}`}
                  >
                    {ORG_TYPE_BADGE[section.orgType].label}
                  </span>
                )}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"))
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t pt-2">
        <NavUser
          user={{
            name: userEmail.split("@")[0],
            email: userEmail,
            avatar: "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
