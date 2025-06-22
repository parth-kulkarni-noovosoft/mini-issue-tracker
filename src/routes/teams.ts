import express from 'express';
import { teams, users, generateId, getCurrentTimestamp } from '../data';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { ApiResponse, TeamWithDetails, TeamWithMembers } from '../types';

const router = express.Router();

// GET /api/teams
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const teamsWithDetails = teams.filter(t => t.is_active).map(team => {
    const memberCount = users.filter(u => u.team_id === team.id && u.is_active).length;
    const teamLead = users.find(u => u.id === team.team_lead_id);
    
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      team_lead_id: team.team_lead_id,
      team_lead_name: teamLead?.name,
      member_count: memberCount,
      is_active: team.is_active,
      created_at: team.created_at
    };
  });

  const response: ApiResponse<TeamWithDetails[]> = {
    success: true,
    data: teamsWithDetails
  };

  res.json(response);
});

// GET /api/teams/:id/members
router.get('/:id/members', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const team = teams.find(t => t.id === id && t.is_active);
  if (!team) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Team not found'
      }
    };
    return res.status(404).json(response);
  }

  const teamMembers = users
    .filter(u => u.team_id === id && u.is_active)
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }));

  const teamLead = users.find(u => u.id === team.team_lead_id);

  const response: ApiResponse<TeamWithMembers> = {
    success: true,
    data: {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        team_lead_id: team.team_lead_id,
        team_lead_name: teamLead?.name
      },
      members: teamMembers
    }
  };

  res.json(response);
});

// POST /api/teams (Admin Only)
router.post('/', authenticateToken, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { name, description, team_lead_id } = req.body;

  // Validation
  if (!name || !team_lead_id) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name and team_lead_id are required'
      }
    };
    return res.status(400).json(response);
  }

  // Validate team lead exists
  const teamLead = users.find(u => u.id === team_lead_id && u.is_active);
  if (!teamLead) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid team_lead_id'
      }
    };
    return res.status(400).json(response);
  }

  // Create new team
  const newTeam = {
    id: generateId('team'),
    name,
    description,
    team_lead_id,
    team_lead_name: teamLead.name,
    member_count: 0,
    is_active: true,
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp()
  };

  teams.push(newTeam);

  // Update team lead's team_id
  const userIndex = users.findIndex(u => u.id === team_lead_id);
  if (userIndex !== -1) {
    users[userIndex].team_id = newTeam.id;
    users[userIndex].team_name = newTeam.name;
    users[userIndex].updated_at = getCurrentTimestamp();
  }

  // Update member count
  newTeam.member_count = users.filter(u => u.team_id === newTeam.id && u.is_active).length;

  const response: ApiResponse<TeamWithDetails> = {
    success: true,
    data: newTeam,
    message: 'Team created successfully'
  };

  res.json(response);
});

export default router; 