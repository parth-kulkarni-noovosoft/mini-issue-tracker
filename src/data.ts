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

// Helper function to get user with team name
export const getUserWithTeamName = (userId: string) => {
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  const team = teams.find(t => t.id === user.team_id);
  return {
    ...user,
    team_name: team?.name
  };
};

// Helper function to get team with member count
export const getTeamWithDetails = (teamId: string) => {
  const team = teams.find(t => t.id === teamId);
  if (!team) return null;

  const memberCount = users.filter(u => u.team_id === teamId && u.is_active).length;
  const teamLead = users.find(u => u.id === team.team_lead_id);

  return {
    ...team,
    member_count: memberCount,
    team_lead_name: teamLead?.name
  };
}; 