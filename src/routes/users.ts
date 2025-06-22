import express from 'express';
import bcrypt from 'bcryptjs';
import { users, teams, generateId, getCurrentTimestamp } from '../data';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { ApiResponse, User, PublicUser } from '../types';

const router = express.Router();

// GET /api/users
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { page = '1', limit = '10', search, team_id, role } = req.query;

  const isAdmin = req.user?.role === 'ADMIN';
  
  let filteredUsers = users.filter(u => isAdmin ? true : u.is_active);

  // Apply filters
  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredUsers = filteredUsers.filter(u => 
      u.name.toLowerCase().includes(searchTerm) || 
      u.email.toLowerCase().includes(searchTerm)
    );
  }

  if (team_id) {
    filteredUsers = filteredUsers.filter(u => u.team_id === team_id);
  }

  if (role) {
    filteredUsers = filteredUsers.filter(u => u.role === role);
  }

  // Pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Convert to public user format with team names
  const publicUsers: PublicUser[] = paginatedUsers.map(user => {
    const team = teams.find(t => t.id === user.team_id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      team_id: user.team_id,
      team_name: team?.name,
      is_active: user.is_active,
      profile_picture: user.profile_picture
    };
  });

  const response: ApiResponse<PublicUser[]> = {
    success: true,
    data: publicUsers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / limitNum)
    }
  };

  res.json(response);
});

// POST /api/users (Admin Only)
router.post('/', authenticateToken, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { email, name, password, role, team_id } = req.body;

  // Validation
  if (!email || !name || !password || !role) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email, name, password, and role are required',
        details: {
          required_fields: ['email', 'name', 'password', 'role']
        }
      }
    };
    return res.status(400).json(response);
  }

  // Check for duplicate email
  if (users.find(u => u.email === email)) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DUPLICATE_EMAIL',
        message: 'Email already exists'
      }
    };
    return res.status(400).json(response);
  }

  // Validate team if provided
  if (team_id && !teams.find(t => t.id === team_id)) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid team_id'
      }
    };
    return res.status(400).json(response);
  }

  // Create new user
  const team = team_id ? teams.find(t => t.id === team_id) : null;
  const newUser: User = {
    id: generateId('user'),
    email,
    name,
    password_hash: bcrypt.hashSync(password, 10),
    role,
    team_id,
    team_name: team?.name,
    is_active: true,
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp()
  };

  users.push(newUser);

  // Update team member count
  if (team_id) {
    const teamIndex = teams.findIndex(t => t.id === team_id);
    if (teamIndex !== -1) {
      teams[teamIndex].member_count = users.filter(u => u.team_id === team_id && u.is_active).length;
    }
  }

  const response: ApiResponse<PublicUser> = {
    success: true,
    data: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      team_id: newUser.team_id,
      team_name: newUser.team_name,
      is_active: newUser.is_active,
      profile_picture: newUser.profile_picture
    },
    message: 'User created successfully'
  };

  res.json(response);
});

export default router; 