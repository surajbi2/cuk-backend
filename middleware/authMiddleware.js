import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    const tokenValue = token.replace('Bearer ', '');

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is missing in .env file');
        return res.status(500).json({ message: 'Server error: Missing JWT_SECRET' });
    }

    jwt.verify(tokenValue, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};
