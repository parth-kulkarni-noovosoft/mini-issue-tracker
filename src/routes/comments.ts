import express from 'express';
import { tasks, comments, users, generateId, getCurrentTimestamp } from '../data';
import { authenticateToken, AuthRequest } from '../auth';
import { ApiResponse, Comment } from '../types';

const router = express.Router();

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', authenticateToken, (req: AuthRequest, res) => {
  const { taskId } = req.params;
  const { content } = req.body;

  // Validation
  if (!content || content.trim().length === 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Comment content is required'
      }
    };
    return res.status(400).json(response);
  }

  // Check if task exists
  const task = tasks.find(t => t.id === taskId);
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

  const user = users.find(u => u.id === req.user!.id);

  // Create new comment
  const newComment: Comment = {
    id: generateId('comment'),
    task_id: taskId,
    user_id: req.user!.id,
    user_name: user?.name || 'Unknown',
    content: content.trim(),
    is_edited: false,
    created_at: getCurrentTimestamp(),
  };

  comments.push(newComment);

  const response: ApiResponse<Comment> = {
    success: true,
    data: newComment,
    message: 'Comment added successfully'
  };

  res.json(response);
});

// PUT /api/comments/:id
router.put('/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { content } = req.body;

  // Validation
  if (!content || content.trim().length === 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Comment content is required'
      }
    };
    return res.status(400).json(response);
  }

  const commentIndex = comments.findIndex(c => c.id === id);
  if (commentIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Comment not found'
      }
    };
    return res.status(404).json(response);
  }

  const comment = comments[commentIndex];

  // Check if user can edit this comment
  if (comment.user_id !== req.user!.id) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only edit your own comments'
      }
    };
    return res.status(403).json(response);
  }

  // Update comment
  comment.content = content.trim();
  comment.is_edited = true;
  comment.updated_at = getCurrentTimestamp();

  const response: ApiResponse<Partial<Comment>> = {
    success: true,
    data: {
      id: comment.id,
      content: comment.content,
      is_edited: comment.is_edited,
      updated_at: comment.updated_at
    },
    message: 'Comment updated successfully'
  };

  res.json(response);
});

// DELETE /api/comments/:id
router.delete('/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;

  const commentIndex = comments.findIndex(c => c.id === id);
  if (commentIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Comment not found'
      }
    };
    return res.status(404).json(response);
  }

  const comment = comments[commentIndex];

  // Check if user can delete this comment
  if (comment.user_id !== req.user!.id && !['TEAM_LEAD', 'ADMIN'].includes(req.user!.role)) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only delete your own comments'
      }
    };
    return res.status(403).json(response);
  }

  // Remove comment
  comments.splice(commentIndex, 1);

  const response: ApiResponse<null> = {
    success: true,
    message: 'Comment deleted successfully'
  };

  res.json(response);
});

export default router; 