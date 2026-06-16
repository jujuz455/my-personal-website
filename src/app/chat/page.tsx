'use client';
import { useChat } from '@ai-sdk/react';
import Link from 'next/link';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-2xl flex flex-col h-[90vh] bg-parchment border border-caramel shadow-sm mt-8">
        <div className="p-4 border-b border-caramel flex justify-between items-center bg-cream">
          <h2 className="font-semibold text-espresso">Me-Bot</h2>
          <Link href="/" className="text-sm text-walnut hover:text-espresso">← Back to Home</Link>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 text-sm ${m.role === 'user' ? 'bg-mocha text-cream' : 'bg-[#E8CFA0] text-espresso'}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-caramel bg-cream">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 p-2 text-espresso bg-parchment border border-caramel focus:outline-none focus:border-mocha placeholder:text-walnut"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me something..."
            />
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-mocha text-cream hover:bg-espresso transition-colors">
              {isLoading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
