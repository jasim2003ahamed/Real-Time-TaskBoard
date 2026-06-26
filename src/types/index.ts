export interface Card {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
}

export type ColumnStatus = 'todo' | 'in_progress' | 'done';

export interface ColumnType {
  status: ColumnStatus;
  label: string;
  emoji: string;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface WSMessage {
  type: 'PRESENCE_CHANGE' | 'CARD_CREATED' | 'CARD_UPDATED' | 'CARD_DELETED';
  clientId?: string;
  count?: number;
  card?: Card;
  id?: number;
}
