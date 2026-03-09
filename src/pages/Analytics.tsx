import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  return (
    <AppLayout
      title={t('analytics.title')}
      subtitle={t('analytics.subtitle')}
    >
      <Card className="p-12 bg-card border-border text-center">
        <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">{t('analytics.comingSoon')}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t('analytics.comingSoonDesc')}
        </p>
      </Card>
    </AppLayout>
  );
}