"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Building2, ChevronDown } from "lucide-react";

export default function Header({ userEmail }: { userEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 flex items-center px-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold text-sm tracking-tight hover:opacity-80 transition-opacity"
      >
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">R</span>
        </div>
        <span className="hidden sm:block">Računovodstvo</span>
      </Link>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-muted-foreground max-w-44 truncate text-xs">
              {userEmail}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2">
            <p className="text-xs font-medium truncate">{userEmail}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profil" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Profil organizacije
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/organizations" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Sve organizacije
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => startTransition(() => logout())}
            disabled={isPending}
            className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isPending ? "Odjavljujem..." : "Odjavi se"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
