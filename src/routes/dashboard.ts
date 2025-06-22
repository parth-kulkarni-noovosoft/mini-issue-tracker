import express from 'express';
import { tasks, comments, taskHistory } from '../data';
import { authenticateToken, AuthRequest } from '../auth';
import { ApiResponse, DashboardStats, UserStats, TeamStats, RecentActivity } from '../types';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const userTeamId = req.user!.team_id;

  // Calculate user stats
  const userTasks = tasks.filter(t => t.assignee_id === userId);
  const completedThisWeek = userTasks.filter(t => {
    if (t.status !== 'DONE') return false;
    const updatedDate = new Date(t.updated_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return updatedDate >= weekAgo;
  }).length;

  const overdueTasks = userTasks.filter(t => {
    if (!t.due_date || t.status === 'DONE') return false;
    const dueDate = new Date(t.due_date);
    const now = new Date();
    return dueDate < now;
  }).length;

  const userStats: UserStats = {
    assigned_tasks: userTasks.length,
    completed_this_week: completedThisWeek,
    in_progress: userTasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: overdueTasks
  };

  // Calculate team stats
  const teamTasks = userTeamId ? tasks.filter(t => t.team_id === userTeamId) : [];
  const teamStats: TeamStats = {
    total_tasks: teamTasks.length,
    todo: teamTasks.filter(t => t.status === 'TODO').length,
    in_progress: teamTasks.filter(t => t.status === 'IN_PROGRESS').length,
    in_review: teamTasks.filter(t => t.status === 'IN_REVIEW').length,
    done: teamTasks.filter(t => t.status === 'DONE').length
  };

  // Generate recent activity
  const recentActivity: RecentActivity[] = [];
  
  // Recent task assignments
  const recentAssignments = tasks
    .filter(t => t.assignee_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  recentAssignments.forEach(task => {
    recentActivity.push({
      type: 'task_assigned',
      message: `You were assigned to '${task.title}'`,
      timestamp: task.created_at
    });
  });

  // Recent comments on user's tasks
  const userTaskIds = userTasks.map(t => t.id);
  const recentComments = comments
    .filter(c => userTaskIds.includes(c.task_id) && c.user_id !== userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  recentComments.forEach(comment => {
    const task = tasks.find(t => t.id === comment.task_id);
    recentActivity.push({
      type: 'comment_added',
      message: `New comment on '${task?.title || 'Unknown task'}'`,
      timestamp: comment.created_at
    });
  });

  // Recent status changes
  const recentStatusChanges = taskHistory
    .filter(h => h.field_changed === 'status' && userTaskIds.includes(h.task_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);

  recentStatusChanges.forEach(history => {
    const task = tasks.find(t => t.id === history.task_id);
    recentActivity.push({
      type: 'status_changed',
      message: `Task '${task?.title || 'Unknown task'}' status changed to ${history.new_value}`,
      timestamp: history.created_at
    });
  });

  // Sort all activities by timestamp and take the most recent
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const finalActivity = recentActivity.slice(0, 5);

  const dashboardStats: DashboardStats = {
    user_stats: userStats,
    team_stats: teamStats,
    recent_activity: finalActivity
  };

  const response: ApiResponse<DashboardStats> = {
    success: true,
    data: dashboardStats
  };

  res.json(response);
});

export default router; 