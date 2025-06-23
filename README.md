# Issue Tracker System

A comprehensive issue tracking system with task management, team collaboration. Built with Express.js, TypeScript, and in-memory data storage.

## Quick Start

### Using Docker (Recommended)

```bash
# Clone or navigate to the project
cd issue-tracker-system

# Build and run with Docker Compose
docker-compose up --build

# The API will be available at http://localhost:3000
```

### Using npm
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run production
npm run build
npm start
```

## API Documentation

The server runs on `http://localhost:3000`

### Test Credentials
- **Admin**: `admin@company.com` / `admin123`

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- `GET /api/auth/me` - Get current user info

#### Users
- `GET /api/users` - List users (with pagination/filters via query params: `page`, `limit`, `search`, `team_id`, `role`)
- `POST /api/users` - Create user (Admin only)
  ```json
  {
    "email": "string",
    "name": "string",
    "password": "string",
    "role": "TEAM_LEAD|MEMBER|ADMIN",
    "team_id": "string" // optional
  }
  ```

#### Teams
- `GET /api/teams` - List teams
- `GET /api/teams/:id/members` - Get team members
- `POST /api/teams` - Create team (Admin only)
  ```json
  {
    "name": "string",
    "description": "string", // optional
    "team_lead_id": "string"
  }
  ```

#### Tasks
- `GET /api/tasks` - List tasks (with filters via query params: `team_id`, `assignee_id`, `status`, `priority`, `search`)
- `POST /api/tasks` - Create task (Team Lead/Admin only)
  ```json
  {
    "title": "string",
    "description": "string",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "team_id": "string",
    "assignee_id": "string", // optional
    "estimated_hours": "number", // optional
    "due_date": "string" // optional, YYYY-MM-DD format
  }
  ```
- `GET /api/tasks/:id` - Get task details with comments and history
- `PUT /api/tasks/:id` - Update task
  ```json
  {
    "status": "TODO|IN_PROGRESS|IN_REVIEW|DONE", // optional
    "priority": "LOW|MEDIUM|HIGH|CRITICAL", // optional
    "assignee_id": "string", // optional
    "estimated_hours": "number", // optional
    "actual_hours": "number", // optional
    "due_date": "string" // optional, YYYY-MM-DD format
  }
  ```

#### Comments
- `POST /api/tasks/:taskId/comments` - Add comment to task
  ```json
  {
    "content": "string"
  }
  ```
- `PUT /api/comments/:id` - Update comment
  ```json
  {
    "content": "string"
  }
  ```
- `DELETE /api/comments/:id` - Delete comment

#### Dashboard
- `GET /api/dashboard/stats` - Get user and team statistics
