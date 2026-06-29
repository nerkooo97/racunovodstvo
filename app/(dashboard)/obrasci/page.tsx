import Link from "next/link";
import PageHeader from "@/components/shared/page-header";

const OBRASCI = [
  {
    href: "/obrasci/ams",
    title: "AMS-1035",
    description: "Ugovor o djelu — kalkulator honorara i doprinosa",
  },
  {
    href: "/obrasci/spr",
    title: "SPR-1053",
    description: "Specifikacija isplaćenih plaća — PDF za PIO fond",
  },
  {
    href: "/obrasci/gpd",
    title: "GPD-1051",
    description: "Godišnji porez na dohodak — godišnja prijava",
  },
  {
    href: "/obrasci/pldi",
    title: "PLDI-1043",
    description: "Popisna lista dugotrajne imovine i amortizacija",
  },
  {
    href: "/obrasci/ugovor-o-djelu",
    title: "Ugovor o djelu",
    description: "Generator ugovora o djelu (FBiH)",
  },
  {
    href: "/obrasci/ugovor-o-pozajmici",
    title: "Ugovor o pozajmici",
    description: "Generator ugovora o zajmu",
  },
];

export default function ObrasciPage() {
  return (
    <div>
      <PageHeader
        title="Obrasci i kalkulatori"
        description="Porezni obrasci, kalkulatori i PDF generatori"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {OBRASCI.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="border rounded-lg p-4 hover:bg-accent/30 transition-colors"
          >
            <p className="font-semibold text-sm">{o.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
