import React, { useState } from 'react';
import { ColumnStatus } from '../types';
import { PlusIcon } from './icons/Icons';

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
        <PlusIcon />
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
