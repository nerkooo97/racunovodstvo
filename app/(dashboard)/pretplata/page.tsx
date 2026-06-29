import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const PLANS = [
  {
    name:  "Besplatni",
    price: "0 KM/mj",
    features: [
      "Besplatni kalkulatori (preračun plate, PDV, UOD, amortizacija)",
      "Obrasci SPR-1053, GPD-1051, ZO-3",
      "1 djelatnost",
    ],
    highlight: false,
  },
  {
    name:  "Starter",
    price: "15 KM/mj",
    features: [
      "Sve iz Besplatnog plana",
      "Do 3 radnika",
      "Šihterica i obračun plata",
      "Fakture i predračuni",
      "Partneri",
      "Bankovni izvodi",
      "KPR-1041",
    ],
    highlight: false,
  },
  {
    name:  "Pro",
    price: "35 KM/mj",
    features: [
      "Sve iz Starter plana",
      "Neograničen broj radnika",
      "PDV evidencija (e-KUF/e-KIF)",
      "PDF export (platni listić, uplatnice, faktura)",
      "MIP-1023, GIP-1022",
      "Članske kartice",
      "Prioritetna podrška",
    ],
    highlight: true,
  },
  {
    name:  "Business",
    price: "75 KM/mj",
    features: [
      "Sve iz Pro plana",
      "Više korisnika (računovođa + vlasnik)",
      "Više djelatnosti",
      "API pristup",
      "Prilagođeni izvještaji",
    ],
    highlight: false,
  },
];

export default async function PretplataPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, plan, plan_expires_at, trial_ends_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const now = new Date();
  const isTrialing  = org.trial_ends_at && new Date(org.trial_ends_at) > now;
  const trialEnds   = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const planExpires = org.plan_expires_at ? new Date(org.plan_expires_at) : null;
  const isExpired   = planExpires && planExpires < now;

  return (
    <div>
      <PageHeader title="Pretplata" description={org.name} />

      {/* Trenutni status */}
      <div className="border rounded-md p-4 mb-8 max-w-md">
        <p className="text-sm text-muted-foreground mb-1">Trenutni plan</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold capitalize">{org.plan ?? "free"}</span>
          {isTrialing && (
            <Badge variant="secondary">
              Trial do {trialEnds ? formatDate(trialEnds.toISOString()) : "—"}
            </Badge>
          )}
          {isExpired && <Badge variant="destructive">Istekao</Badge>}
        </div>
        {planExpires && !isExpired && (
          <p className="text-xs text-muted-foreground mt-1">
            Istječe: {formatDate(planExpires.toISOString())}
          </p>
        )}
      </div>

      {/* Planovi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`border rounded-lg p-4 flex flex-col gap-3 ${
              plan.highlight ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            <div>
              {plan.highlight && (
                <Badge className="mb-2">Najpopularniji</Badge>
              )}
              <h2 className="font-bold text-lg">{plan.name}</h2>
              <p className="text-xl font-bold mt-1">{plan.price}</p>
            </div>
            <ul className="text-sm space-y-1.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.highlight ? "default" : "outline"}
              className="mt-2"
              disabled={org.plan === plan.name.toLowerCase()}
            >
              {org.plan === plan.name.toLowerCase() ? "Aktivan plan" : "Odaberi plan"}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6 max-w-xl">
        Sve cijene bez PDV-a. Plaćanje fakturom ili karticom. Otkazivanje moguće u bilo kom trenutku.
        Za uplate kontakt: <a href="mailto:info@racunovodstvo.ba" className="underline">info@racunovodstvo.ba</a>
      </p>
    </div>
  );
}
