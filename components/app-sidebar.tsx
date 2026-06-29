"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconCalculator } from "@tabler/icons-react"
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userEmail: string
}

export function AppSidebar({ userEmail, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { organization } = useOrganization()
  const nav = getVisibleNavSections(organization?.type)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b pb-3">
        <div className="flex items-center gap-2.5 px-1 py-1">
        </div>
        <div className="mt-2">
          <OrgSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {nav.map((section, idx) => (
          <SidebarGroup key={idx} className="py-1">
            {section.title && (
              <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 py-1">
                {section.title}
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
