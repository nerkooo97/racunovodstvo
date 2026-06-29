"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import PreracunPlatePage from "@/app/(tools)/preracun-plate/page";
import PdvKalkulatorPage from "@/app/(tools)/pdv-kalkulator/page";

export function QuickTools() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full size-8" title="Brzi kalkulatori">
          <Calculator className="size-4" />
          <span className="sr-only">Brzi kalkulatori</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 gap-4">
        <DialogHeader className="pr-6">
          <DialogTitle>Brzi alati</DialogTitle>
          <DialogDescription>
            Porezni i platni kalkulatori za brze proračune.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="plate" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-lg p-1">
            <TabsTrigger value="plate" className="rounded-md">Preračun plate</TabsTrigger>
            <TabsTrigger value="pdv" className="rounded-md">PDV kalkulator</TabsTrigger>
          </TabsList>
          <div className="flex-1 min-h-0 mt-4 overflow-hidden">
            <TabsContent value="plate" className="h-full focus-visible:outline-none">
              <ScrollArea className="h-[calc(90vh-12rem)] pr-4">
                <div className="py-1">
                  <PreracunPlatePage hideHeader />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="pdv" className="h-full focus-visible:outline-none">
              <ScrollArea className="h-[calc(90vh-12rem)] pr-4">
                <div className="py-1 flex justify-center">
                  <PdvKalkulatorPage hideHeader />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
