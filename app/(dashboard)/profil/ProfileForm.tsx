"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { updateOrganization } from "@/app/actions/organizations";
import { searchActivityCodes, type ActivityCode } from "@/lib/constants/activity-codes";
import { searchCities, type City } from "@/lib/constants/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import FormSection from "@/components/shared/form-section";
import { KATEGORIJE_PAUSALNI, KATEGORIJE_STVARNI, REZIMI_LABELS, getObrtnikOsnovica } from "@/lib/constants/obrtnici-fbih";
import { proxyImageUrl } from "@/lib/image-proxy";

const TEKUCA_GODINA = 2026;

const schema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  type: z.enum(["obrt", "doo"]),
  tax_id: z.string().max(13).optional(),
  vat_number: z.string().optional(),
  is_vat_registered: z.boolean(),
  address: z.string().optional(),
  city: z.string().optional(),
  canton: z.string().optional(),
  municipality: z.string().optional(),
  municipality_code: z.string().optional(),
  activity_code: z.string().optional(),
  activity_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Nevažeća email adresa"), z.literal("")]).optional(),
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),
  owner_tax_regime: z.union([z.enum(["STVARNI_DOHODAK", "PAUSALNI", "OSTALI"]), z.literal(""), z.null()]).optional(),
  owner_activity_category: z.union([z.enum(["SLOBODNA_ZANIMANJA", "OBRT_SRODNE", "POLJOPRIVREDA_SUMARSTVO", "TRGOVAC_POJEDINAC"]), z.literal(""), z.null()]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Org {
  id: string;
  name: string;
  type: string;
  tax_id: string | null;
  vat_number: string | null;
  is_vat_registered: boolean;
  address: string | null;
  city: string | null;
  canton: string | null;
  municipality: string | null;
  municipality_code: string | null;
  activity_code: string | null;
  activity_name: string | null;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  bank_name: string | null;
  logo_url: string | null;
  owner_tax_regime: string | null;
  owner_activity_category: string | null;
}

export default function ProfileForm({ org }: { org: Org }) {
  const fileRef = useRef<HTMLInputElement>(null);
  // rawLogoUrl = originalni Supabase URL (čuva se u bazi)
  // logoUrl    = proxy URL za prikaz u browseru (izbjegava cookie problem na localhost)
  const [rawLogoUrl, setRawLogoUrl] = useState<string | null>(org.logo_url);
  const [logoUrl, setLogoUrl] = useState<string | null>(proxyImageUrl(org.logo_url));
  const [logoUploading, setLogoUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [citySearch, setCitySearch] = useState(org.city ?? "");
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [activitySearch, setActivitySearch] = useState(
    org.activity_code ? `${org.activity_code} — ${org.activity_name}` : ""
  );
  const [activitySuggestions, setActivitySuggestions] = useState<ActivityCode[]>([]);
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: org.name ?? "",
      type: (org.type as "obrt" | "doo") ?? "obrt",
      tax_id: org.tax_id ?? "",
      vat_number: org.vat_number ?? "",
      is_vat_registered: org.is_vat_registered ?? false,
      address: org.address ?? "",
      city: org.city ?? "",
      canton: org.canton ?? "",
      municipality: org.municipality ?? "",
      municipality_code: org.municipality_code ?? "",
      activity_code: org.activity_code ?? "",
      activity_name: org.activity_name ?? "",
      phone: org.phone ?? "",
      email: org.email ?? "",
      bank_account: org.bank_account ?? "",
      bank_name: org.bank_name ?? "",
      owner_tax_regime: (org.owner_tax_regime as any) ?? "",
      owner_activity_category: (org.owner_activity_category as any) ?? "",
    },
  });

  const isVatRegistered = watch("is_vat_registered");
  const orgType = watch("type");
  const taxRegime = watch("owner_tax_regime");

  useEffect(() => {
    setCitySuggestions(searchCities(citySearch));
  }, [citySearch]);

  useEffect(() => {
    setActivitySuggestions(searchActivityCodes(activitySearch));
  }, [activitySearch]);

  function selectCity(city: City) {
    setValue("city", city.name);
    setValue("canton", city.canton);
    setValue("municipality", city.municipality);
    setValue("municipality_code", city.municipalityCode);
    setCitySearch(city.name);
    setShowCitySuggestions(false);
  }

  function selectActivity(a: ActivityCode) {
    setValue("activity_code", a.code);
    setValue("activity_name", a.name);
    setActivitySearch(`${a.code} — ${a.name}`);
    setShowActivitySuggestions(false);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Momentalni lokalni preview
    setLogoUrl(URL.createObjectURL(file));
    setLogoUploading(true);

    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`/api/organizations/${org.id}/logo`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.logo_url) {
        // Čuvamo originalni URL za bazu, proxy URL za prikaz
        setRawLogoUrl(json.logo_url);
        setLogoUrl(proxyImageUrl(json.logo_url));
      } else {
        setServerError(json.error ?? "Greška pri uploadu logotipa.");
        setRawLogoUrl(org.logo_url);
        setLogoUrl(proxyImageUrl(org.logo_url));
      }
    } catch {
      setServerError("Greška pri uploadu logotipa.");
      setRawLogoUrl(org.logo_url);
      setLogoUrl(proxyImageUrl(org.logo_url));
    } finally {
      setLogoUploading(false);
    }
  }

  function onSubmit(data: FormValues) {
    setServerError(null);
    setSuccess(false);

    if (data.type === "doo") {
      data.owner_tax_regime = null;
      data.owner_activity_category = null;
    } else if (data.owner_tax_regime !== "PAUSALNI") {
      data.owner_activity_category = null;
    }

    const fd = new FormData();
    fd.append("orgId", org.id);

    (Object.entries(fdObject(data)) as [string, unknown][]).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        fd.append(key, String(value));
      }
    });

    // Pošalji originalni Supabase URL (ne proxy URL) u bazu
    if (rawLogoUrl) {
      fd.append("logo_url", rawLogoUrl);
    }

    startTransition(async () => {
      const result = await updateOrganization(fd);
      if ("error" in result) {
        setServerError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  // Pomoćna funkcija za čišćenje null vrijednosti za slanje
  function fdObject(data: FormValues) {
    const obj: any = { ...data };
    if (!obj.owner_tax_regime) delete obj.owner_tax_regime;
    if (!obj.owner_activity_category) delete obj.owner_activity_category;
    return obj;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FormSection title="Osnovni podaci">
        <div className="grid gap-2">
          <Label htmlFor="name">Naziv *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="type">Tip djelatnosti</Label>
          <select
            id="type"
            {...register("type")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="obrt">Obrt</option>
            <option value="doo">Društvo s o.o. (d.o.o.)</option>
          </select>
        </div>

        {orgType === "obrt" && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="owner_tax_regime">Režim oporezivanja vlasnika</Label>
              <select
                id="owner_tax_regime"
                {...register("owner_tax_regime")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Izaberite režim oporezivanja</option>
                {(Object.entries(REZIMI_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {taxRegime === "PAUSALNI" && (
              <div className="grid gap-2">
                <Label htmlFor="owner_activity_category">Kategorija djelatnosti za paušal</Label>
                <select
                  id="owner_activity_category"
                  {...register("owner_activity_category")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Izaberite kategoriju</option>
                  {(Object.entries(KATEGORIJE_PAUSALNI) as [string, string][]).map(([k, v]) => {
                    const osnovica = getObrtnikOsnovica(TEKUCA_GODINA, "PAUSALNI", k);
                    return (
                      <option key={k} value={k}>
                        {v} ({osnovica.toLocaleString("bs-BA")} KM osnovica)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {taxRegime === "STVARNI_DOHODAK" && (
              <div className="grid gap-2">
                <Label htmlFor="owner_activity_category">Kategorija djelatnosti</Label>
                <select
                  id="owner_activity_category"
                  {...register("owner_activity_category")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Izaberite kategoriju</option>
                  {(Object.entries(KATEGORIJE_STVARNI) as [string, string][]).map(([k, v]) => {
                    const osnovica = getObrtnikOsnovica(TEKUCA_GODINA, "STVARNI_DOHODAK", k);
                    return (
                      <option key={k} value={k}>
                        {v} ({osnovica.toLocaleString("bs-BA")} KM osnovica)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="tax_id">JIB</Label>
            <Input
              id="tax_id"
              placeholder="4200000000000"
              maxLength={13}
              {...register("tax_id")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vat_number">PDV broj</Label>
            <Input
              id="vat_number"
              placeholder="200000000000"
              {...register("vat_number")}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="is_vat_registered"
            checked={isVatRegistered}
            onCheckedChange={(checked) =>
              setValue("is_vat_registered", checked === true)
            }
          />
          <Label htmlFor="is_vat_registered">PDV obveznik</Label>
        </div>
      </FormSection>

      <FormSection title="Adresa">
        <div className="grid gap-2">
          <Label htmlFor="address">Ulica i broj</Label>
          <Input id="address" placeholder="Titova 1" {...register("address")} />
        </div>

        <div className="grid gap-2 relative">
          <Label htmlFor="city-search">Grad</Label>
          <Input
            id="city-search"
            placeholder="Počnite pisati grad..."
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setValue("city", e.target.value);
              setShowCitySuggestions(true);
            }}
            onFocus={() => setShowCitySuggestions(true)}
            onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
            autoComplete="off"
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md max-h-52 overflow-auto">
              {citySuggestions.map((city) => (
                <li key={`${city.municipalityCode}-${city.name}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={() => selectCity(city)}
                  >
                    <span className="font-medium">{city.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {city.municipality} · {city.postalCode}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Kanton</Label>
            <Input
              value={watch("canton") ?? ""}
              readOnly
              className="bg-muted"
              tabIndex={-1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Općina</Label>
            <Input
              value={watch("municipality") ?? ""}
              readOnly
              className="bg-muted"
              tabIndex={-1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Šifra općine</Label>
            <Input
              value={watch("municipality_code") ?? ""}
              readOnly
              className="bg-muted"
              tabIndex={-1}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Djelatnost (KD BiH 2010)">
        <div className="grid gap-2 relative">
          <Label htmlFor="activity-search">Šifra ili naziv djelatnosti</Label>
          <Input
            id="activity-search"
            placeholder="Unesite šifru (npr. 62) ili naziv..."
            value={activitySearch}
            onChange={(e) => {
              setActivitySearch(e.target.value);
              setShowActivitySuggestions(true);
            }}
            onFocus={() => setShowActivitySuggestions(true)}
            onBlur={() => setTimeout(() => setShowActivitySuggestions(false), 150)}
            autoComplete="off"
          />
          {showActivitySuggestions && activitySuggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md max-h-52 overflow-auto">
              {activitySuggestions.map((a) => (
                <li key={a.code}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={() => selectActivity(a)}
                  >
                    <span className="font-mono font-medium mr-2">{a.code}</span>
                    <span className="text-muted-foreground">{a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Šifra</Label>
            <Input
              value={watch("activity_code") ?? ""}
              readOnly
              className="bg-muted"
              tabIndex={-1}
            />
          </div>
          <div className="col-span-2 grid gap-2">
            <Label>Naziv djelatnosti</Label>
            <Input
              value={watch("activity_name") ?? ""}
              readOnly
              className="bg-muted"
              tabIndex={-1}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Kontakt i banka">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              placeholder="+387 33 000 000"
              {...register("phone")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="firma@primjer.ba"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="bank_account">Žiro račun</Label>
            <Input
              id="bank_account"
              placeholder="1610000000000001"
              {...register("bank_account")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bank_name">Naziv banke</Label>
            <Input
              id="bank_name"
              placeholder="Raiffeisen Bank d.d."
              {...register("bank_name")}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Logo">        <div className="flex items-start gap-6">
          {logoUrl && (
            <div className="relative w-24 h-24 rounded-md border overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={logoUrl}
                alt="Logo preview"
                fill
                className="object-contain p-1"
                unoptimized
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="logo">PNG, JPG, WEBP · max 2 MB</Label>
            <input
              ref={fileRef}
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
            >
              {logoUploading ? "Učitavanje..." : logoUrl ? "Promijeni logo" : "Odaberi logo"}
            </Button>
            {logoUploading && (
              <p className="text-xs text-muted-foreground">Uploadujem logotip...</p>
            )}
          </div>
        </div>
      </FormSection>

      {Object.keys(errors).length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
          <p className="font-semibold text-sm">Molimo ispravite greške prije spašavanja:</p>
          {Object.entries(errors).map(([key, err]: any) => (
            <div key={key}>
              • <span className="font-medium uppercase text-[10px] bg-destructive/10 px-1 py-0.5 rounded mr-1">{key}</span>: {err?.message || "Nevažeća vrijednost"}
            </div>
          ))}
        </div>
      )}

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Profil uspješno sačuvan.</p>
      )}

      <div className="flex gap-3 pb-8">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje..." : "Sačuvaj promjene"}
        </Button>
      </div>
    </form>
  );
}
