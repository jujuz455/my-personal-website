// src/app/chat/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import Link from 'next/link';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-2xl flex flex-col h-[90vh] bg-white border border-zinc-200 shadow-sm mt-8 relative">
        
        {/* 顶部导航 */}
        <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <h2 className="font-semibold text-zinc-800">Me-Bot</h2>
          <Link href="/" className="text-sm text-zinc-500 hover:text-black">← Back to Home</Link>
        </div>

        {/* 聊天记录区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <p className="text-zinc-400 text-sm text-center mt-10">
              I'm Runchen's digital avatar. Ask me about her travels, philosophy, or code.
            </p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 text-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* 输入框区 */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 p-2 text-sm border border-zinc-300 focus:outline-none focus:border-black transition-colors"
              value={input}
              placeholder="Ask me something..."
              onChange={handleInputChange}
            />
            <button type="submit" className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}