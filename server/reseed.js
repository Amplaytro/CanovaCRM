const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const reseedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Delete existing admin
    await Admin.deleteOne({ email: 'admin@canovacrm.com' });
    console.log('Deleted existing admin');
    
    // Create fresh admin
    await Admin.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@canovacrm.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      preferredLanguage: 'english'
    });
    console.log('Default admin re-created: admin@canovacrm.com / admin123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

reseedAdmin();
