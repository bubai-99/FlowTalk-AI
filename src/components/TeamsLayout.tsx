import React from 'react';
import { 
  Search, 
  MoreHorizontal, 
  Phone, 
  Video, 
  Info, 
  Send, 
  Paperclip, 
  Smile, 
  Image as ImageIcon,
  Gift,
  Calendar,
  MessageSquare,
  Users,
  Grid
} from 'lucide-react';
import { Message } from '../types';

interface TeamsLayoutProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export const TeamsLayout: React.FC<TeamsLayoutProps> = ({ 
  messages, 
  inputValue, 
  onInputChange, 
  onSend 
}) => {
  return (
    <div className="flex h-screen bg-[#F3F2F1] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Teams Apps */}
      <div className="w-16 bg-[#464775] flex flex-col items-center py-4 space-y-6 text-white">
        <div className="w-10 h-10 bg-white/20 rounded-lg cursor-pointer"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg cursor-pointer"></div>
        <div className="w-10 h-10 bg-[#6264A7] rounded-lg border-l-4 border-white cursor-pointer"><MessageSquare size={20} className="m-auto mt-2" /></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg cursor-pointer"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg cursor-pointer"></div>
      </div>

      {/* Chat List Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-bottom border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg">Chat</h2>
          <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-slate-50 p-4 border-l-4 border-[#6264A7] flex gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-indigo-200 shrink-0 flex items-center justify-center text-indigo-700 font-bold">JD</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="font-semibold truncate">Jane Doe (Manager)</p>
                <span className="text-[10px] text-slate-400">10:42 AM</span>
              </div>
              <p className="text-xs text-slate-500 truncate">Can you share the updated report...</p>
            </div>
          </div>
          {/* Other mock chats */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-3 hover:bg-[#F3F2F1] flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#EDEBE9] flex items-center justify-center text-[#605E5C] font-medium">C{i}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold truncate text-[#242424]">Project Channel {i}</p>
                </div>
                <p className="text-sm text-[#605E5C] truncate">Latest workspace updates...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-[#F3F2F1]">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold">JD</div>
            <h3 className="font-bold">Jane Doe (Manager)</h3>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <Video size={20} className="cursor-pointer hover:text-[#6264A7]" />
            <Phone size={20} className="cursor-pointer hover:text-[#6264A7]" />
            <div className="h-4 w-px bg-slate-200" />
            <Search size={20} className="cursor-pointer hover:text-[#6264A7]" />
            <MoreHorizontal size={20} className="cursor-pointer hover:text-[#6264A7]" />
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex flex-col items-center py-4 opacity-50">
            <p className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">Today</p>
          </div>
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.sender === 'manager' && (
                  <div className="w-9 h-9 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-[10px] font-bold shrink-0 shadow-sm border border-white">JD</div>
                )}
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#E7E9FC] border border-[#C5CBF7] rounded-tr-none' 
                    : 'bg-white border border-slate-200 rounded-tl-none'
                }`}>
                  {msg.sender !== 'user' && <p className="text-[11px] font-bold text-slate-400 mb-1">Jane Doe</p>}
                  <p className="text-sm leading-relaxed text-slate-800">{msg.text}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="border border-slate-200 rounded-xl shadow-sm focus-within:border-[#6264A7] focus-within:ring-4 focus-within:ring-[#6264A7]/5 transition-all overflow-hidden bg-slate-50">
            <input 
              id="teams-input"
              className="w-full p-4 text-sm outline-none bg-transparent placeholder:text-slate-400"
              placeholder="Type a new message"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
            />
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100">
              <div className="flex items-center space-x-4 text-slate-400">
                <ImageIcon size={18} className="cursor-pointer hover:text-slate-600" />
                <Paperclip size={18} className="cursor-pointer hover:text-slate-600" />
                <Smile size={18} className="cursor-pointer hover:text-slate-600" />
                <Gift size={18} className="cursor-pointer hover:text-slate-600" />
                <Grid size={18} className="cursor-pointer hover:text-slate-600" />
              </div>
              <button 
                onClick={onSend}
                disabled={!inputValue.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  inputValue.trim() 
                    ? 'bg-[#6264A7] text-white shadow-lg shadow-indigo-100' 
                    : 'bg-slate-100 text-slate-400 opacity-50'
                }`}
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
