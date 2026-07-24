require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { db, collections } = require('../utils/firestore');

const seedData = {
  users: [
    {
      email: 'admin@eduz.app',
      password: 'Admin@123456',
      displayName: 'System Admin',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      kycStatus: 'verified',
    },
    {
      email: 'consultant@eduz.app',
      password: 'Consultant@123456',
      displayName: 'Dr. Priya Sharma',
      role: 'consultant',
      status: 'active',
      emailVerified: true,
      kycStatus: 'verified',
    },
    {
      email: 'student@eduz.app',
      password: 'Student@123456',
      displayName: 'Sarah Johnson',
      role: 'student',
      status: 'active',
      emailVerified: true,
      kycStatus: 'verified',
      nationality: 'India',
      selectedCountries: ['Australia', 'Canada'],
      eligibilityScore: 78,
      preferences: { primaryDestination: 'Australia', fieldOfStudy: 'Computer Science' },
    },
  ],
  universities: [
    {
      name: 'University of Melbourne',
      country: 'Australia', city: 'Melbourne', rank: 1, worldRank: 33,
      description: "Australia's leading research university with world-class programs across all disciplines.",
      programs: [
        { name: 'Master of Computer Science', degree: 'master', duration: '2 years', tuitionFee: 48000, ieltsRequired: 6.5, toeflRequired: 79, greRequired: false },
        { name: 'Bachelor of Business', degree: 'bachelor', duration: '3 years', tuitionFee: 42000, ieltsRequired: 6.5, toeflRequired: 79 },
        { name: 'PhD in Engineering', degree: 'phd', duration: '4 years', tuitionFee: 45000, ieltsRequired: 7.0, toeflRequired: 94, greRequired: true },
      ],
    },
    {
      name: 'University of Sydney',
      country: 'Australia', city: 'Sydney', rank: 2, worldRank: 41,
      description: 'Premier Australian university with a strong focus on research and innovation.',
      programs: [
        { name: 'Master of Data Science', degree: 'master', duration: '1.5 years', tuitionFee: 50000, ieltsRequired: 6.5, toeflRequired: 85 },
        { name: 'Bachelor of Engineering (Honours)', degree: 'bachelor', duration: '4 years', tuitionFee: 46000, ieltsRequired: 6.5, toeflRequired: 85 },
      ],
    },
    {
      name: 'UNSW Sydney',
      country: 'Australia', city: 'Sydney', rank: 3, worldRank: 45,
      description: 'Leading university known for engineering, technology, and business programs.',
      programs: [
        { name: 'Master of Information Technology', degree: 'master', duration: '2 years', tuitionFee: 47000, ieltsRequired: 6.5, toeflRequired: 90 },
        { name: 'Bachelor of Commerce', degree: 'bachelor', duration: '3 years', tuitionFee: 44000, ieltsRequired: 6.5, toeflRequired: 79 },
      ],
    },
    {
      name: 'University of Toronto',
      country: 'Canada', city: 'Toronto', rank: 1, worldRank: 18,
      description: "Canada's top university with global recognition across all fields of study.",
      programs: [
        { name: 'Master of Artificial Intelligence', degree: 'master', duration: '2 years', tuitionFee: 56000, ieltsRequired: 7.0, toeflRequired: 100, greRequired: true },
        { name: 'Bachelor of Science', degree: 'bachelor', duration: '4 years', tuitionFee: 52000, ieltsRequired: 6.5, toeflRequired: 89 },
      ],
    },
    {
      name: 'University of British Columbia',
      country: 'Canada', city: 'Vancouver', rank: 2, worldRank: 35,
      description: 'World-renowned research university located in beautiful Vancouver.',
      programs: [
        { name: 'Master of Business Analytics', degree: 'master', duration: '1 year', tuitionFee: 54000, ieltsRequired: 7.0, toeflRequired: 100 },
        { name: 'Bachelor of Computer Science', degree: 'bachelor', duration: '4 years', tuitionFee: 48000, ieltsRequired: 6.5, toeflRequired: 90 },
      ],
    },
    {
      name: 'University of Oxford',
      country: 'United Kingdom', city: 'Oxford', rank: 1, worldRank: 3,
      description: "One of the world's oldest and most prestigious universities.",
      programs: [
        { name: 'Master of Law (LLM)', degree: 'master', duration: '1 year', tuitionFee: 62000, ieltsRequired: 7.5, toeflRequired: 110 },
        { name: 'Bachelor of Philosophy, Politics and Economics', degree: 'bachelor', duration: '3 years', tuitionFee: 58000, ieltsRequired: 7.5, toeflRequired: 110 },
      ],
    },
  ],
  scholarships: [
    { name: 'Melbourne International Undergraduate Scholarship', universityName: 'University of Melbourne', country: 'Australia', amount: 'Up to \$15,000', amountValue: 15000, deadline: '2026-12-10', coverage: { tuition: true }, degreeLevel: ['bachelor'] },
    { name: 'Australia Awards Scholarship', country: 'Australia', amount: 'Full tuition', amountValue: 100000, deadline: '2027-01-31', coverage: { tuition: true, living: true, airfare: true, insurance: true }, degreeLevel: ['bachelor', 'master', 'phd'] },
    { name: 'UNSW International Grant', universityName: 'UNSW Sydney', country: 'Australia', amount: '\$8,000', amountValue: 8000, deadline: '2027-02-15', coverage: { tuition: true }, degreeLevel: ['bachelor', 'master'] },
    { name: 'UBC International Leader of Tomorrow Award', universityName: 'University of British Columbia', country: 'Canada', amount: 'Up to \$50,000', amountValue: 50000, deadline: '2026-12-01', coverage: { tuition: true, living: true }, degreeLevel: ['bachelor'] },
    { name: 'Chevening Scholarship', country: 'United Kingdom', amount: 'Full tuition + living', amountValue: 80000, deadline: '2026-11-05', coverage: { tuition: true, living: true, airfare: true }, degreeLevel: ['master'] },
  ],
};

async function seed() {
  try {
    console.log('Seeding Firestore...\n');

    // Seed users
    for (const u of seedData.users) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      const docRef = await db.collection(collections.users).add({
        ...u,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`User: ${u.email} (${u.role}) -> ${docRef.id}`);
    }

    // Seed universities
    for (const uni of seedData.universities) {
      const docRef = await db.collection(collections.universities).add({
        ...uni,
        createdAt: new Date().toISOString(),
      });
      console.log(`University: ${uni.name} -> ${docRef.id}`);
    }

    // Seed scholarships
    for (const s of seedData.scholarships) {
      const docRef = await db.collection(collections.scholarships).add({
        ...s,
        createdAt: new Date().toISOString(),
      });
      console.log(`Scholarship: ${s.name} -> ${docRef.id}`);
    }

    console.log('\nSeed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
