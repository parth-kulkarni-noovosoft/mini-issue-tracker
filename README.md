# Issue Tracker System

A comprehensive issue tracking system with task management, team collaboration, and real-time updates via WebSocket.

## Features

- **Task Management**: Create, update, and track tasks with status transitions
- **Team Collaboration**: Team-based task assignment and management
- **Comment System**: Add and edit comments on tasks
- **Role-based Access Control**: Admin, Team Lead, and User roles
- **Dashboard & Analytics**: Personal and team statistics
- **RESTful API**: Complete API with proper error handling

## Quick Start

### Using Docker (Recommended)

```bash
# Clone or navigate to the project
cd issue-tracker-system

# Build and run with Docker Compose
docker-compose up --build

# The API will be available at http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run production
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - List users (with pagination and filters)
- `POST /api/users` - Create user (Admin only)

### Teams
- `GET /api/teams` - List teams
- `GET /api/teams/:id/members` - Get team members
- `POST /api/teams` - Create team (Admin only)

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task (Team Lead/Admin only)
- `GET /api/tasks/:id` - Get task details with comments and history
- `PUT /api/tasks/:id` - Update task

### Comments
- `POST /api/tasks/:taskId/comments` - Add comment to task
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Dashboard
- `GET /api/dashboard/stats` - Get user and team statistics

## Test Credentials

The system comes with pre-configured test users:

- **Admin**: `admin@company.com` / `admin123`
- **Team Lead**: `jane.smith@company.com` / `tempPassword123`
- **User**: `john.doe@company.com` / `mypassword123`

## Testing

Run the comprehensive test suite:

```bash
# Start the server first
npm run dev

# In another terminal, run tests
npm test
```


## API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "pagination": { /* pagination info for lists */ }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { /* additional error details */ }
  }
}
```

## Task Status Workflow

Tasks follow a specific status workflow:

- `TODO` → `IN_PROGRESS`
- `IN_PROGRESS` → `IN_REVIEW` or `TODO`
- `IN_REVIEW` → `DONE` or `IN_PROGRESS`
- `DONE` → `IN_PROGRESS`

## Role Permissions

- **Admin**: Full access to all features
- **Team Lead**: Can create tasks, manage team members, view all team tasks
- **User**: Can view and update assigned tasks, add comments

## Development

### Project Structure

```
src/
├── auth.ts          # Authentication middleware
├── data.ts          # In-memory data management
├── index.ts         # Main Express application
├── types.ts         # TypeScript type definitions
└── routes/          # API route handlers
    ├── auth.ts
    ├── users.ts
    ├── teams.ts
    ├── tasks.ts
    ├── comments.ts
    └── dashboard.ts
```

### Adding New Features

1. Define types in `src/types.ts`
2. Add data structures in `src/data.ts`
3. Create route handlers in `src/routes/`
4. Register routes in `src/index.ts`
5. Add tests in `simple-tests.js`

## Health Check

The API includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## License

MIT License 