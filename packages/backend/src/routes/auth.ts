import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { generateToken, AuthUser } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

// In-memory user storage (replace with database in production)
// Default admin user: admin@orchiai.com / admin123
interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

const users: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@orchiai.com',
    password: '$2b$10$rQYZ9KkV.nXQvJvH7f7Iru5vF2F4.aZQmZRZzQGvW8YqH4.eJKJ6W', // admin123
    role: 'admin',
    createdAt: new Date(),
  },
];

// Login schema
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info({ email }, 'Login attempt');

    // Find user
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      logger.warn({ email }, 'Failed login attempt - invalid password');
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate token
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(authUser);

    logger.info({ email, userId: user.id }, 'Login successful');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register schema (admin only)
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['admin', 'user']).optional().default('user'),
  }),
});

/**
 * POST /api/v1/auth/register
 * Register new user (for development - should be protected in production)
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    logger.info({ email, role }, 'Registration attempt');

    // Check if user exists
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email,
      password: hashedPassword,
      role: role as 'admin' | 'user',
      createdAt: new Date(),
    };

    users.push(newUser);

    // Generate token
    const authUser: AuthUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const token = generateToken(authUser);

    logger.info({ email, userId: newUser.id }, 'Registration successful');

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', async (req, res, next) => {
  try {
    // This endpoint can use optional auth to show login status
    if (!req.user) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const user = users.find((u) => u.id === req.user!.id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
