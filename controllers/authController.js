import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';

dotenv.config(); 
console.log('JWT_SECRET:', process.env.JWT_SECRET);

export const validateLogin = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('🔹 Received Login Request:', req.body);

  try {

    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (results.length === 0) {
      console.log('❌ User not found');
      return res.status(400).json({ error: 'User not found' });
    }

    const user = results[0];
    console.log('🔹 User found:', user);


    if (password !== user.password) {
      console.log('❌ Invalid credentials');
      return res.status(400).json({ error: 'Invalid credentials' });
    }


    const token = jwt.sign({ 
      userId: user.id,
      role: user.role 
    }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    console.log('✅ Login successful, sending token');
    console.log('🔹 Response:', { token, role: user.role });
    res.json({ token, role: user.role });

  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkAdmin = (req, res) => {
  try {
    // The authMiddleware already verified the token and set req.user
    const isAdmin = req.user.role === 'admin';
    res.json({ isAdmin });
  } catch (err) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
