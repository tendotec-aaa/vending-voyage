import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StaleSpot {
  spotId: string;
  spotName: string;
  locationName: string;
  lastVisitDate: string | null;
  daysElapsed: number;
}

interface StaleSpotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spots: StaleSpot[];
}

export function StaleSpotDialog({ open, onOpenChange, spots }: StaleSpotDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('operatorPerformance.staleSpots')}</DialogTitle>
          <DialogDescription>{t('operatorPerformance.staleSpotsDesc')}</DialogDescription>
        </DialogHeader>

        {spots.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('operatorPerformance.noStaleSpots')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('operatorPerformance.spotName')}</TableHead>
                <TableHead>{t('operatorPerformance.locationName')}</TableHead>
                <TableHead>{t('operatorPerformance.lastVisitDate')}</TableHead>
                <TableHead className="text-right">{t('operatorPerformance.daysElapsed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spots.map((spot) => (
                <TableRow key={spot.spotId}>
                  <TableCell className="font-medium">{spot.spotName}</TableCell>
                  <TableCell>{spot.locationName}</TableCell>
                  <TableCell>
                    {spot.lastVisitDate
                      ? format(parseISO(spot.lastVisitDate), 'dd MMM yyyy', { locale })
                      : t('operatorPerformance.neverVisited')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={cn(
                        spot.daysElapsed >= 10
                          ? 'bg-destructive/15 text-destructive border-destructive/30'
                          : spot.daysElapsed >= 8
                          ? 'bg-orange-500/15 text-orange-600 border-orange-500/30'
                          : ''
                      )}
                    >
                      {spot.daysElapsed >= 999 ? '∞' : spot.daysElapsed}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
