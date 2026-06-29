"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createOrganization } from "@/app/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  type: z.enum(["obrt", "doo"]),
});

type FormValues = z.infer<typeof schema>;

export default function NovaDjelatnostPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "obrt" },
  });

  function onSubmit(data: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("type", data.type);
    startTransition(async () => {
      const result = await createOrganization(fd);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Nova djelatnost</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Naziv</Label>
                <Input
                  id="name"
                  placeholder="npr. Frizerski salon Amra"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tip</Label>
                <select
                  id="type"
                  {...register("type")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="obrt">Obrt</option>
                  <option value="doo">Društvo s o.o. (d.o.o.)</option>
                </select>
              </div>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Kreiranje..." : "Kreiraj djelatnost"}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Odustani</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
