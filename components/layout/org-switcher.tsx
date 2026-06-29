"use client";

import { useOrganization } from "@/contexts/organization-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export default function OrgSwitcher() {
  const { organization, allOrganizations, switchOrganization } = useOrganization();

  if (!organization) {
    return (
      <Link
        href="/nova-djelatnost"
        className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-sm text-muted-foreground"
      >
        + Nova djelatnost
      </Link>
    );
  }

  const initials = organization.name.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left outline-none">
        <span className="w-8 h-8 rounded-md bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
            {organization.type === "obrt" ? "Obrt" : "d.o.o."}
          </p>
          <p className="text-sm font-medium truncate leading-tight">{organization.name}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allOrganizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => switchOrganization(org.id)}
            className="gap-2 cursor-pointer"
          >
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-muted font-bold shrink-0">
              {org.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate flex-1">{org.name}</span>
            {org.id === organization.id && (
              <span className="ml-auto text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organizations/new">+ Nova organizacija</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/organizations">Sve organizacije</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
