import { useEffect } from 'react';
import { useNotificationStore, type TxNotification } from '../../store/notificationStore';

function ToastItem({ n, onDismiss }: { n: TxNotification; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (n.type !== 'pending') {
      const timer = setTimeout(() => onDismiss(n.id), 5000);
      return () => clearTimeout(timer);
    }
  }, [n.type, n.id, onDismiss]);

  const bg =
    n.type === 'success'
      ? 'bg-[var(--color-success)]'
      : n.type === 'error'
        ? 'bg-[var(--color-error)]'
        : 'bg-[var(--color-primary)]';

  return (
    <div className={`${bg} text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
      {n.type === 'pending' && <span className="animate-spin">◎</span>}
      <span>{n.message}</span>
      <button
        onClick={() => onDismiss(n.id)}
        className="ml-auto text-white/70 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}

export function Toaster() {
  const notifications = useNotificationStore((s) => s.notifications);
  const remove = useNotificationStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => (
        <ToastItem key={n.id} n={n} onDismiss={remove} />
      ))}
    </div>
  );
}
