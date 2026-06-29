"use client";

import { useTransition, useState, useEffect } from "react";
import { logout } from "@/app/actions/auth";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  IconBuilding,
  IconLogout,
  IconSwitchHorizontal,
  IconChevronDown,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";

export function AppHeader({ userEmail }: { userEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold text-sm tracking-tight hover:opacity-80 transition-opacity"
      >
        <span className="hidden sm:block text-muted-foreground font-normal">·</span>
      </Link>

      <div className="flex-1" />

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mr-2 outline-none"
        title="Promijeni temu"
      >
        {!mounted ? (
          <div className="h-4.5 w-4.5" />
        ) : theme === "dark" ? (
          <IconSun className="size-4.5" />
        ) : (
          <IconMoon className="size-4.5" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold rounded-md">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-muted-foreground max-w-44 truncate text-xs">
              {userEmail}
            </span>
            <IconChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2 text-xs text-muted-foreground truncate">{userEmail}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/postavke" className="flex items-center gap-2">
              <IconBuilding className="size-4" />
              Postavke obrta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/organizations" className="flex items-center gap-2">
              <IconSwitchHorizontal className="size-4" />
              Promijeni organizaciju
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => startTransition(() => logout())}
            disabled={isPending}
            className="text-destructive focus:text-destructive cursor-pointer gap-2"
          >
            <IconLogout className="size-4" />
            {isPending ? "Odjavljujem..." : "Odjavi se"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
