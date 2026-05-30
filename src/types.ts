export interface Message {
  id: string;
  sender: 'user' | 'manager' | 'system';
  text: string;
  timestamp: string;
}

export type Tone = 'casual' | 'professional' | 'executive';

export interface SavedConversation {
  id: string;
  timestamp: string;
  app: string;
  tone: Tone;
  sourceLang: string;
  targetLang: string;
  original: string;
  rewritten: string;
  targetInfo?: string;
}

export const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    sender: 'user',
    text: 'Morning Jane! I should have the draft ready by lunch.',
    timestamp: '9:30 AM'
  },
  {
    id: '1',
    sender: 'manager',
    text: 'Hi user, hope you are doing well.',
    timestamp: '10:00 AM'
  },
  {
    id: '2',
    sender: 'manager',
    text: 'Can you share the updated report today? The client is asking for it.',
    timestamp: '10:02 AM'
  }
];
