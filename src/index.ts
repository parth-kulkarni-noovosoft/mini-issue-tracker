import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import teamRoutes from './routes/teams';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Middleware
app.use(cors());
app.use(morgan('combined')); // HTTP request logging
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', commentRoutes); // Comments are nested under tasks
app.use('/api/comments', commentRoutes); // Direct comment operations
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Issue Tracker API is running!',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Issue Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teams: '/api/teams',
      tasks: '/api/tasks',
      comments: '/api/comments',
      dashboard: '/api/dashboard',
      health: '/health'
    },
    features: [
      'Task Management',
      'Team Collaboration',
      'Comment System',
      'Role-based Access Control',
      'Dashboard & Analytics'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong'
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Issue Tracker API is running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log('\n📧 Test Credentials:');
  console.log('  Admin: admin@company.com / admin123');
});

export default app; 