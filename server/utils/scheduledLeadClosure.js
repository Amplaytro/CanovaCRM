const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { syncEmployeeLeadStats } = require('./employeeLeadStats');

let pendingClosure = null;

const closeOverdueScheduledLeads = async (now = new Date()) => {
  if (pendingClosure) {
    return pendingClosure;
  }

  pendingClosure = (async () => {
    const overdueLeads = await Lead.find({
      status: { $ne: 'closed' },
      scheduledDate: { $ne: null, $lte: now }
    })
      .select('_id name assignedTo scheduledDate')
      .lean();

    if (overdueLeads.length === 0) {
      return { closedCount: 0, employeeIds: [] };
    }

    const leadIds = overdueLeads.map((lead) => lead._id);
    const result = await Lead.updateMany(
      {
        _id: { $in: leadIds },
        status: { $ne: 'closed' }
      },
      {
        $set: {
          status: 'closed',
          updatedAt: now
        }
      }
    );
    const closedCount = result.modifiedCount || result.nModified || 0;

    if (closedCount === 0) {
      return { closedCount: 0, employeeIds: [] };
    }

    const employeeIds = [...new Set(
      overdueLeads
        .map((lead) => lead.assignedTo?.toString?.())
        .filter(Boolean)
    )];

    await Activity.insertMany(
      overdueLeads.map((lead) => ({
        type: 'lead_status_updated',
        message: `Lead "${lead.name}" automatically closed after scheduled time passed`,
        relatedLead: lead._id,
        relatedUser: lead.assignedTo,
        scheduledDate: lead.scheduledDate,
        createdAt: now,
        updatedAt: now
      })),
      { ordered: false }
    );

    await syncEmployeeLeadStats(employeeIds);

    return { closedCount, employeeIds };
  })();

  try {
    return await pendingClosure;
  } finally {
    pendingClosure = null;
  }
};

module.exports = { closeOverdueScheduledLeads };
