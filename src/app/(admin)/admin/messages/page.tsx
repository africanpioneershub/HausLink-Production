'use client';

import { useEffect, useState } from 'react';
import { Flag, LifeBuoy, MessageCircle, MessageSquare } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

interface ConversationListItem {
  id: string;
  tenant: { id: string; name: string | null; email: string };
  landlord: { id: string; name: string | null; email: string };
  property: { id: string; title: string };
  last_message: { body: string; sent_at: string } | null;
  flagged_at: string | null;
  flagged_reason: string | null;
}

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
}

export default function AdminMessagesPage() {
  const csrf = useCsrf();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [kpis, setKpis] = useState({
    totalConversations: 0,
    messagesToday: 0,
    flaggedCount: 0,
    supportTickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadConversations() {
    fetch('/api/admin/messages')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setConversations(json.data.conversations);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/messages/${selectedId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setMessages(json.data.messages);
      });
  }, [selectedId]);

  async function handleToggleFlag(id: string, currentlyFlagged: boolean) {
    let reason: string | null = null;
    if (!currentlyFlagged) {
      reason = window.prompt('Reason for flagging this conversation:');
      if (!reason) return;
    }
    setBusyId(id);
    try {
      await fetch(`/api/admin/messages/${id}/flag`, {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ reason }),
      });
      loadConversations();
    } finally {
      setBusyId(null);
    }
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Conversations"
          value={kpis.totalConversations}
          icon={MessageSquare}
          colorScheme="teal"
        />
        <KpiCard label="Messages Today" value={kpis.messagesToday} icon={MessageCircle} colorScheme="navy" />
        <KpiCard label="Flagged" value={kpis.flaggedCount} icon={Flag} colorScheme="red" />
        <KpiCard label="Support Tickets" value={kpis.supportTickets} icon={LifeBuoy} colorScheme="gold" />
      </div>

      <div className="flex h-[60vh] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 p-4">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">No conversations yet.</p>
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
                    {c.tenant.name ?? c.tenant.email} ↔ {c.landlord.name ?? c.landlord.email}
                  </p>
                  {c.flagged_at && <Flag className="w-3.5 h-3.5 text-red-500 shrink-0" />}
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
              Select a conversation to view messages (read-only)
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedConversation.tenant.name ?? selectedConversation.tenant.email} ↔{' '}
                    {selectedConversation.landlord.name ?? selectedConversation.landlord.email}
                  </p>
                  <p className="text-xs text-gray-500">{selectedConversation.property.title}</p>
                </div>
                <button
                  onClick={() =>
                    handleToggleFlag(selectedConversation.id, !!selectedConversation.flagged_at)
                  }
                  disabled={busyId === selectedConversation.id}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium disabled:opacity-50',
                    selectedConversation.flagged_at ? 'text-gray-600 hover:text-gray-700' : 'text-red-600 hover:text-red-700'
                  )}
                >
                  <Flag className="w-4 h-4" />
                  {selectedConversation.flagged_at ? 'Unflag' : 'Flag'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm max-w-md">
                    <p className="text-gray-900">{m.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(m.sent_at)}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                Admin view is read-only — messages cannot be sent from this dashboard.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
