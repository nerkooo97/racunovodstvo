"use client";

import Image from "next/image";
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
import { proxyImageUrl } from "@/lib/image-proxy";

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
  const logoSrc = proxyImageUrl(organization.logo_url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-1 h-9 rounded-md hover:bg-accent text-left outline-none">
        {logoSrc ? (
          <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 border bg-muted">
            <Image
              src={logoSrc}
              alt={organization.name}
              width={28}
              height={28}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
        ) : (
          <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shrink-0">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">
            {organization.type === "obrt" ? "Obrt" : "d.o.o."}
          </p>
          <p className="text-xs font-medium truncate leading-tight mt-0.5">{organization.name}</p>
        </div>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allOrganizations.map((org) => {
          const orgLogo = proxyImageUrl(org.logo_url);
          return (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => switchOrganization(org.id)}
              className="gap-2 cursor-pointer"
            >
              {orgLogo ? (
                <div className="w-5 h-5 rounded overflow-hidden shrink-0 border bg-muted">
                  <Image
                    src={orgLogo}
                    alt={org.name}
                    width={20}
                    height={20}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
              ) : (
                <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-muted font-bold shrink-0">
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="truncate flex-1">{org.name}</span>
              {org.id === organization.id && (
                <span className="ml-auto text-primary text-xs">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
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
