import React from 'react';
import { Card, ColumnStatus, ColumnType } from '../types';
import { CardItem } from './CardItem';
import { AddCardForm } from './AddCardForm';

interface ColumnProps {
  column: ColumnType;
  cards: Card[];
  dragOverColumn: ColumnStatus | null;
  dragOverCardId: number | null;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragEnd: (id: number) => void;
  onDragOverColumn: (e: React.DragEvent, status: ColumnStatus) => void;
  onDragOverCard: (e: React.DragEvent, id: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, status: ColumnStatus, id?: number) => void;
  onRenameCard: (id: number, newTitle: string) => Promise<void>;
  onDeleteCard: (id: number) => Promise<void>;
  onAddCard: (status: ColumnStatus, title: string) => Promise<void>;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  cards,
  dragOverColumn,
  dragOverCardId,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDragOverCard,
  onDragLeave,
  onDrop,
  onRenameCard,
  onDeleteCard,
  onAddCard,
}) => {
  const isColumnDragOver = dragOverColumn === column.status && !dragOverCardId;

  return (
    <div
      className={`column ${isColumnDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => onDragOverColumn(e, column.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.status)}
    >
      {/* Column Header */}
      <div className="column-header">
        <div className="column-title-container">
          <span className="column-emoji">{column.emoji}</span>
          <h2 className="column-title">{column.label}</h2>
          <span className="column-count">{cards.length}</span>
        </div>
      </div>

      {/* Column Cards Container */}
      <div className="cards-list">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            isDragOver={dragOverCardId === card.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOverCard}
            onDrop={onDrop}
            onRename={onRenameCard}
            onDelete={onDeleteCard}
          />
        ))}
      </div>

      {/* Add Card Form/Button Area */}
      <div className="add-card-container">
        <AddCardForm status={column.status} onAddCard={onAddCard} />
      </div>
    </div>
  );
};
