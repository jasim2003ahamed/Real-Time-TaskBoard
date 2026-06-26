"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Card {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
}

type ColumnStatus = 'todo' | 'in_progress' | 'done';

export default function BoardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Drag and Drop States
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);
  
  // Add Card States
  const [showAddForm, setShowAddForm] = useState<Record<ColumnStatus, boolean>>({
    todo: false,
    in_progress: false,
    done: false,
  });
  const [newCardTitles, setNewCardTitles] = useState<Record<ColumnStatus, string>>({
    todo: '',
    in_progress: '',
    done: '',
  });

  // Edit Card States
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Refs for WebSockets and Reconnection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectDelay, setReconnectDelay] = useState<number>(1000);
  
  // Unique client UUID for session (used for message de-duplication)
  const [clientId] = useState(() => Math.random().toString(36).substring(2, 11));

  // Fetch all cards from database
  const fetchCards = async () => {
    try {
      const res = await axios.get<Card[]>('/api/cards');
      setCards(res.data);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  // Connect to WebSocket Server
  const connectWS = () => {
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus('reconnecting');
    console.log('[WS] Connecting to server...');

    // WebSocket server runs on port 3001
    const wsUrl = `ws://${window.location.hostname}:3001`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[WS] Connected successfully');
      setConnectionStatus('connected');
      setReconnectDelay(1000); // Reset reconnect delay on successful connection
      
      // On reconnect, always pull the latest cards from DB to sync up missed events
      fetchCards();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Skip messages sent by this client (double protection)
        if (message.clientId === clientId) {
          return;
        }

        console.log('[WS] Received update:', message.type);

        switch (message.type) {
          case 'PRESENCE_CHANGE':
            setOnlineCount(message.count || 1);
            break;
            
          case 'CARD_CREATED':
            setCards((prev) => {
              // Ensure we don't duplicate
              if (prev.some((c) => c.id === message.card.id)) return prev;
              return [...prev, message.card].sort((a, b) => a.position - b.position);
            });
            break;
            
          case 'CARD_UPDATED':
            setCards((prev) => {
              const updated = prev.map((c) => (c.id === message.card.id ? message.card : c));
              return updated.sort((a, b) => a.position - b.position);
            });
            break;
            
          case 'CARD_DELETED':
            setCards((prev) => prev.filter((c) => c.id !== message.id));
            break;
            
          default:
            break;
        }
      } catch (err) {
        console.error('[WS] Error processing message payload:', err);
      }
    };

    socket.onclose = () => {
      console.log('[WS] Connection closed. Reconnecting...');
      setConnectionStatus('reconnecting');
      wsRef.current = null;

      // Exponential backoff reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectDelay((prev) => Math.min(prev * 2, 16000));
        connectWS();
      }, reconnectDelay);
    };

    socket.onerror = (error) => {
      console.error('[WS] Socket error encountered:', error);
      socket.close(); // Close triggers the close handler to reconnect
    };
  };

  // Initialize data and connections
  useEffect(() => {
    fetchCards();
    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Send WS Broadcast Helper
  const sendWSBroadcast = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          clientId,
          ...payload,
        })
      );
    }
  };

  // Add Card Method
  const handleAddCard = async (status: ColumnStatus) => {
    const title = newCardTitles[status].trim();
    if (!title) return;

    try {
      const res = await axios.post<Card>('/api/cards', { title, status });
      const newCard = res.data;

      // Update state locally
      setCards((prev) => [...prev, newCard].sort((a, b) => a.position - b.position));
      
      // Clear forms
      setNewCardTitles((prev) => ({ ...prev, [status]: '' }));
      setShowAddForm((prev) => ({ ...prev, [status]: false }));

      // Broadcast event
      sendWSBroadcast('CARD_CREATED', { card: newCard });
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  // Delete Card Method
  const handleDeleteCard = async (id: number) => {
    try {
      await axios.delete('/api/cards', { params: { id } });
      
      // Update state locally
      setCards((prev) => prev.filter((c) => c.id !== id));
      
      // Broadcast event
      sendWSBroadcast('CARD_DELETED', { id });
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  // Rename Card Method
  const handleRenameCard = async (id: number) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingCardId(null);
      return;
    }

    // Optimistically update locally
    const originalCards = [...cards];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c)));
    setEditingCardId(null);

    try {
      const res = await axios.patch<Card>('/api/cards', { id, title });
      const updatedCard = res.data;

      // Refine local state with actual DB response
      setCards((prev) => prev.map((c) => (c.id === id ? updatedCard : c)).sort((a, b) => a.position - b.position));
      
      // Broadcast event
      sendWSBroadcast('CARD_UPDATED', { card: updatedCard });
    } catch (error) {
      console.error('Failed to rename card:', error);
      setCards(originalCards); // rollback
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Slight delay to allow transparency effect on element drag starts
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) el.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (id: number) => {
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
    const el = document.getElementById(`card-${id}`);
    if (el) el.classList.remove('dragging');
  };

  const handleDragOverColumn = (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragOverCard = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation(); // prevent column-level dragover from overriding card-level hover
    if (dragOverCardId !== id) {
      setDragOverCardId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverCardId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ColumnStatus, targetCardId?: number) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverCardId(null);

    const cardIdStr = e.dataTransfer.getData('text/plain') || draggingId?.toString();
    if (!cardIdStr) return;
    const cardId = parseInt(cardIdStr, 10);

    // If dropped on itself, do nothing
    if (cardId === targetCardId) return;

    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

    // Filter other cards in the target column
    const columnCards = cards.filter((c) => c.status === targetStatus && c.id !== cardId);

    let prevPosition: number | undefined = undefined;
    let nextPosition: number | undefined = undefined;

    if (targetCardId !== undefined) {
      const idx = columnCards.findIndex((c) => c.id === targetCardId);
      if (idx !== -1) {
        nextPosition = columnCards[idx].position;
        if (idx > 0) {
          prevPosition = columnCards[idx - 1].position;
        }
      }
    } else {
      // Dropped on column container (bottom)
      if (columnCards.length > 0) {
        prevPosition = columnCards[columnCards.length - 1].position;
      }
    }

    // Optimistically compute position
    let optPosition = 1000.0;
    if (prevPosition !== undefined && nextPosition !== undefined) {
      optPosition = (prevPosition + nextPosition) / 2.0;
    } else if (prevPosition !== undefined) {
      optPosition = prevPosition + 1000.0;
    } else if (nextPosition !== undefined) {
      optPosition = nextPosition - 1000.0;
    }

    // Optimistically update card position state immediately
    const originalCards = [...cards];
    const updatedCardsOptimistic = cards.map((c) =>
      c.id === cardId
        ? { ...c, status: targetStatus, position: optPosition, updated_at: new Date().toISOString() }
        : c
    ).sort((a, b) => a.position - b.position);
    setCards(updatedCardsOptimistic);

    try {
      const res = await axios.patch<Card>('/api/cards', {
        id: cardId,
        status: targetStatus,
        prevPosition,
        nextPosition,
      });
      const updatedCard = res.data;

      // Sync state with actual DB response
      setCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)).sort((a, b) => a.position - b.position));
      
      // Broadcast update
      sendWSBroadcast('CARD_UPDATED', { card: updatedCard });
    } catch (error) {
      console.error('Failed to update drag placement:', error);
      setCards(originalCards); // Rollback
    }
  };

  const columns: { status: ColumnStatus; label: string; emoji: string }[] = [
    { status: 'todo', label: 'To Do', emoji: '📋' },
    { status: 'in_progress', label: 'In Progress', emoji: '⚡' },
    { status: 'done', label: 'Done', emoji: '✅' },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon"></span>
            SyncBoard
          </div>
        </div>
        
        <div className="status-indicators">
          {/* Connection Status Pill */}
          <div className={`pill pill-status ${connectionStatus}`}>
            <span className="status-dot"></span>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'reconnecting' && 'Reconnecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </div>

          {/* Presence Count Pill */}
          <div className="pill pill-presence">
            <span>👥</span>
            <span>{onlineCount} {onlineCount === 1 ? 'user' : 'users'} active</span>
          </div>
        </div>
      </header>

      {/* Drag & Drop Board */}
      <main className="board-container">
        <div className="board">
          {columns.map((col) => {
            const columnCards = cards.filter((c) => c.status === col.status);
            
            return (
              <div
                key={col.status}
                className={`column ${dragOverColumn === col.status && !dragOverCardId ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOverColumn(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column Header */}
                <div className="column-header">
                  <div className="column-title-container">
                    <span className="column-emoji">{col.emoji}</span>
                    <h2 className="column-title">{col.label}</h2>
                    <span className="column-count">{columnCards.length}</span>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="cards-list">
                  {columnCards.map((card) => (
                    <div
                      key={card.id}
                      id={`card-${card.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragEnd={() => handleDragEnd(card.id)}
                      onDragOver={(e) => handleDragOverCard(e, card.id)}
                      onDrop={(e) => handleDrop(e, col.status, card.id)}
                      className={`card ${dragOverCardId === card.id ? 'drag-over' : ''}`}
                    >
                      <div className="card-header">
                        {editingCardId === card.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleRenameCard(card.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameCard(card.id);
                              if (e.key === 'Escape') setEditingCardId(null);
                            }}
                            autoFocus
                            className="card-edit-input"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              setEditingCardId(card.id);
                              setEditingTitle(card.title);
                            }}
                            title="Double click to edit title"
                            className="card-title"
                          >
                            {card.title}
                          </span>
                        )}

                        <div className="card-actions">
                          <button
                            title="Edit Title"
                            onClick={() => {
                              setEditingCardId(card.id);
                              setEditingTitle(card.title);
                            }}
                            className="btn-icon"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                            </svg>
                          </button>
                          
                          <button
                            title="Delete Card"
                            onClick={() => handleDeleteCard(card.id)}
                            className="btn-icon btn-icon-delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="card-footer">
                        <span>
                          {new Date(card.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Card Form/Button Area */}
                <div className="add-card-container">
                  {showAddForm[col.status] ? (
                    <div className="add-card-form">
                      <input
                        type="text"
                        placeholder="Enter card title..."
                        value={newCardTitles[col.status]}
                        onChange={(e) =>
                          setNewCardTitles((prev) => ({ ...prev, [col.status]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCard(col.status);
                          if (e.key === 'Escape') {
                            setShowAddForm((prev) => ({ ...prev, [col.status]: false }));
                          }
                        }}
                        autoFocus
                        className="add-card-input"
                      />
                      <div className="add-card-buttons">
                        <button
                          onClick={() => handleAddCard(col.status)}
                          className="btn-primary"
                        >
                          Add Card
                        </button>
                        <button
                          onClick={() =>
                            setShowAddForm((prev) => ({ ...prev, [col.status]: false }))
                          }
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setShowAddForm((prev) => ({ ...prev, [col.status]: true }))
                      }
                      className="btn-add-card"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add card
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
