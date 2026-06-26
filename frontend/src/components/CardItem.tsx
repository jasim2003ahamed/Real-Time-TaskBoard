import React, { useState } from 'react';
import { Card, ColumnStatus } from '../types';

interface CardItemProps {
  card: Card;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragEnd: (id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, status: ColumnStatus, id?: number) => void;
  onRename: (id: number, newTitle: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);

  const handleSave = () => {
    const title = editTitle.trim();
    if (title && title !== card.title) {
      onRename(card.id, title);
    }
    setIsEditing(false);
  };

  return (
    <div
      id={`card-${card.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={() => onDragEnd(card.id)}
      onDragOver={(e) => onDragOver(e, card.id)}
      onDrop={(e) => onDrop(e, card.status, card.id)}
      className={`card ${isDragOver ? 'drag-over' : ''}`}
    >
      <div className="card-header">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditTitle(card.title);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="card-edit-input"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setIsEditing(true);
              setEditTitle(card.title);
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
              setIsEditing(true);
              setEditTitle(card.title);
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
            onClick={() => onDelete(card.id)}
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
  );
};
