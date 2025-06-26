import { useEffect, useRef } from 'react';
import { supabase, SearchSessionUpdate } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSearchSessionProps {
  userId: string;
  onProgressUpdate: (progress: { current: number; total: number; status: string }) => void;
  onStatusChange: (status: string) => void;
  enabled: boolean;
}

export function useSearchSession({ userId, onProgressUpdate, onStatusChange, enabled }: UseSearchSessionProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    console.log('Setting up real-time subscription for user:', userId);

    // Create a channel for this user's search sessions
    const channel = supabase
      .channel(`search-session-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'SearchSession',
          filter: `userId=eq.${userId}`
        },
        (payload) => {
          console.log('SearchSession update received:', payload);
          
          const newData = payload.new as SearchSessionUpdate;
          
          // Update progress
          if (newData.progress) {
            onProgressUpdate({
              current: newData.progress.current,
              total: newData.progress.total,
              status: newData.progress.message
            });
          }
          
          // Handle status changes
          if (newData.status === 'completed' || newData.status === 'failed') {
            onStatusChange(newData.status);
            console.log('Search completed, unsubscribing from real-time updates');
            channel.unsubscribe();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('Cleaning up search session subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, onProgressUpdate, onStatusChange]);

  // Function to manually cancel subscription
  const cancelSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return { cancelSubscription };
}