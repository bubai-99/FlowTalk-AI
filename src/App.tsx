/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TeamsLayout } from './components/TeamsLayout';
import { FlowTalkOverlay, FlowTalkBubble } from './components/FlowTalkOverlay';
import { INITIAL_MESSAGES, Message } from './types';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const handleInsertFromAI = (text: string) => {
    setInputValue(text);
    setIsOverlayOpen(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900">
      {/* Background Microsoft Teams Demo */}
      <TeamsLayout 
        messages={messages} 
        inputValue={inputValue} 
        onInputChange={setInputValue} 
        onSend={handleSend} 
      />

      {/* FlowTalk AI Overlay */}
      <FlowTalkOverlay 
        isOpen={isOverlayOpen} 
        onClose={() => setIsOverlayOpen(false)} 
        onInsert={handleInsertFromAI}
        bubblePosition={bubblePosition}
      />

      {/* Floating Trigger Bubble */}
      <FlowTalkBubble 
        onClick={() => setIsOverlayOpen(!isOverlayOpen)} 
        isOpen={isOverlayOpen}
        onPositionChange={setBubblePosition}
      />

      {/* Tooltip hint for first-time users */}
      {!isOverlayOpen && messages.length <= 2 && (
        <div className="fixed bottom-24 right-8 bg-black/80 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm shadow-xl animate-bounce">
          Tap FlowTalk to reply in Bengali/Hindi
        </div>
      )}
    </div>
  );
}

