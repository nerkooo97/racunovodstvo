import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { getActiveYear } from "@/lib/year";
import { getRegime } from "@/lib/organization/regime";
import {
  Users,
  FileText,
  Wallet,
  AlertCircle,
  Plus,
  ArrowRight,
  CalendarDays,
  Calculator,
  Receipt,
  UserPlus,
  CalendarCheck,
  Upload,
  FileBarChart,
  Handshake,
  PiggyBank,
} from "lucide-react";

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

interface StatCardProps {
  label: string;
  value: string | number;
  href: string;
  icon: React.ElementType;
  sub?: string;
  accent?: "default" | "green" | "amber" | "red";
}

function StatCard({ label, value, href, icon: Icon, sub, accent = "default" }: StatCardProps) {
  const accentClass = {
    default: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
  }[accent];

  return (
    <Link
      href={href}
      className="group relative rounded-xl border bg-card p-5 flex items-start gap-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      <div className={`rounded-lg p-2.5 shrink-0 ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors absolute right-4 top-1/2 -translate-y-1/2" />
    </Link>
  );
}

interface QuickLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
}

function QuickLink({ href, label, icon: Icon }: QuickLinkProps) {
  return (
    <Button asChild variant="outline" size="sm" className="h-9 gap-2 text-xs font-medium">
      <Link href={href}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Link>
    </Button>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) redirect("/nova-djelatnost");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, type, plan, trial_ends_at")
    .eq("id", orgId)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const now   = new Date();
  const year  = await getActiveYear();
  const month = now.getMonth() + 1;

  const [
    { count: activeEmployees },
    { count: draftInvoices },
    { data: latestPeriod },
    { count: unmatchedTx },
  ] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("insurance_status", "registered")
      .in("status", ["active", "probation"]),
    supabase.from("invoices").select("id", { count: "exact", head: true })
      .eq("organization_id", org.id).in("status", ["draft", "open"]),
    supabase.from("salary_periods").select("year, month, status")
      .eq("organization_id", org.id)
      .order("year", { ascending: false }).order("month", { ascending: false }).limit(1),
    supabase.from("transactions").select("id", { count: "exact", head: true })
      .eq("organization_id", org.id).neq("status", "confirmed"),
  ]);

  const period = latestPeriod?.[0];
  const isTrialing = org.trial_ends_at && new Date(org.trial_ends_at) > now;
  const regime = getRegime(org.type);

  return (
    <div className="space-y-8">
      {org.type === "doo" ? (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{regime.shortLabel}:</span>{" "}
            {regime.accountingModel}. KPR-1041 se ne koristi.
          </p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/racunovodstvo">Pregled modula</Link>
          </Button>
        </div>
      ) : null}
      {/* Naslov */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
            {isTrialing && (
              <Badge variant="secondary" className="text-xs">Trial aktivan</Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">{org.plan ?? "free"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {org.type === "obrt" ? "Obrt" : "d.o.o."} · {MONTH_NAMES[month]} {year}
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/fakture/nova">
            <Plus className="h-4 w-4" />
            Nova faktura
          </Link>
        </Button>
      </div>

      {/* Statistike */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Aktivni radnici"
          value={activeEmployees ?? 0}
          href="/zaposlenici"
          icon={Users}
          sub="Klikni za pregled"
          accent="default"
        />
        <StatCard
          label="Otvorene fakture"
          value={draftInvoices ?? 0}
          href="/fakture"
          icon={FileText}
          sub="Nacrt + izdane"
          accent={draftInvoices ? "amber" : "default"}
        />
        <StatCard
          label="Zadnji obračun plata"
          value={period ? `${MONTH_NAMES[period.month]} ${period.year}` : "—"}
          href={period ? `/place/${period.year}/${period.month}` : "/obracuni-plata"}
          icon={Wallet}
          sub={period ? (period.status === "paid" ? "Isplaćeno" : "Obračunato") : "Nema obračuna"}
          accent="green"
        />
        <StatCard
          label="Nesparene transakcije"
          value={unmatchedTx ?? 0}
          href="/bankovni-izvodi"
          icon={AlertCircle}
          sub="Čekaju potvrdu"
          accent={unmatchedTx ? "red" : "default"}
        />
      </div>

      {/* Brzi pristup */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Brzi pristup
        </p>
        <div className="flex flex-wrap gap-2">
          <QuickLink href={`/obracuni-plata/${year}/${month}`} label={`Obračun plata — ${MONTH_NAMES[month]}`} icon={CalendarCheck} />
          <QuickLink href="/fakture/nova"       label="Nova faktura"    icon={Receipt} />
          <QuickLink href="/zaposlenici/novi"   label="Novi zaposlenik" icon={UserPlus} />
          <QuickLink href="/sihterica"          label="Šihterica"       icon={CalendarDays} />
          <QuickLink href="/bankovni-izvodi/uvezi" label="Uvezi izvod"  icon={Upload} />
        </div>
      </div>

      <Separator />

      {/* Besplatni kalkulatori */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Besplatni kalkulatori
        </p>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/preracun-plate"    label="Preračun plate"   icon={Calculator} />
          <QuickLink href="/pdv-kalkulator"    label="PDV kalkulator"   icon={FileBarChart} />
          <QuickLink href="/amortizacija"      label="Amortizacija"     icon={PiggyBank} />
          <QuickLink href="/ugovor-o-djelu"    label="Ugovor o djelu"   icon={Handshake} />
          <QuickLink href="/ugovor-o-radu"     label="Ugovor o radu"    icon={FileText} />
        </div>
      </div>
    </div>
  );
}
