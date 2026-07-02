"use client";

import { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setActiveOrg } from "@/app/actions/organizations";

export interface OrgData {
  id: string;
  name: string;
  type: "obrt" | "doo";
  tax_id: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  canton: string | null;
  plan: string;
}

interface OrgContextType {
  organization: OrgData | null;
  allOrganizations: OrgData[];
  switchOrganization: (id: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrganizationProvider({
  children,
  organization,
  allOrganizations,
}: {
  children: React.ReactNode;
  organization: OrgData | null;
  allOrganizations: OrgData[];
}) {
  const router = useRouter();

  const switchOrganization = useCallback(
    async (id: string) => {
      const res = await setActiveOrg(id);
      if (res && "error" in res) {
        alert("Greška pri prebacivanju firme: " + res.error);
        return;
      }
      router.refresh();
    },
    [router]
  );

  return (
    <OrgContext.Provider value={{ organization, allOrganizations, switchOrganization }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
