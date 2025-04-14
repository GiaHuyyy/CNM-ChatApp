import { useEffect } from 'react';
import { useGlobalContext } from '../context/GlobalProvider';
import { socket } from '../socket';

export default function NotificationManager() {
  const { updateNotifications } = useGlobalContext();

  useEffect(() => {
    socket.on("receiveFriendRequest", () => {
      updateNotifications(prev => prev + 1);
    });

    socket.on("friendRequestCancelled", () => {
      updateNotifications(prev => Math.max(0, prev - 1));
    });

    return () => {
      socket.off("receiveFriendRequest");
      socket.off("friendRequestCancelled");
    };
  }, [updateNotifications]);

  return null;
}