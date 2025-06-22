import express from 'express';
import { teams, users, generateId, getCurrentTimestamp } from '../data';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { ApiResponse, TeamWithDetails, TeamWithMembers } from '../types';

const router = express.Router();

// GET /api/teams
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const isAdmin = req.user?.role === 'ADMIN';
  const teamsWithDetails = teams.filter(t => isAdmin ? true : t.is_active).map(team => {
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
  
  const isAdmin = req.user?.role === 'ADMIN';
  const team = teams.find(t => t.id === id && (isAdmin ? true : t.is_active));
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

// PUT /api/teams/:id (Admin Only)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, team_lead_id, is_active } = req.body;

  // Find team
  const teamIndex = teams.findIndex(t => t.id === id);
  if (teamIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Team not found'
      }
    };
    return res.status(404).json(response);
  }

  const team = teams[teamIndex];
  const oldTeamLeadId = team.team_lead_id;
  const oldTeamName = team.name;

  // Validate team lead exists if provided
  if (team_lead_id) {
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
  }

  // Update team fields
  if (name) team.name = name;
  if (description !== undefined) team.description = description;
  if (team_lead_id) {
    team.team_lead_id = team_lead_id;
    const teamLead = users.find(u => u.id === team_lead_id);
    team.team_lead_name = teamLead?.name;
  }
  if (is_active !== undefined) team.is_active = is_active;
  team.updated_at = getCurrentTimestamp();

  // Update team member count
  team.member_count = users.filter(u => u.team_id === id && u.is_active).length;

  // Update team name in all users if team name changed
  if (name && name !== oldTeamName) {
    users.forEach(user => {
      if (user.team_id === id) {
        user.team_name = name;
        user.updated_at = getCurrentTimestamp();
      }
    });
  }

  // Handle team lead changes
  if (team_lead_id && team_lead_id !== oldTeamLeadId) {
    // Remove old team lead from team if they're not already in this team
    if (oldTeamLeadId) {
      const oldTeamLeadIndex = users.findIndex(u => u.id === oldTeamLeadId);
      if (oldTeamLeadIndex !== -1 && users[oldTeamLeadIndex].team_id !== id) {
        // Old team lead is not in this team, so no need to remove them
      }
    }

    // Add new team lead to team
    const newTeamLeadIndex = users.findIndex(u => u.id === team_lead_id);
    if (newTeamLeadIndex !== -1) {
      const oldTeamId = users[newTeamLeadIndex].team_id;
      users[newTeamLeadIndex].team_id = id;
      users[newTeamLeadIndex].team_name = team.name;
      users[newTeamLeadIndex].updated_at = getCurrentTimestamp();

      // Update old team's member count if team lead moved from another team
      if (oldTeamId && oldTeamId !== id) {
        const oldTeamIndex = teams.findIndex(t => t.id === oldTeamId);
        if (oldTeamIndex !== -1) {
          teams[oldTeamIndex].member_count = users.filter(u => u.team_id === oldTeamId && u.is_active).length;
        }
      }

      // Update current team's member count
      team.member_count = users.filter(u => u.team_id === id && u.is_active).length;
    }
  }

  const response: ApiResponse<TeamWithDetails> = {
    success: true,
    data: {
      id: team.id,
      name: team.name,
      description: team.description,
      team_lead_id: team.team_lead_id,
      team_lead_name: team.team_lead_name,
      member_count: team.member_count,
      is_active: team.is_active,
      created_at: team.created_at
    },
    message: 'Team updated successfully'
  };

  res.json(response);
});

export default router; 