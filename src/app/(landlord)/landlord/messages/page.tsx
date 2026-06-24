'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

interface ConversationListItem {
  id: string;
  property: { id: string; title: string };
  tenant: { id: string; name: string | null };
  last_message: { body: string; sent_at: string } | null;
  unread_count: number;
}

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

export default function LandlordMessagesPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/landlord/messages')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setConversations(json.data);
      })
      .finally(() => setLoading(false));

    createBrowserSupabaseClient()
      .auth.getUser()
      .then(({ data }: { data: { user: { id: string } | null } }) => {
        setCurrentUserId(data.user?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/landlord/messages/${selectedId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setMessages(json.data.messages);
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
          );
        }
      });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload: RealtimePostgresInsertPayload<MessageItem>) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !messageBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/landlord/messages/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageBody }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setMessageBody('');
      }
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (!loading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No Conversations Yet</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Messages with tenants will appear here once they apply to or move into one of your
          properties.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8 bg-white">
      <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-4">Loading…</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                selectedId === c.id && 'bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {c.tenant.name ?? 'Tenant'}
                </p>
                {c.unread_count > 0 && (
                  <span className="bg-brand-teal text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
                    {c.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{c.property.title}</p>
              {c.last_message && (
                <p className="text-xs text-gray-400 truncate mt-1">{c.last_message.body}</p>
              )}
            </button>
          ))
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a conversation to view messages
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="font-medium text-gray-900">{selectedConversation.tenant.name ?? 'Tenant'}</p>
              <p className="text-xs text-gray-500">{selectedConversation.property.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-md rounded-lg px-3 py-2 text-sm',
                    m.sender_id === currentUserId
                      ? 'bg-brand-teal text-white ml-auto'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  <p>{m.body}</p>
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      m.sender_id === currentUserId ? 'text-white/70' : 'text-gray-400'
                    )}
                  >
                    {formatDate(m.sent_at)}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <input
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending}
                className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
