import { redirect } from "next/navigation";

import LicenseStatusCard from "@/components/LicenseStatusCard";
import { getCurrentUser } from "@/lib/authz";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function ActivityPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Activity Data</h1>
          <p className="text-sm text-muted-foreground">
            Enter source data for emissions calculation.
          </p>
        </div>

        {/* License Status (user + tenant + role) */}
        <LicenseStatusCard />
      </div>

      <Tabs defaultValue="fuel" className="w-full">
        <TabsList>
          <TabsTrigger value="fuel">Fuel Combustion</TabsTrigger>
          <TabsTrigger value="flaring">Flaring</TabsTrigger>
          <TabsTrigger value="venting">Venting</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel">
          <Card>
            <CardHeader>
              <CardTitle>Fuel Combustion</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Facility</Label>
                <Input placeholder="e.g. GPP, GS-1" />
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Input placeholder="e.g. Natural Gas, Diesel" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input placeholder="e.g. 12500" />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Input placeholder="e.g. Sm3, kg, L" />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Input placeholder="e.g. 2026-02" />
              </div>
              <div className="flex items-end">
                <Button className="w-full">Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flaring">
          <Card>
            <CardHeader>
              <CardTitle>Flaring</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Facility</Label>
                <Input placeholder="e.g. TS, GS-2" />
              </div>
              <div className="space-y-2">
                <Label>Gas Flow to Flare</Label>
                <Input placeholder="e.g. 350000" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input placeholder="e.g. Sm3" />
              </div>

              <div className="space-y-2">
                <Label>Flare Efficiency (%)</Label>
                <Input placeholder="e.g. 98" />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Input placeholder="e.g. 2026-02" />
              </div>
              <div className="flex items-end">
                <Button className="w-full">Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venting">
          <Card>
            <CardHeader>
              <CardTitle>Venting</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Facility</Label>
                <Input placeholder="e.g. GS-3" />
              </div>
              <div className="space-y-2">
                <Label>Gas Vented</Label>
                <Input placeholder="e.g. 12000" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input placeholder="e.g. Sm3" />
              </div>

              <div className="space-y-2">
                <Label>CH4 Mole Fraction</Label>
                <Input placeholder="e.g. 0.92" />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Input placeholder="e.g. 2026-02" />
              </div>
              <div className="flex items-end">
                <Button className="w-full">Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}