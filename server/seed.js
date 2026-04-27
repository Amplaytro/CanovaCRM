const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await Admin.findOne({ role: 'admin' });
    if (!adminExists) {
      await Admin.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@canovacrm.com',
        password: 'admin123',
        role: 'admin',
        status: 'active',
        preferredLanguage: 'english'
      });
      console.log('Default admin created: admin@canovacrm.com / admin123');
    } else {
      console.log('Admin already exists');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
