"use client";

import React, { useState } from 'react';
import { Card, ColumnStatus, ColumnType, WSMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { Header } from '../components/Header';
import { Column } from '../components/Column';
import { cardService } from '../services/cardService';

export default function BoardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [clientId] = useState(() => Math.random().toString(36).substring(2, 11));

  // Drag and Drop State
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);

  // Fetch cards from REST API
  const fetchCards = async () => {
    try {
      const data = await cardService.getAll();
      setCards(data);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  // Handle message received via WebSocket channel
  const handleWSMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'CARD_CREATED':
        if (message.card) {
          const newCard = message.card;
          setCards((prev) => {
            if (prev.some((c) => c.id === newCard.id)) return prev;
            return [...prev, newCard].sort((a, b) => a.position - b.position);
          });
        }
        break;

      case 'CARD_UPDATED':
        if (message.card) {
          const updatedCard = message.card;
          setCards((prev) => {
            const updated = prev.map((c) => (c.id === updatedCard.id ? updatedCard : c));
            return updated.sort((a, b) => a.position - b.position);
          });
        }
        break;

      case 'CARD_DELETED':
        if (message.id !== undefined) {
          const id = message.id;
          setCards((prev) => prev.filter((c) => c.id !== id));
        }
        break;

      default:
        break;
    }
  };

  // WS connector custom hook
  const { connectionStatus, onlineCount, sendMessage } = useWebSocket(
    clientId,
    handleWSMessage,
    fetchCards // onReconnect: sync to latest DB state
  );

  // Add Card REST + WS
  const handleAddCard = async (status: ColumnStatus, title: string) => {
    try {
      const newCard = await cardService.create(title, status);
      setCards((prev) => [...prev, newCard].sort((a, b) => a.position - b.position));
      sendMessage('CARD_CREATED', { card: newCard });
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  // Delete Card REST + WS
  const handleDeleteCard = async (id: number) => {
    try {
      await cardService.delete(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      sendMessage('CARD_DELETED', { id });
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  // Inline Rename Card REST + WS
  const handleRenameCard = async (id: number, title: string) => {
    const originalCards = [...cards];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c)));

    try {
      const updatedCard = await cardService.rename(id, title);
      setCards((prev) => prev.map((c) => (c.id === id ? updatedCard : c)).sort((a, b) => a.position - b.position));
      sendMessage('CARD_UPDATED', { card: updatedCard });
    } catch (error) {
      console.error('Failed to rename card:', error);
      setCards(originalCards); // rollback
    }
  };

  // Drag and Drop Event Listeners
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';

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
    e.stopPropagation();
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

    if (cardId === targetCardId) return;

    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

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
      if (columnCards.length > 0) {
        prevPosition = columnCards[columnCards.length - 1].position;
      }
    }

    let optPosition = 1000.0;
    if (prevPosition !== undefined && nextPosition !== undefined) {
      optPosition = (prevPosition + nextPosition) / 2.0;
    } else if (prevPosition !== undefined) {
      optPosition = prevPosition + 1000.0;
    } else if (nextPosition !== undefined) {
      optPosition = nextPosition - 1000.0;
    }

    const originalCards = [...cards];
    const updatedCardsOptimistic = cards.map((c) =>
      c.id === cardId
        ? { ...c, status: targetStatus, position: optPosition, updated_at: new Date().toISOString() }
        : c
    ).sort((a, b) => a.position - b.position);
    setCards(updatedCardsOptimistic);

    try {
      const updatedCard = await cardService.reorder(cardId, targetStatus, prevPosition, nextPosition);
      setCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)).sort((a, b) => a.position - b.position));
      sendMessage('CARD_UPDATED', { card: updatedCard });
    } catch (error) {
      console.error('Failed to update drag placement:', error);
      setCards(originalCards);
    }
  };

  const columnsList: ColumnType[] = [
    { status: 'todo', label: 'To Do', emoji: '📋' },
    { status: 'in_progress', label: 'In Progress', emoji: '⚡' },
    { status: 'done', label: 'Done', emoji: '✅' },
  ];

  return (
    <div className="app-container">
      <Header connectionStatus={connectionStatus} onlineCount={onlineCount} />

      <main className="board-container">
        <div className="board">
          {columnsList.map((col) => (
            <Column
              key={col.status}
              column={col}
              cards={cards.filter((c) => c.status === col.status)}
              dragOverColumn={dragOverColumn}
              dragOverCardId={dragOverCardId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverColumn={handleDragOverColumn}
              onDragOverCard={handleDragOverCard}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onRenameCard={handleRenameCard}
              onDeleteCard={handleDeleteCard}
              onAddCard={handleAddCard}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
