import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import issueRoutes from './modules/issues/issues.routes';

dotenv.config();

const app = express();

// Global Middleware 
app.use(cors());
app.use(express.json());

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

//
app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'DevPulse API is running' });
});

//404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

//Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    errors: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start Server
const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`DevPulse server running on port ${PORT}`);
});

export default app;
