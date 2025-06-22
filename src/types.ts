export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'ADMIN' | 'TEAM_LEAD' | 'USER';
  team_id?: string;
  team_name?: string;
  is_active: boolean;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  team_lead_id: string;
  team_lead_name?: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignee_id?: string;
  assignee_name?: string;
  assignee_email?: string;
  reporter_id: string;
  reporter_name?: string;
  team_id: string;
  team_name?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id?: string;
  team_name?: string;
}

// Public user type without sensitive fields
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id?: string;
  team_name?: string;
  is_active: boolean;
  profile_picture?: string;
}

// Team with additional details for responses
export interface TeamWithDetails {
  id: string;
  name: string;
  description?: string;
  team_lead_id: string;
  team_lead_name?: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

// Team member info
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Team with members for detailed responses
export interface TeamWithMembers {
  team: {
    id: string;
    name: string;
    description?: string;
    team_lead_id: string;
    team_lead_name?: string;
  };
  members: TeamMember[];
}

// Task with full details including comments and history
export interface TaskWithDetails extends Task {
  comments: Comment[];
  history: TaskHistory[];
}

// Dashboard statistics
export interface UserStats {
  assigned_tasks: number;
  completed_this_week: number;
  in_progress: number;
  overdue: number;
}

export interface TeamStats {
  total_tasks: number;
  todo: number;
  in_progress: number;
  in_review: number;
  done: number;
}

export interface RecentActivity {
  type: 'task_assigned' | 'comment_added' | 'status_changed';
  message: string;
  timestamp: string;
}

export interface DashboardStats {
  user_stats: UserStats;
  team_stats: TeamStats;
  recent_activity: RecentActivity[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 