import React, { useState } from 'react';
import { ColumnStatus } from '../types';

interface AddCardFormProps {
  status: ColumnStatus;
  onAddCard: (status: ColumnStatus, title: string) => Promise<void>;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({ status, onAddCard }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      await onAddCard(status, trimmedTitle);
      setTitle('');
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn-add-card"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add card
      </button>
    );
  }

  return (
    <div className="add-card-form">
      <input
        type="text"
        placeholder="Enter card title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') {
            setTitle('');
            setShowForm(false);
          }
        }}
        autoFocus
        className="add-card-input"
      />
      <div className="add-card-buttons">
        <button onClick={handleSubmit} className="btn-primary">
          Add Card
        </button>
        <button
          onClick={() => {
            setTitle('');
            setShowForm(false);
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
