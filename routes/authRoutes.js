import express from 'express';
import { login, checkAdmin } from '../controllers/authController.js';
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/check-admin', authMiddleware, checkAdmin);
// router.post('/register'); // Add registration route


export default router;
