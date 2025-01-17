import { useAutoResponse } from '@/lib/hooks/useAutoResponse';
import { useAIAgent } from '@/lib/contexts/AIAgentContext';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function AIAgentAutoResponse() {
  const { isEnabled, settings } = useAIAgent();
  const params = useParams();
  const channelId = params?.channelId as string;
  
  useEffect(() => {
    console.log('AIAgentAutoResponse: Component mounted', { isEnabled, settings });
  }, [isEnabled, settings]);

  useAutoResponse(channelId);
  return null;
} 