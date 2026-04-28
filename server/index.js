const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const Activity = require('./models/Activity');
const { Admin, Employee } = require('./utils/accountModel');
const { reconcileLeadAssignments } = require('./utils/leadAssignment');
const { closeOverdueScheduledLeads } = require('./utils/scheduledLeadClosure');

// Load env vars
dotenv.config();

const app = express();
const envOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(url => url.trim()) : [];

const allowedOrigins = [
  ...envOrigins,
  'https://canova-crm-epft.vercel.app',
  'https://canova-crm-three.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
].filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const migrateAccountCollections = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return;
    }

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = collections.map((collection) => collection.name);
    const usersCollectionName = collectionNames.includes('usersa')
      ? 'usersa'
      : (collectionNames.includes('users') ? 'users' : null);
    const usersCollection = usersCollectionName ? db.collection(usersCollectionName) : null;
    const employeesCollection = db.collection('employees');
    const adminCollection = db.collection('admin');

    const usersRecords = usersCollection ? await usersCollection.find({}).toArray() : [];
    const employeeRecords = collectionNames.includes('employees')
      ? await employeesCollection.find({}).toArray()
      : [];
    const adminRecords = collectionNames.includes('admin')
      ? await adminCollection.find({}).toArray()
      : [];

    const employeeMap = new Map();
    const adminMap = new Map();

    for (const record of [...usersRecords, ...employeeRecords]) {
      const email = record.email?.toLowerCase();
      if (!email) continue;

      if (record.role === 'admin') {
        if (!adminMap.has(email)) {
          adminMap.set(email, { ...record, role: 'admin' });
        }
      } else {
        if (!employeeMap.has(email)) {
          employeeMap.set(email, { ...record, role: 'user' });
        }
      }
    }

    for (const record of adminRecords) {
      const email = record.email?.toLowerCase();
      if (!email || adminMap.has(email)) continue;
      adminMap.set(email, { ...record, role: 'admin' });
    }

    await employeesCollection.deleteMany({ role: 'admin' });

    for (const record of employeeMap.values()) {
      const { _id, ...payload } = record;
      await employeesCollection.updateOne(
        { email: payload.email.toLowerCase() },
        { $set: { ...payload, role: 'user' } },
        { upsert: true }
      );
    }

    for (const record of adminMap.values()) {
      const { _id, ...payload } = record;
      await adminCollection.updateOne(
        { email: payload.email.toLowerCase() },
        { $set: { ...payload, role: 'admin' } },
        { upsert: true }
      );
    }

    if (usersCollection) {
      await usersCollection.drop();
    }

    const orphanAdmins = await employeesCollection.find({ role: 'admin' }).toArray();
    if (orphanAdmins.length > 0) {
      await employeesCollection.deleteMany({ role: 'admin' });
    }

    await employeesCollection.updateMany(
      {
        role: 'user',
        $or: [
          { preferredLanguage: { $exists: false } },
          { preferredLanguage: null },
          { preferredLanguage: '' }
        ],
        'languages.0': { $exists: true }
      },
      [
        {
          $set: {
            preferredLanguage: { $arrayElemAt: ['$languages', 0] }
          }
        }
      ]
    );

    await employeesCollection.updateMany(
      { role: 'user' },
      { $unset: { languages: '' } }
    );

    await employeesCollection.updateMany(
      {
        role: 'user',
        location: { $exists: false }
      },
      { $set: { location: '' } }
    );

    await adminCollection.updateMany(
      {
        location: { $exists: false }
      },
      { $set: { location: '' } }
    );
  } catch (error) {
    console.log('Collection migration check:', error.message);
  }
};

// Seed default admin on startup
const seedDefaultAdmin = async () => {
  try {
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
      console.log('Default admin seeded: admin@canovacrm.com / admin123');
    }
  } catch (error) {
    console.log('Admin seed check:', error.message);
  }
};

const reconcileLeadsOnStartup = async () => {
  try {
    const summary = await reconcileLeadAssignments();
    console.log(
      `Lead reconciliation complete: ${summary.orphanedLeadCount} orphaned, ${summary.reassignedLeadCount} reassigned`
    );
  } catch (error) {
    console.log('Lead reconciliation check:', error.message);
  }
};

const closeOverdueLeadsOnStartup = async () => {
  try {
    const summary = await closeOverdueScheduledLeads();
    if (summary.closedCount > 0) {
      console.log(`Closed ${summary.closedCount} overdue scheduled leads`);
    }
  } catch (error) {
    console.log('Overdue scheduled lead closure:', error.message);
  }
};

const startOverdueLeadClosureInterval = () => {
  const interval = setInterval(async () => {
    try {
      await closeOverdueScheduledLeads();
    } catch (error) {
      console.log('Overdue scheduled lead closure:', error.message);
    }
  }, 60 * 1000);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
};

const repairLeadActivityTimeline = async () => {
  try {
    const leadActivities = await Activity.find({
      type: { $in: ['lead_created', 'lead_assigned'] },
      relatedLead: { $ne: null }
    })
      .sort({ relatedLead: 1, createdAt: 1, _id: 1 })
      .select('_id type createdAt relatedLead')
      .lean();

    const activitiesByLead = new Map();
    for (const activity of leadActivities) {
      const leadId = activity.relatedLead?.toString?.();
      if (!leadId) continue;

      if (!activitiesByLead.has(leadId)) {
        activitiesByLead.set(leadId, []);
      }

      activitiesByLead.get(leadId).push(activity);
    }

    let repairedCount = 0;

    for (const activities of activitiesByLead.values()) {
      const createdActivity = activities.find((activity) => activity.type === 'lead_created');
      const assignedActivities = activities.filter((activity) => activity.type === 'lead_assigned');

      if (!createdActivity || assignedActivities.length === 0) {
        continue;
      }

      let nextAssignedTime = new Date(createdActivity.createdAt).getTime() + 1;

      for (const assignedActivity of assignedActivities) {
        const assignedTime = new Date(assignedActivity.createdAt).getTime();

        if (assignedTime < nextAssignedTime) {
          const repairedDate = new Date(nextAssignedTime);
          await Activity.collection.updateOne(
            { _id: assignedActivity._id },
            { $set: { createdAt: repairedDate, updatedAt: repairedDate } }
          );
          repairedCount += 1;
          nextAssignedTime += 1;
        } else {
          nextAssignedTime = assignedTime + 1;
        }
      }
    }

    if (repairedCount > 0) {
      console.log(`Lead activity timeline repaired for ${repairedCount} activity records`);
    }
  } catch (error) {
    console.log('Lead activity timeline repair:', error.message);
  }
};

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();
  await migrateAccountCollections();
  await repairLeadActivityTimeline();
  await seedDefaultAdmin();
  await closeOverdueLeadsOnStartup();
  await reconcileLeadsOnStartup();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  startOverdueLeadClosureInterval();
};

startServer().catch((error) => {
  console.error(`Startup error: ${error.message}`);
  process.exit(1);
});
