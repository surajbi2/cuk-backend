import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine upload path based on environment
const getUploadPath = () => {
    try {
        // Check if we're running on Render
        if (process.env.RENDER) {
            // Try different potential paths in order of preference
            const possiblePaths = [
                '/opt/render/project/public/uploads',
                '/tmp/uploads',  // Fallback to temp directory
                path.join(__dirname, '..', 'uploads')  // Last resort
            ];

            for (const uploadPath of possiblePaths) {
                try {
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
                    }
                    // Test write permissions
                    const testFile = path.join(uploadPath, '.test');
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                    console.log('Successfully using upload path:', uploadPath);
                    return uploadPath;
                } catch (err) {
                    console.log(`Cannot use ${uploadPath}:`, err.message);
                    continue;
                }
            }
            throw new Error('No writable upload directory found');
        } else {
            // Development environment
            const uploadPath = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            console.log('Using development upload path:', uploadPath);
            return uploadPath;
        }
    } catch (error) {
        console.error('Error setting up upload directory:', error);
        // Default to system temp directory as last resort
        const tempPath = path.join(process.env.TEMP || '/tmp', 'uploads');
        fs.mkdirSync(tempPath, { recursive: true });
        return tempPath;
    }
};

// Configure multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadPath = getUploadPath();
            console.log('Using upload path for file:', uploadPath);
            cb(null, uploadPath);
        } catch (error) {
            console.error('Error getting upload path:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        try {
            // Create a unique filename with original extension
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const filename = uniqueSuffix + ext;
            console.log('Generated filename:', filename);
            cb(null, filename);
        } catch (error) {
            console.error('Error generating filename:', error);
            cb(error);
        }
    }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    console.error('Multer error:', error);
    if (error instanceof multer.MulterError) {
        res.status(400).json({ message: `Upload error: ${error.message}` });
    } else {
        res.status(500).json({ message: `Server error during upload: ${error.message}` });
    }
};

// File filter function to validate uploads
const fileFilter = (req, file, cb) => {
    try {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    } catch (error) {
        cb(error);
    }
};

// Create and export the multer instance with configuration
export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

// Export other utilities
export const getUploadDirectory = getUploadPath;
export const multerErrorHandler = handleMulterError;