import { useNotificationStore } from '../notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('adds a notification', () => {
    useNotificationStore.getState().addNotification({
      id: 'test-1',
      type: 'success',
      message: 'Test message',
    });

    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('test-1');
    expect(notifications[0].type).toBe('success');
    expect(notifications[0].message).toBe('Test message');
    expect(notifications[0].timestamp).toBeDefined();
  });

  it('updates a notification', () => {
    useNotificationStore.getState().addNotification({
      id: 'test-2',
      type: 'pending',
      message: 'Submitting...',
    });

    useNotificationStore.getState().updateNotification('test-2', {
      type: 'success',
      message: 'Done!',
    });

    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].type).toBe('success');
    expect(notifications[0].message).toBe('Done!');
  });

  it('removes a notification', () => {
    useNotificationStore.getState().addNotification({
      id: 'test-3',
      type: 'error',
      message: 'Error',
    });

    useNotificationStore.getState().removeNotification('test-3');
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('clears all notifications', () => {
    useNotificationStore.getState().addNotification({ id: 'a', type: 'success', message: 'a' });
    useNotificationStore.getState().addNotification({ id: 'b', type: 'error', message: 'b' });

    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
