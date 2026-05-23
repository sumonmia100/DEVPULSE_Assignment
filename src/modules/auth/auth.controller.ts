import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { SignupBody, LoginBody, UserRecord, UserRole } from '../../types';

const VALID_ROLES: UserRole[] = ['contributor', 'maintainer'];
const SALT_ROUNDS = 10;

// SIGNUP

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role }: SignupBody = req.body;
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();

    //Validate required fields
    if (!trimmedName || !trimmedEmail || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Name, email, and password are required.');
      return;
    }

    // Validate name length
    if (trimmedName.length < 2) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Name must be at least 2 characters.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid email format.');
      return;
    }

    // Validate password minimum length
    if (password.length < 8) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Password must be at least 8 characters.');
      return;
    }

    //Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Role must be contributor or maintainer.');
      return;
    }

    //Check for duplicate email
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [trimmedEmail]
    );

    if (existingUser.rows.length > 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Email already registered.');
      return;
    }

    // Hash password — never store plain text
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    //Insert user; RETURNING excludes password automatically
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [trimmedName, trimmedEmail, hashedPassword, role ?? 'contributor']
    );

    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error during registration.', error);
  }
};

// LOGIN

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginBody = req.body;

    // ── Validate required fields
    if (!email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Email and password are required.');
      return;
    }

    // ── Fetch user including password for comparison
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    const user: UserRecord = result.rows[0];


    if (!user) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    //Compare plain password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    // ── Sign JWT with id, name, role in payload
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // ── Strip password before sending response
    const { password: _password, ...userWithoutPassword } = user;

    sendSuccess(res, StatusCodes.OK, 'Login successful', {
      token,
      expiresIn: '7d',
      user: userWithoutPassword,
    });
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error during login.', error);
  }
};
