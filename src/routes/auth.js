const { Router } = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const config = require('../config/index');
const { db, collections, getDoc, getDocs, addDoc, setDoc, queryOne, serverTimestamp } = require('../utils/firestore');

const router = Router();

const generateToken = (userId) => jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').trim().notEmpty(),
  validate,
], async (req, res) => {
  try {
    const { email, password, displayName, phone } = req.body;

    const existing = await queryOne(collections.users, 'email', '==', email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await addDoc(collections.users, {
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName,
      phone: phone || '',
      role: 'student',
      status: 'pending',
      emailVerified: false,
      phoneVerified: false,
      kycStatus: 'not-started',
      eligibilityScore: 0,
      onboardingCompleted: false,
      onboardingStep: 0,
      selectedCountries: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const token = generateToken(user.id);

    await addDoc(collections.activities, {
      userId: user.id,
      type: 'auth',
      title: 'Account created',
      description: 'Welcome to Avyra!',
      icon: 'person_add',
      createdAt: serverTimestamp(),
    });

    res.status(201).json({ user: { id: user.id, ...user }, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], async (req, res) => {
  try {
    const user = await queryOne(collections.users, 'email', '==', req.body.email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    await setDoc(collections.users, user.id, { lastLoginAt: serverTimestamp() });

    const { password, ...safe } = user;
    const token = generateToken(user.id);
    res.json({ user: safe, token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await getDoc(collections.users, req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json({ user: safe });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['displayName', 'phone', 'dateOfBirth', 'nationality', 'gender', 'address', 'academicProfile', 'preferences'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = serverTimestamp();

    await setDoc(collections.users, req.user.id, updates);
    const user = await getDoc(collections.users, req.user.id);
    const { password, ...safe } = user;
    res.json({ user: safe });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', authenticate, async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(collections.users, req.user.id, {
      otpCode: code,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      otpAttempts: 0,
    });
    console.log(`OTP for ${req.user.email}: ${code}`);
    res.json({ message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', authenticate, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
  validate,
], async (req, res) => {
  try {
    const user = await getDoc(collections.users, req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otpLockedUntil && new Date(user.otpLockedUntil) > new Date()) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    if (user.otpCode !== req.body.code || new Date(user.otpExpiresAt) < new Date()) {
      const attempts = (user.otpAttempts || 0) + 1;
      const extra = attempts >= 5 ? { otpLockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString() } : {};
      await setDoc(collections.users, user.id, { otpAttempts: attempts, ...extra });
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await setDoc(collections.users, user.id, {
      emailVerified: true,
      status: 'active',
      otpCode: '',
      otpExpiresAt: '',
      otpAttempts: 0,
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  validate,
], async (req, res) => {
  try {
    const user = await queryOne(collections.users, 'email', '==', req.body.email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'No account with this email' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(collections.users, user.id, {
      otpCode: code,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    console.log(`Password reset OTP for ${user.email}: ${code}`);
    res.json({ message: 'Reset code sent to email' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  body('password').isLength({ min: 8 }),
  validate,
], async (req, res) => {
  try {
    const user = await queryOne(collections.users, 'email', '==', req.body.email.toLowerCase());
    if (!user || user.otpCode !== req.body.code || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    await setDoc(collections.users, user.id, {
      password: hashedPassword,
      otpCode: '',
      otpExpiresAt: '',
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
