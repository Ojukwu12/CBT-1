const mongoose = require('mongoose');
const { env } = require('./src/config/env');
const University = require('./src/models/University');
const Faculty = require('./src/models/Faculty');
const Department = require('./src/models/Department');
const Course = require('./src/models/Course');
const Topic = require('./src/models/Topic');
const User = require('./src/models/User');

const seedDatabase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await University.deleteMany({});
    await Faculty.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    await Topic.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create University
    const university = await University.create({
      code: 'unizik',
      name: 'Nnamdi Azikiwe University',
      abbreviation: 'UNIZIK',
      state: 'Anambra',
    });
    console.log('✅ Created university:', university.name);

    // Create Faculty
    const faculty = await Faculty.create({
      universityId: university._id,
      code: 'sct',
      name: 'School of Computing and Technology',
    });
    console.log('✅ Created faculty:', faculty.name);

    // Create Department
    const department = await Department.create({
      universityId: university._id,
      facultyId: faculty._id,
      code: 'csc',
      name: 'Computer Science',
    });
    console.log('✅ Created department:', department.name);

    // Create Courses
    const course100 = await Course.create({
      universityId: university._id,
      departmentId: department._id,
      code: 'CSC101',
      title: 'Introduction to Programming',
      level: 100,
      creditUnits: 3,
    });

    const course200 = await Course.create({
      universityId: university._id,
      departmentId: department._id,
      code: 'CSC201',
      title: 'Data Structures',
      level: 200,
      creditUnits: 3,
    });
    console.log('✅ Created courses');

    // Create Topics
    const topic1 = await Topic.create({
      universityId: university._id,
      courseId: course100._id,
      name: 'Variables and Data Types',
    });

    const topic2 = await Topic.create({
      universityId: university._id,
      courseId: course100._id,
      name: 'Loops and Conditionals',
    });

    const topic3 = await Topic.create({
      universityId: university._id,
      courseId: course200._id,
      name: 'Arrays and Lists',
    });
    console.log('✅ Created topics');

    // Create Test Users
    const student = await User.create({
      universityId: university._id,
      email: 'student@unizik.edu.ng',
      firstName: 'John',
      lastName: 'Student',
      plan: 'free',
      role: 'student',
    });

    const admin = await User.create({
      universityId: university._id,
      email: 'admin@unizik.edu.ng',
      firstName: 'Admin',
      lastName: 'User',
      plan: 'premium',
      role: 'admin',
    });
    console.log('✅ Created users');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('Student:', student.email);
    console.log('Admin:', admin.email);
    console.log('\n🧪 Ready to test API endpoints');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
