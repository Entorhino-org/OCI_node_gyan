import { body, validationResult } from 'express-validator';

// Middleware to check validation results
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// --- Auth Validations ---

export const loginRules = [
    body('username').optional().trim().notEmpty().withMessage('Username is required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
    body('role').isIn(['STUDENT', 'TEACHER', 'ADMIN']).withMessage('Invalid role'),
];

export const googleLoginRules = [
    body('idToken')
        .isString()
        .isLength({ min: 100, max: 3000 })
        .withMessage('Invalid Google token'),
    body('role')
        .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
        .withMessage('Invalid role for Google login')
];

export const devLoginRules = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordRules = [
    body('role').isIn(['STUDENT', 'TEACHER', 'ADMIN']).withMessage('Invalid role'),
    body('identifier').trim().notEmpty().withMessage('Email or username is required'),
];

export const resetPasswordRules = [
    body('role').isIn(['STUDENT', 'TEACHER', 'ADMIN']).withMessage('Invalid role'),
    body('identifier').trim().notEmpty().withMessage('Identifier is required'),
    body('code').trim().notEmpty().withMessage('Verification code is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// --- Data Validations ---

export const createSchoolRules = [
    body('name').trim().notEmpty().withMessage('School name is required'),
    body('adminEmail').isEmail().normalizeEmail().withMessage('Valid admin email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const createStudentRules = [
    body('name').trim().notEmpty().withMessage('Student name is required'),
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
];

export const createTeacherRules = [
    body('name').trim().notEmpty().withMessage('Teacher name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// --- AI Feature Validations ---

export const quizRules = [
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('gradeLevel').trim().notEmpty().withMessage('Grade level is required'),
    body('count').optional().isInt({ min: 1, max: 50 }).withMessage('Count must be 1-50'),
];

export const studyPlanRules = [
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('gradeLevel').trim().notEmpty().withMessage('Grade level is required'),
];

export const contactRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
];
