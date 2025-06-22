import express from 'express';
import bcrypt from 'bcryptjs';
import { users } from '../data';
import { generateToken, authenticateToken, AuthRequest } from '../auth';
import { ApiResponse, AuthUser, PublicUser } from '../types';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    };
    return res.status(400).json(response);
  }

  const user = users.find(u => u.email === email && u.is_active);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect'
      }
    };
    return res.status(401).json(response);
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team_id: user.team_id,
    team_name: user.team_name
  };

  const token = generateToken(authUser);

  const response: ApiResponse<{ token: string; user: AuthUser }> = {
    success: true,
    data: {
      token,
      user: authUser
    },
    message: 'Login successful'
  };

  res.json(response);
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  const user = users.find(u => u.id === req.user!.id);
  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'User not found'
      }
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<PublicUser> = {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      team_id: user.team_id,
      team_name: user.team_name,
      is_active: user.is_active,
      profile_picture: user.profile_picture
    }
  };

  res.json(response);
});

export default router; 