'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

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

interface TenancyOption {
  tenant_id: string;
  tenant_name: string | null;
  property_id: string;
  property_title: string;
}

export default function LandlordMessagesPage() {
  const csrf = useCsrf();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<TenancyOption[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSelection, setNewSelection] = useState('');
  const [startingConv, setStartingConv] = useState(false);
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

    fetch('/api/landlord/tenancies')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setTenancies(
            (json.data.tenancies as { tenant: { id: string; name: string | null }; property: { id: string; title: string } }[]).map((t) => ({
              tenant_id: t.tenant.id,
              tenant_name: t.tenant.name,
              property_id: t.property.id,
              property_title: t.property.title,
            }))
          );
        }
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
        headers: csrfHeaders(csrf),
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

  async function startConversation() {
    if (!newSelection) return;
    const [tenant_id, property_id] = newSelection.split('::');
    setStartingConv(true);
    try {
      const res = await fetch('/api/landlord/messages', {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ tenant_id, property_id }),
      });
      const json = await res.json();
      if (json.success) {
        const convId = json.data.id;
        const exists = conversations.find((c) => c.id === convId);
        if (!exists) {
          const refreshed = await fetch('/api/landlord/messages').then((r) => r.json());
          if (refreshed.success) setConversations(refreshed.data);
        }
        setSelectedId(convId);
        setShowNewModal(false);
        setNewSelection('');
      }
    } finally {
      setStartingConv(false);
    }
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8 bg-white">
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Messages</p>
          {tenancies.length > 0 && (
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-teal hover:opacity-80"
            >
              <MessageSquarePlus className="w-4 h-4" />
              New
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-4">Loading…</p>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">No conversations yet.</p>
          </div>
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

    {showNewModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Message a Tenant</h2>
            <button onClick={() => setShowNewModal(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <select
            value={newSelection}
            onChange={(e) => setNewSelection(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-4"
          >
            <option value="">Select a tenant…</option>
            {tenancies.map((t) => (
              <option key={`${t.tenant_id}::${t.property_id}`} value={`${t.tenant_id}::${t.property_id}`}>
                {t.tenant_name ?? 'Tenant'} — {t.property_title}
              </option>
            ))}
          </select>
          <button
            onClick={startConversation}
            disabled={!newSelection || startingConv}
            className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            {startingConv ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      </div>
    )}
    </>
  );
}
