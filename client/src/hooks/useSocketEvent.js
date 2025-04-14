import { useCallback, useEffect } from 'react';
import { socketManager } from '../socket/socketConfig';

export function useSocketEvent(event, callback) {
  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const socket = socketManager.connect();
    socket.on(event, memoizedCallback);
    
    return () => {
      socket.off(event, memoizedCallback);
    };
  }, [event, memoizedCallback]);
}