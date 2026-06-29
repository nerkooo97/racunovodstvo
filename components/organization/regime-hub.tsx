import Link from "next/link";
import type { ElementType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getRegime,
  hasFeature,
  normalizeOrgType,
  type OrgType,
} from "@/lib/organization/regime";
import {
  IconBook,
  IconFileInvoice,
  IconReceiptTax,
  IconBuildingBank,
  IconForms,
  IconWallet,
} from "@tabler/icons-react";

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  badge?: string;
}

function buildModules(type: OrgType, vatRegistered: boolean): ModuleCard[] {
  const modules: ModuleCard[] = [];

  if (hasFeature(type, "kpr")) {
    modules.push({
      title: "KPR-1041",
      description: "Knjiga prometa — prihodi i rashodi po principu blagajne.",
      href: "/kpr",
      icon: IconBook,
    });
  }

  modules.push({
    title: "Fakture",
    description:
      type === "doo"
        ? "Izlazne fakture — temelj prihoda po fakturisanom principu."
        : "Izdavanje faktura kupcima.",
    href: "/fakture",
    icon: IconFileInvoice,
  });

  if (hasFeature(type, "pdv")) {
    modules.push({
      title: "PDV evidencije",
      description: "e-KIF / e-KUF — ako ste u PDV sistemu.",
      href: "/pdv",
      icon: IconReceiptTax,
      badge: vatRegistered ? undefined : "PDV nije uključen u profilu",
    });
  }

  modules.push({
    title: "Bankovni izvodi",
    description:
      type === "doo"
        ? "Usklađivanje uplata — bez automatskog KPR knjiženja."
        : "Uvoz izvoda; potvrđene transakcije mogu ići u KPR.",
    href: "/bankovni-izvodi",
    icon: IconBuildingBank,
  });

  modules.push({
    title: "Obračuni plata",
    description: "Plate, doprinose i službene obrasce za radnike.",
    href: "/obracuni-plata",
    icon: IconWallet,
  });

  modules.push({
    title: "Obrasci",
    description: "Kalkulatori i službeni obrasci (GPD, MIP, GIP…).",
    href: "/obrasci",
    icon: IconForms,
  });

  return modules;
}

interface Props {
  orgName: string;
  orgType: string;
  isVatRegistered: boolean;
}

export default function RegimeHub({ orgName, orgType, isVatRegistered }: Props) {
  const type = normalizeOrgType(orgType);
  const regime = getRegime(type);
  const modules = buildModules(type, isVatRegistered);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{orgName}</h2>
          <Badge variant="secondary">{regime.shortLabel}</Badge>
          {isVatRegistered ? <Badge variant="outline">PDV obveznik</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {regime.description}
        </p>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Model
            </dt>
            <dd className="mt-1">{regime.accountingModel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Prihod
            </dt>
            <dd className="mt-1">{regime.incomePrinciple}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Godišnje izvještavanje
            </dt>
            <dd className="mt-1">{regime.yearlyReporting}</dd>
          </div>
        </dl>
        {type === "doo" ? (
          <p className="text-sm rounded-md bg-muted/60 px-3 py-2 border">
            <strong>Napomena:</strong> KPR-1041 nije propisana za d.o.o. Modul dvojnog
            knjigovodstva (bilans stanja, bilans uspjeha) planiran je kao sljedeća faza.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Dostupni moduli
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <mod.icon className="h-5 w-5" />
                </div>
                {mod.badge ? (
                  <span className="text-[10px] text-muted-foreground text-right leading-tight">
                    {mod.badge}
                  </span>
                ) : null}
              </div>
              <div>
                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                  {mod.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {type === "obrt" ? (
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/kpr">Otvori KPR-1041</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/postavke">Režim oporezivanja vlasnika</Link>
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/fakture">Fakture</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/pdv">PDV evidencije</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
