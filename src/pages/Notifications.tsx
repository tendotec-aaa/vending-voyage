import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNotifications, SystemNotification, NotificationType } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, CheckCircle, Info, CheckCheck } from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';

const typeIcon: Record<NotificationType, React.ReactNode> = {
  alert: <TriangleAlert className="w-5 h-5 text-destructive shrink-0" />,
  operation: <CheckCircle className="w-5 h-5 text-primary shrink-0" />,
  system: <Info className="w-5 h-5 text-muted-foreground shrink-0" />,
};

function groupByDate(items: SystemNotification[]) {
  const groups: { label: string; items: SystemNotification[] }[] = [];
  const map = new Map<string, SystemNotification[]>();

  for (const item of items) {
    const d = new Date(item.created_at);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'MMMM d, yyyy');

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }

  for (const [label, items] of map) {
    groups.push({ label, items });
  }
  return groups;
}

function NotificationList({ items, onItemClick, onMarkRead }: {
  items: SystemNotification[];
  onItemClick: (n: SystemNotification) => void;
  onMarkRead: (id: string) => void;
}) {
  const groups = groupByDate(items);

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-12">No notifications</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{g.label}</h3>
          <div className="space-y-2">
            {g.items.map((n) => (
              <div
                key={n.id}
                onClick={() => onItemClick(n)}
                className={`flex items-start gap-3 p-4 rounded-lg border border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                  !n.is_read ? 'bg-muted/50' : 'bg-card'
                }`}
              >
                {typeIcon[n.type]}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-foreground`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(n.created_at), 'h:mm a')}
                  </p>
                </div>
                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(n.id);
                    }}
                  >
                    <CheckCheck className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleItemClick = (n: SystemNotification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  const filterByType = (type?: NotificationType) =>
    type ? notifications.filter((n) => n.type === type) : notifications;

  return (
    <AppLayout
      title="Notifications"
      subtitle={`${unreadCount} unread`}
      actions={
        unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="alert">Alerts</TabsTrigger>
          <TabsTrigger value="operation">Operations</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <NotificationList items={filterByType()} onItemClick={handleItemClick} onMarkRead={(id) => markAsRead.mutate(id)} />
        </TabsContent>
        <TabsContent value="alert">
          <NotificationList items={filterByType('alert')} onItemClick={handleItemClick} onMarkRead={(id) => markAsRead.mutate(id)} />
        </TabsContent>
        <TabsContent value="operation">
          <NotificationList items={filterByType('operation')} onItemClick={handleItemClick} onMarkRead={(id) => markAsRead.mutate(id)} />
        </TabsContent>
        <TabsContent value="system">
          <NotificationList items={filterByType('system')} onItemClick={handleItemClick} onMarkRead={(id) => markAsRead.mutate(id)} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
