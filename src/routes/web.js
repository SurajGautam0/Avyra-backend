const { Router } = require('express');

const router = Router();

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Admin dashboard
router.get('/admin/dashboard', (req, res) => {
  res.render('admin/dashboard');
});

// Consultant dashboard
router.get('/consultant/dashboard', (req, res) => {
  res.render('consultant/dashboard');
});

// University dashboard
router.get('/university/dashboard', (req, res) => {
  res.render('university/dashboard');
});

// Root redirect
router.get('/', (req, res) => {
  res.redirect('/login');
});

module.exports = router;
