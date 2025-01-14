export type AIPersonality = 'professional' | 'friendly' | 'humorous' | 'concise' | 'detailed';
export type AITone = 'formal' | 'casual' | 'enthusiastic' | 'empathetic' | 'neutral';
export type AIExpertise = 'general' | 'technical' | 'creative' | 'academic' | 'business';

export interface AIAssistantPreferences {
  personality: AIPersonality;
  tone: AITone;
  expertise: AIExpertise;
  customInstructions?: string;
}

export const defaultPreferences: AIAssistantPreferences = {
  personality: 'friendly',
  tone: 'casual',
  expertise: 'general'
}; 