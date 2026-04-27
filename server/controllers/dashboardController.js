const User = require('../models/User');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { mergeEmployeeLeadStats } = require('../utils/employeeLeadStats');
const { closeOverdueScheduledLeads } = require('../utils/scheduledLeadClosure');
const { filterAttendanceActiveEmployees, getAttendanceActiveUserIdSet } = require('../utils/attendanceStatus');

const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date) => (
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit'
  })
);

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();

    const unassignedLeads = await Lead.countDocuments({ assignedTo: null });

    // Assigned in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const assignedThisWeek = await Lead.countDocuments({
      assignedTo: { $ne: null },
      assignedAt: { $gte: sevenDaysAgo }
    });

    const activeSalesPeople = await User.countDocuments({ role: 'user', status: 'active' });

    // Conversion Rate
    const totalAssigned = await Lead.countDocuments({ assignedTo: { $ne: null } });
    const totalClosed = await Lead.countDocuments({ status: 'closed' });
    const conversionRate = totalAssigned > 0 ? ((totalClosed / totalAssigned) * 100).toFixed(1) : 0;

    res.json({
      unassignedLeads,
      assignedThisWeek,
      activeSalesPeople,
      conversionRate: parseFloat(conversionRate)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/sales-graph
const getSalesGraph = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();

    const days = 14; // Past 2 weeks
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const latestLead = await Lead.findOne({})
      .select('date')
      .sort({ date: -1, createdAt: -1 })
      .lean();
    const latestLeadDate = latestLead?.date ? new Date(latestLead.date) : new Date();
    const endDate = getStartOfDay(
      Number.isNaN(latestLeadDate.getTime()) ? new Date() : latestLeadDate
    );
    const startDate = addDays(endDate, -(days - 1));
    const nextEndDate = addDays(endDate, 1);
    const dailyData = new Map();

    Array.from({ length: days }, (_, index) => {
      const date = addDays(startDate, index);
      dailyData.set(formatDateKey(date), {
        day: dayNames[date.getDay()],
        label: formatDateLabel(date),
        date: formatDateKey(date),
        assigned: 0,
        closed: 0,
        total: 0,
        conversionRate: 0
      });
      return null;
    });

    const leads = await Lead.find({
      date: { $gte: startDate, $lt: nextEndDate }
    })
      .select('date assignedTo status')
      .lean();

    leads.forEach((lead) => {
      const leadDate = new Date(lead.date);
      if (Number.isNaN(leadDate.getTime())) {
        return;
      }

      const key = formatDateKey(leadDate);
      const entry = dailyData.get(key);

      if (!entry) {
        return;
      }

      if (lead.status === 'closed') {
        entry.closed += 1;
      } else if (lead.assignedTo) {
        entry.assigned += 1;
      }

      entry.total = entry.assigned + entry.closed;
      entry.conversionRate = entry.total > 0
        ? Number(((entry.closed / entry.total) * 100).toFixed(1))
        : 0;
    });

    const data = [...dailyData.values()];

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/recent-activity
const getRecentActivity = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();

    const mineOnly = req.query.mine === 'true';
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : 7;
    const query = mineOnly ? { relatedUser: req.user._id } : {};

    const activities = await Activity.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate('relatedUser', 'firstName lastName')
      .populate('relatedLead', 'name scheduledDate');

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/active-salespeople
const getActiveSalespeople = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();

    const search = req.query.search || '';
    const query = { role: 'user', status: 'active' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const salespeople = await User.find(query)
      .select('firstName lastName email employeeId assignedLeadsCount closedLeadsCount status photoUrl')
      .sort({ createdAt: -1 });

    const salespeopleWithStats = await mergeEmployeeLeadStats(salespeople);
    salespeopleWithStats.sort((left, right) => right.assignedLeadsCount - left.assignedLeadsCount);

    res.json(salespeopleWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats, getSalesGraph, getRecentActivity, getActiveSalespeople };
