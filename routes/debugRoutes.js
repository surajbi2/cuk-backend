import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/debug-notices', async (req, res) => {
    try {
        const [notices] = await db.query('SELECT * FROM notices');
        res.json(notices);
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
