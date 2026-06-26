import axios from 'axios';
import { Card, ColumnStatus } from '../types';

const API_BASE = '/api/cards';

export const cardService = {
  async getAll(): Promise<Card[]> {
    const res = await axios.get<Card[]>(API_BASE);
    return res.data;
  },

  async create(title: string, status: ColumnStatus): Promise<Card> {
    const res = await axios.post<Card>(API_BASE, { title, status });
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(API_BASE, { params: { id } });
  },

  async rename(id: number, title: string): Promise<Card> {
    const res = await axios.patch<Card>(API_BASE, { id, title });
    return res.data;
  },

  async reorder(
    id: number,
    status: ColumnStatus,
    prevPosition?: number,
    nextPosition?: number
  ): Promise<Card> {
    const res = await axios.patch<Card>(API_BASE, {
      id,
      status,
      prevPosition,
      nextPosition,
    });
    return res.data;
  },
};
