import React, { useState } from 'react';
import { Card, ColumnStatus } from '../types';
import { EditIcon, TrashIcon } from './icons/Icons';

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
            <EditIcon />
          </button>
          
          <button
            title="Delete Card"
            onClick={() => onDelete(card.id)}
            className="btn-icon btn-icon-delete"
          >
            <TrashIcon />
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
