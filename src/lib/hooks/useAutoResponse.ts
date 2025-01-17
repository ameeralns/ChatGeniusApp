import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useAutoResponse(channelId: string) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoResponse, setAutoResponse] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !channelId) return;

    const generateResponse = async () => {
      try {
        setIsGenerating(true);
        const response = await fetch('/api/ai/auto-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            userId: user.uid,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate auto response');
        
        const data = await response.json();
        setAutoResponse(data.response);
      } catch (error) {
        console.error('Error generating auto response:', error);
        setAutoResponse(null);
      } finally {
        setIsGenerating(false);
      }
    };

    generateResponse();
  }, [user, channelId]);

  return { isGenerating, autoResponse };
} 