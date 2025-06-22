import express from 'express';
import { tasks, comments, taskHistory, users, teams, generateId, getCurrentTimestamp } from '../data';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { ApiResponse, Task, TaskWithDetails, TaskHistory } from '../types';

const router = express.Router();

// GET /api/tasks
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { team_id, assignee_id, status, priority, search } = req.query;
  
  let filteredTasks = [...tasks];

  // Apply filters
  if (team_id) {
    filteredTasks = filteredTasks.filter(t => t.team_id === team_id);
  }

  if (assignee_id) {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === assignee_id);
  }

  if (status) {
    filteredTasks = filteredTasks.filter(t => t.status === status);
  }

  if (priority) {
    filteredTasks = filteredTasks.filter(t => t.priority === priority);
  }

  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredTasks = filteredTasks.filter(t => 
      t.title.toLowerCase().includes(searchTerm) || 
      t.description.toLowerCase().includes(searchTerm)
    );
  }

  const response: ApiResponse<Task[]> = {
    success: true,
    data: filteredTasks
  };

  res.json(response);
});

// POST /api/tasks (Team Lead/Admin Only)
router.post('/', authenticateToken, requireRole(['TEAM_LEAD', 'ADMIN']), (req: AuthRequest, res) => {
  const { title, description, priority, assignee_id, team_id, estimated_hours, due_date } = req.body;

  // Validation
  if (!title || !description || !priority || !team_id) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Title, description, priority, and team_id are required'
      }
    };
    return res.status(400).json(response);
  }

  // Validate team
  const team = teams.find(t => t.id === team_id);
  if (!team) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid team_id'
      }
    };
    return res.status(400).json(response);
  }

  // Validate assignee if provided
  let assignee = null;
  if (assignee_id) {
    assignee = users.find(u => u.id === assignee_id && u.is_active);
    if (!assignee) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid assignee_id'
        }
      };
      return res.status(400).json(response);
    }
  }

  const reporter = users.find(u => u.id === req.user!.id);

  // Create new task
  const newTask: Task = {
    id: generateId('task'),
    title,
    description,
    status: 'TODO',
    priority,
    assignee_id,
    assignee_name: assignee?.name,
    assignee_email: assignee?.email,
    reporter_id: req.user!.id,
    reporter_name: reporter?.name,
    team_id,
    team_name: team.name,
    estimated_hours,
    due_date,
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp()
  };

  tasks.push(newTask);

  const response: ApiResponse<Task> = {
    success: true,
    data: newTask,
    message: 'Task created successfully'
  };

  res.json(response);
});

// GET /api/tasks/:id
router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const task = tasks.find(t => t.id === id);
  if (!task) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found'
      }
    };
    return res.status(404).json(response);
  }

  // Get comments for this task
  const taskComments = comments.filter(c => c.task_id === id);
  
  // Get history for this task
  const taskHistoryRecords = taskHistory.filter(h => h.task_id === id);

  const taskWithDetails: TaskWithDetails = {
    ...task,
    comments: taskComments,
    history: taskHistoryRecords
  };

  const response: ApiResponse<TaskWithDetails> = {
    success: true,
    data: taskWithDetails
  };

  res.json(response);
});

// PUT /api/tasks/:id
router.put('/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, priority, assignee_id, estimated_hours, actual_hours, due_date } = req.body;
  
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found'
      }
    };
    return res.status(404).json(response);
  }

  const task = tasks[taskIndex];
  const user = users.find(u => u.id === req.user!.id);

  const isAdminOrTeamLead = req.user?.role === 'ADMIN' || req.user?.role === 'TEAM_LEAD';
  const isAssignee = task.assignee_id === req.user!.id;

  // Check permissions - only assignee, team lead, or admin can update
  if (!isAssignee && !isAdminOrTeamLead) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only update tasks assigned to you'
      }
    };
    return res.status(403).json(response);
  }

  // Track changes for history
  const changes: Array<{field: string, oldValue: any, newValue: any}> = [];

  // Update fields if provided
  if (status && status !== task.status) {
    // Validate status transition
    const validTransitions: Record<string, string[]> = isAssignee ? {
      'TODO': ['IN_PROGRESS'],
      'IN_PROGRESS': ['IN_REVIEW', 'TODO'],
    } : {
      'TODO': ['IN_PROGRESS'],
      'IN_PROGRESS': ['IN_REVIEW', 'TODO'],
      'IN_REVIEW': ['DONE', 'IN_PROGRESS'],
      'DONE': ['IN_PROGRESS']
    };

    if (!validTransitions[task.status]?.includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot change status from ${task.status} to ${status}`
        }
      };
      return res.status(400).json(response);
    }

    changes.push({field: 'status', oldValue: task.status, newValue: status});
    task.status = status;
  }

  if (priority && priority !== task.priority) {
    // Only admin/team lead can change priority
    if (isAssignee && !isAdminOrTeamLead) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admin or team lead can change task priority'
        }
      };
      return res.status(403).json(response);
    }

    changes.push({field: 'priority', oldValue: task.priority, newValue: priority});
    task.priority = priority;
  }

  if (assignee_id !== undefined && assignee_id !== task.assignee_id) {
    // Only admin/team lead can change assignee
    if (isAssignee && !isAdminOrTeamLead) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admin or team lead can change task assignee'
        }
      };
      return res.status(403).json(response);
    }

    let assignee = null;
    if (assignee_id) {
      assignee = users.find(u => u.id === assignee_id && u.is_active);
      if (!assignee) {
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid assignee_id'
          }
        };
        return res.status(400).json(response);
      }
    }

    changes.push({field: 'assignee', oldValue: task.assignee_name, newValue: assignee?.name || null});
    task.assignee_id = assignee_id || undefined;
    task.assignee_name = assignee?.name;
    task.assignee_email = assignee?.email;
  }

  if (estimated_hours !== undefined) {
    changes.push({field: 'estimated_hours', oldValue: task.estimated_hours, newValue: estimated_hours});
    task.estimated_hours = estimated_hours;
  }

  if (actual_hours !== undefined) {
    changes.push({field: 'actual_hours', oldValue: task.actual_hours, newValue: actual_hours});
    task.actual_hours = actual_hours;
  }

  if (due_date !== undefined) {
    // Only admin/team lead can change due date
    if (isAssignee && !isAdminOrTeamLead) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admin or team lead can change task due date'
        }
      };
      return res.status(403).json(response);
    }

    changes.push({field: 'due_date', oldValue: task.due_date, newValue: due_date});
    task.due_date = due_date;
  }

  task.updated_at = getCurrentTimestamp();

  // Add history entries for changes
  changes.forEach(change => {
    const historyEntry: TaskHistory = {
      id: generateId('history'),
      task_id: id,
      user_id: req.user!.id,
      user_name: user?.name || 'Unknown',
      field_changed: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      created_at: getCurrentTimestamp()
    };
    taskHistory.push(historyEntry);
  });

  const response: ApiResponse<Partial<Task>> = {
    success: true,
    data: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id,
      assignee_name: task.assignee_name,
      estimated_hours: task.estimated_hours,
      actual_hours: task.actual_hours,
      due_date: task.due_date,
      updated_at: task.updated_at
    },
    message: 'Task updated successfully'
  };

  res.json(response);
});

export default router; 