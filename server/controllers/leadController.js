const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { assignLeadToUser, ensureLeadAssignmentsHealthy, assignUnassignedLeadsToEmployee } = require('../utils/leadAssignment');
const { syncEmployeeLeadStats } = require('../utils/employeeLeadStats');
const { closeOverdueScheduledLeads } = require('../utils/scheduledLeadClosure');
const fs = require('fs');
const csv = require('csv-parser');

const formatLeadType = (type) => type.charAt(0).toUpperCase() + type.slice(1);

const datesEqual = (left, right) => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return new Date(left).getTime() === new Date(right).getTime();
};

const isBeforeToday = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return selectedDay < todayStart;
};

// GET /api/leads
const getLeads = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();
    await ensureLeadAssignmentsHealthy();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 11;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const mineOnly = req.query.mine === 'true';
    const scheduledOnly = req.query.scheduled === 'true';

    const query = {};

    if (mineOnly) {
      query.assignedTo = req.user._id;
    }

    if (scheduledOnly) {
      query.status = { $ne: 'closed' };
      query.$or = [
        { status: 'scheduled' },
        { scheduledDate: { $ne: null } }
      ];
    }

    if (search) {
      const searchQuery = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { language: { $regex: search, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchQuery }];
        delete query.$or;
      } else {
        query.$or = searchQuery;
      }
    }

    const total = await Lead.countDocuments(query);
    const sort = scheduledOnly ? { scheduledDate: 1, createdAt: -1 } : { createdAt: -1 };
    const leads = await Lead.find(query)
      .populate('assignedTo', 'firstName lastName email employeeId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      leads,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/leads
const createLead = async (req, res) => {
  try {
    const { name, email, phone, source, date, location, language } = req.body;

    // Assign lead to a user based on language
    const assignedUserId = await assignLeadToUser(language);

    const lead = await Lead.create({
      name,
      email,
      phone: phone || '',
      source,
      date: new Date(date),
      location,
      language: language.toLowerCase(),
      assignedTo: assignedUserId,
      assignedAt: assignedUserId ? new Date() : null,
      status: 'ongoing',
      type: 'warm'
    });

    if (assignedUserId) {
      await syncEmployeeLeadStats(assignedUserId);
    }

    await Activity.create({
      type: 'lead_created',
      message: `New lead "${name}" was created`,
      relatedLead: lead._id
    });

    if (assignedUserId) {
      const user = await User.findById(assignedUserId);
      await Activity.create({
        type: 'lead_assigned',
        message: `Lead "${name}" assigned to ${user.firstName} ${user.lastName}`,
        relatedUser: assignedUserId,
        relatedLead: lead._id
      });
    }

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email employeeId');

    res.status(201).json(populatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/leads/upload-csv
const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const filePath = req.file.path;

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Normalize column names (case-insensitive)
          const normalized = {};
          Object.keys(data).forEach(key => {
            normalized[key.trim().toLowerCase()] = data[key].trim();
          });
          results.push(normalized);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Create leads sequentially so each assignment sees the updated workload.
    const assignedUserIds = new Set();
    const assignedUsersCache = new Map();
    const validLeads = [];

    for (const row of results) {
      const { name, email, phone, source, date, location, language } = row;

      if (!name || !email || !source || !date || !location || !language) {
        continue;
      }

      const assignedUserId = await assignLeadToUser(language);

      const lead = await Lead.create({
        name,
        email,
        phone: phone || '',
        source,
        date: new Date(date),
        location,
        language: language.toLowerCase(),
        assignedTo: assignedUserId,
        assignedAt: assignedUserId ? new Date() : null,
        status: 'ongoing',
        type: 'warm'
      });

      if (assignedUserId) {
        assignedUserIds.add(assignedUserId.toString());
      }

      await Activity.create({
        type: 'lead_created',
        message: `New lead "${name}" was created`,
        relatedLead: lead._id
      });

      if (assignedUserId) {
        let user = assignedUsersCache.get(assignedUserId.toString());
        if (!user) {
          user = await User.findById(assignedUserId);
          assignedUsersCache.set(assignedUserId.toString(), user);
        }

        await Activity.create({
          type: 'lead_assigned',
          message: `Lead "${name}" assigned to ${user.firstName} ${user.lastName}`,
          relatedUser: assignedUserId,
          relatedLead: lead._id
        });
      }

      validLeads.push(lead);
    }

    if (assignedUserIds.size > 0) {
      await syncEmployeeLeadStats([...assignedUserIds]);
    }

    await Activity.create({
      type: 'csv_uploaded',
      message: `${validLeads.length} leads imported via CSV upload`
    });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: `${validLeads.length} leads imported successfully`,
      count: validLeads.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/leads/:id
const updateLead = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (req.user.role !== 'admin' && String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this lead' });
    }

    if (lead.status === 'closed') {
      return res.status(400).json({ message: 'This lead is closed' });
    }

    const { type, status, scheduledDate } = req.body;
    const previousStatus = lead.status;
    const previousType = lead.type;
    const previousScheduledDate = lead.scheduledDate;
    const nextScheduledDate = scheduledDate !== undefined
      ? (scheduledDate ? new Date(scheduledDate) : null)
      : lead.scheduledDate;
    const nextStatus = status !== undefined ? status : lead.status;

    if (
      scheduledDate !== undefined &&
      scheduledDate &&
      (!nextScheduledDate || Number.isNaN(nextScheduledDate.getTime()))
    ) {
      return res.status(400).json({ message: 'Invalid scheduled date' });
    }

    if (scheduledDate !== undefined && scheduledDate && isBeforeToday(nextScheduledDate)) {
      return res.status(400).json({ message: 'Scheduled date cannot be before today' });
    }

    if (status !== undefined && !['ongoing', 'closed', 'scheduled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid lead status' });
    }

    if (
      nextStatus === 'closed' &&
      nextScheduledDate &&
      !Number.isNaN(nextScheduledDate.getTime()) &&
      nextScheduledDate > new Date()
    ) {
      return res.status(400).json({ message: 'Scheduled leads cannot be closed' });
    }

    if (type !== undefined) {
      if (!['hot', 'warm', 'cold'].includes(type)) {
        return res.status(400).json({ message: 'Invalid lead type' });
      }

      lead.type = type;
    }
    if (status !== undefined) {
      lead.status = status;

      await Activity.create({
        type: 'lead_status_updated',
        message: `Lead "${lead.name}" status changed to ${status}`,
        relatedLead: lead._id,
        relatedUser: lead.assignedTo
      });
    }

    if (scheduledDate !== undefined) {
      lead.scheduledDate = scheduledDate ? nextScheduledDate : null;
    }

    await lead.save();

    if (type !== undefined && lead.type !== previousType) {
      await Activity.create({
        type: 'lead_type_updated',
        message: `Lead "${lead.name}" type changed from ${formatLeadType(previousType || 'warm')} to ${formatLeadType(lead.type)}`,
        relatedLead: lead._id,
        relatedUser: lead.assignedTo
      });
    }

    if (scheduledDate !== undefined && !datesEqual(previousScheduledDate, lead.scheduledDate)) {
      await Activity.create({
        type: 'lead_scheduled',
        message: lead.scheduledDate
          ? `Lead "${lead.name}" was scheduled`
          : `Lead "${lead.name}" schedule was cleared`,
        relatedLead: lead._id,
        relatedUser: lead.assignedTo,
        scheduledDate: lead.scheduledDate
      });
    }

    if (lead.assignedTo && status !== undefined && lead.status !== previousStatus) {
      await syncEmployeeLeadStats(lead.assignedTo);

      if (lead.status === 'closed') {
        const user = await User.findById(lead.assignedTo);
        if (user) {
          const newLeads = await assignUnassignedLeadsToEmployee(user);
          if (newLeads.length > 0) {
            await Activity.insertMany(
              newLeads.map((newLead) => ({
                type: 'lead_assigned',
                message: `Lead "${newLead.name}" assigned to ${user.firstName} ${user.lastName}`,
                relatedUser: user._id,
                relatedLead: newLead._id
              }))
            );
          }
        }
      }
    }

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email employeeId');

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLeads, createLead, uploadCSV, updateLead };
