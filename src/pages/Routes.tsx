import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRoutes } from "@/hooks/useRoutes";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const ROUTE_PREFIXES = [
  "Thunder Run", "Salinas Mission", "Golden Route", "Iron Trail",
  "Swift Dash", "Eagle Run", "Blaze Path", "Storm Ride",
];

function generateRouteName(dateStr: string): string {
  const prefix = ROUTE_PREFIXES[Math.floor(Math.random() * ROUTE_PREFIXES.length)];
  const formatted = format(new Date(dateStr + "T12:00:00"), "MMMM d");
  return `${prefix} - ${formatted}`;
}

export default function Routes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { routesQuery, createRoute, deleteRoute } = useRoutes();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleCreate = () => {
    const name = generateRouteName(date);
    const driverId = !isAdmin && user?.id ? user.id : undefined;
    createRoute.mutate({ name, scheduled_for: date, driver_id: driverId }, {
      onSuccess: (data) => {
        setOpen(false);
        navigate(`/routes/${data.id}`);
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('routes.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('routes.subtitle')}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />{t('routes.newRoute')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('routes.createRoute')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('routes.scheduledDate')}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('routes.routeName')}: <span className="font-medium text-foreground">{generateRouteName(date)}</span>
                </p>
                <Button onClick={handleCreate} disabled={createRoute.isPending} className="w-full">
                  {createRoute.isPending ? t('routes.creatingRoute') : t('routes.createRoute')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {routesQuery.isLoading && <p className="text-muted-foreground">{t('routes.loadingRoutes')}</p>}

        <div className="grid gap-3">
          {(routesQuery.data || []).map((route) => (
            <Card key={route.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/routes/${route.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{route.name}</span>
                    <Badge className={statusColors[route.status || "planned"] || statusColors.planned}>
                      {route.status || "planned"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(route.scheduled_for), "MMM d, yyyy")}
                    </span>
                    {route.driver && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {route.driver.first_names} {route.driver.last_names}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm(t('routes.deleteConfirm'))) deleteRoute.mutate(route.id); }}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {routesQuery.data?.length === 0 && !routesQuery.isLoading && (
            <p className="text-muted-foreground text-center py-12">{t('routes.noRoutes')}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}