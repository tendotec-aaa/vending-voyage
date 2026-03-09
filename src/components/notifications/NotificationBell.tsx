import { Bell, TriangleAlert, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const typeIcon: Record<NotificationType, React.ReactNode> = {
  alert: <TriangleAlert className="w-4 h-4 text-destructive shrink-0" />,
  operation: <CheckCircle className="w-4 h-4 text-primary shrink-0" />,
  system: <Info className="w-4 h-4 text-muted-foreground shrink-0" />,
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const recentUnread = notifications.filter((n) => !n.is_read).slice(0, 5);

  const handleClick = (n: (typeof notifications)[0]) => {
    markAsRead.mutate(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
        </div>
        {recentUnread.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No unread notifications</p>
        ) : (
          <div className="max-h-72 overflow-auto">
            {recentUnread.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
              >
                {typeIcon[n.type]}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-primary" onClick={() => navigate('/notifications')}>
            View All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
