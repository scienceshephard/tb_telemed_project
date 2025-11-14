// Chat.jsx - SIMPLIFIED: Show sender names with messages
// Copy to: src/components/Chat.jsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../client';

export default function Chat({ appointmentId, currentUserId, otherUserId, otherUserName, currentUserName, isMinimized = false }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Fetch existing messages
  useEffect(() => {
    if (!appointmentId || !currentUserId) {
      console.log('Missing appointmentId or currentUserId');
      return;
    }

    async function fetchMessages() {
      setLoading(true);
      try {
        console.log('📨 Fetching messages for appointment:', appointmentId);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          throw error;
        }
        
        console.log('✅ Fetched', data?.length, 'messages');
        setMessages(data || []);
        
        // Mark unread messages as read
        const unreadMessages = data?.filter(
          msg => msg.receiver_id === currentUserId && !msg.is_read
        );
        
        if (unreadMessages && unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', messageIds);
          
          console.log('✓ Marked', unreadMessages.length, 'messages as read');
        }
      } catch (error) {
        console.error('Error in fetchMessages:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [appointmentId, currentUserId]);

  // Real-time subscription
  useEffect(() => {
    if (!appointmentId || !currentUserId) {
      return;
    }

    console.log('🔔 Setting up real-time subscription');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `room-${appointmentId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `appointment_id=eq.${appointmentId}`
        },
        (payload) => {
          console.log('🔥 REALTIME: New message received!', payload.new);
          
          setMessages(prev => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) {
              console.log('Duplicate, skipping');
              return prev;
            }
            
            console.log('➕ Adding to state');
            const updated = [...prev, payload.new];
            
            // Mark as read if for current user
            if (payload.new.receiver_id === currentUserId) {
              setTimeout(() => {
                supabase
                  .from('messages')
                  .update({ is_read: true })
                  .eq('id', payload.new.id)
                  .then(() => console.log('✓ Marked as read'));
              }, 500);
            }
            
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [appointmentId, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    console.log('📤 Sending:', messageContent);
    
    setSending(true);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          appointment_id: appointmentId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: messageContent,
          is_read: false
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Sent successfully');
      
      // Add immediately for instant feedback
      setMessages(prev => {
        const exists = prev.some(m => m.id === data.id);
        return exists ? prev : [...prev, data];
      });
      
    } catch (error) {
      console.error('❌ Send error:', error);
      alert('Failed to send: ' + error.message);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  }

  // Clear all messages
  async function handleClearChat() {
    if (!window.confirm('Are you sure you want to delete all messages in this chat? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('appointment_id', appointmentId);

      if (error) throw error;

      setMessages([]);
      console.log('✓ Chat cleared');
    } catch (error) {
      console.error('❌ Clear error:', error);
      alert('Failed to clear chat: ' + error.message);
    } finally {
      setClearing(false);
    }
  }

  // Format time
  function formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return '';
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${isMinimized ? 'h-32' : 'h-96'} bg-gray-50 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg ${isMinimized ? 'h-96' : 'h-full'}`}>
      {/* Chat Header */}
      <div className="bg-green-600 text-white px-4 py-3 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Chat with {otherUserName}</h3>
            <p className="text-xs text-green-100">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={clearing}
                className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded disabled:opacity-50"
                title="Clear all messages"
              >
                {clearing ? '...' : '🗑️ Clear'}
              </button>
            )}
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
<div className={`flex-1 p-4 overflow-y-auto ${isMinimized ? 'h-full' : ''}`}>
  {loading && <p className="text-center text-gray-500 pt-8">Loading messages...</p>}
  {!loading && messages.length === 0 ? (
    <div className="text-center text-gray-500 pt-8">
      Start a conversation!
    </div>
  ) : (
    messages.map((message) => {
      const isFromCurrentUser = message.sender_id === currentUserId;
      const senderName = isFromCurrentUser ? currentUserName : otherUserName;

      return (
        // 💡 1. Message Container: Aligns the bubble left or right
        <div
          key={message.id}
          className={`flex mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
          {/* 💡 2. Message Bubble: Styles the bubble */}
          <div
            className={`
              max-w-[75%] p-3 rounded-xl shadow-sm
              ${isFromCurrentUser
                ? 'bg-green-600 text-white rounded-br-none' // Sender style: Green, right corner squared
                : 'bg-gray-200 text-gray-800 rounded-tl-none'  // Receiver style: Grey, left corner squared
              }
            `}
          >
            {/* Sender Name */}
            <div className={`text-xs font-semibold mb-1 ${isFromCurrentUser ? 'text-green-100' : 'text-gray-600'}`}>
              {senderName}
            </div>
            
            {/* Message Content */}
            <p className="text-sm break-words leading-snug">
              {message.content}
            </p>

            {/* Timestamp and Read Receipt */}
            <div className={`mt-1 flex items-center ${isFromCurrentUser ? 'justify-end text-green-300' : 'justify-start text-gray-500'}`}>
              <span className="text-[10px] leading-none">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {/* Read Receipt (Sender only) */}
              {isFromCurrentUser && (
                <span className="text-xs ml-1 leading-none">
                  {message.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    })
  )}
  <div ref={messagesEndRef} />
</div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}