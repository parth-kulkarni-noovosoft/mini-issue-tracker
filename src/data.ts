import bcrypt from 'bcryptjs';
import { User, Team, Task, Comment, TaskHistory } from './types';

// In-memory database
export const users: User[] = [
  {
    id: 'admin_001',
    email: 'admin@company.com',
    name: 'Admin User',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    is_active: true,
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z'
  }
];

export const teams: Team[] = [];

export const tasks: Task[] = [];

export const comments: Comment[] = [];

export const taskHistory: TaskHistory[] = [];

// Helper functions to generate IDs
export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};