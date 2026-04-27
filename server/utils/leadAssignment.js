const User = require('../models/User');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');
const { getEmployeeLeadStatsMap, syncEmployeeLeadStats } = require('./employeeLeadStats');


const THRESHOLD = 3;
const ACTIVE_LEAD_QUERY = { status: { $ne: 'closed' } };
const normalizeLanguage = (language) => language?.toLowerCase?.().trim?.() || '';
let leadAssignmentHealthCheckPromise = null;

const getActiveLeadCountsMap = async (employeeIds) => {
  const normalizedIds = (employeeIds || [])
    .map((employeeId) => employeeId?.toString?.())
    .filter(Boolean);

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const statsMap = await getEmployeeLeadStatsMap(normalizedIds);
  const activeCountsMap = new Map();

  normalizedIds.forEach((employeeId) => {
    const employeeStats = statsMap.get(employeeId) || {
      assignedLeadsCount: 0,
      closedLeadsCount: 0
    };

    activeCountsMap.set(employeeId, Math.max(employeeStats.assignedLeadsCount, 0));
  });

  return activeCountsMap;
};

const sortUsersForAssignment = (usersWithCounts) => (
  [...usersWithCounts].sort((left, right) => {
    const leftThresholdWindow = Math.floor(left.activeLeadsCount / THRESHOLD);
    const rightThresholdWindow = Math.floor(right.activeLeadsCount / THRESHOLD);

    if (leftThresholdWindow !== rightThresholdWindow) {
      return leftThresholdWindow - rightThresholdWindow;
    }

    const leftWindowProgress = left.activeLeadsCount % THRESHOLD;
    const rightWindowProgress = right.activeLeadsCount % THRESHOLD;

    if (leftWindowProgress !== rightWindowProgress) {
      return rightWindowProgress - leftWindowProgress;
    }

    const leftCreatedAt = new Date(left.user.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right.user.createdAt || 0).getTime();

    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    return String(left.user._id).localeCompare(String(right.user._id));
  })
);

const getAvailableSlotsBeforeNextThreshold = (activeLeadsCount) => {
  return Math.max(THRESHOLD - Math.max(activeLeadsCount, 0), 0);
};

const getConfiguredActiveEmployees = async () => (
  User.find({
    role: 'user'
  }).sort({ createdAt: 1, _id: 1 })
);

const getActiveEmployees = async () => {
  return getConfiguredActiveEmployees();
};

const getEligibleUsersWithCountsForLanguage = (users, activeCountsMap, language) => {
  const languageMatchedUsers = users.filter(
    (user) => normalizeLanguage(user.preferredLanguage) === language
  );

  return sortUsersForAssignment(
    languageMatchedUsers
      .map((user) => ({
        user,
        activeLeadsCount: activeCountsMap.get(user._id.toString()) || 0
      }))
      .filter((userEntry) => userEntry.activeLeadsCount < THRESHOLD)
  );
};

const assignBacklogForLanguage = async (language, users, activeCountsMap) => {
  const eligibleUsersWithCounts = getEligibleUsersWithCountsForLanguage(users, activeCountsMap, language);

  if (eligibleUsersWithCounts.length === 0) {
    return [];
  }

  const unassignedLeads = await Lead.find({
    assignedTo: null,
    language
  }).sort({ createdAt: 1, _id: 1 });

  if (unassignedLeads.length === 0) {
    return [];
  }

  const assignedAt = new Date();
  const assignments = [];

  for (const lead of unassignedLeads) {
    const nextEligibleUsers = sortUsersForAssignment(eligibleUsersWithCounts);
    const nextUserEntry = nextEligibleUsers[0];

    if (!nextUserEntry || nextUserEntry.activeLeadsCount >= THRESHOLD) {
      break;
    }

    assignments.push({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            assignedTo: nextUserEntry.user._id,
            assignedAt
          }
        }
      }
    });

    nextUserEntry.activeLeadsCount += 1;
    activeCountsMap.set(nextUserEntry.user._id.toString(), nextUserEntry.activeLeadsCount);
  }

  if (assignments.length > 0) {
    await Lead.bulkWrite(assignments);
  }

  return assignments.map((assignment) => assignment.updateOne.update.$set.assignedTo.toString());
};

const reassignDeletedEmployeeLeads = async (employeeIds) => {
  const normalizedEmployeeIds = (Array.isArray(employeeIds) ? employeeIds : [employeeIds])
    .map((employeeId) => employeeId?.toString?.())
    .filter((employeeId) => mongoose.Types.ObjectId.isValid(employeeId));

  if (normalizedEmployeeIds.length === 0) {
    return {
      reassignedLeads: [],
      unassignedLeadCount: 0
    };
  }

  const deletedEmployeeObjectIds = normalizedEmployeeIds.map(
    (employeeId) => new mongoose.Types.ObjectId(employeeId)
  );
  const remainingActiveEmployees = await User.find({
    role: 'user',
    status: 'active',
    _id: { $nin: deletedEmployeeObjectIds }
  }).sort({ createdAt: 1, _id: 1 });
  const affectedLeads = await Lead.find({
    assignedTo: { $in: deletedEmployeeObjectIds }
  }).sort({ createdAt: 1, _id: 1 });

  if (affectedLeads.length === 0) {
    return {
      reassignedLeads: [],
      unassignedLeadCount: 0
    };
  }

  const activeCountsMap = await getActiveLeadCountsMap(
    remainingActiveEmployees.map((employee) => employee._id)
  );
  const leadsByLanguage = new Map();
  const bulkOperations = [];
  const reassignedLeads = [];
  let unassignedLeadCount = 0;

  affectedLeads.forEach((lead) => {
    if (lead.status === 'closed') {
      return;
    }

    const normalizedLanguage = normalizeLanguage(lead.language);
    if (!normalizedLanguage) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              assignedTo: null,
              assignedAt: null
            }
          }
        }
      });
      unassignedLeadCount += 1;
      return;
    }

    if (!leadsByLanguage.has(normalizedLanguage)) {
      leadsByLanguage.set(normalizedLanguage, []);
    }

    leadsByLanguage.get(normalizedLanguage).push(lead);
  });

  for (const [language, leads] of leadsByLanguage.entries()) {
    const eligibleUsersWithCounts = getEligibleUsersWithCountsForLanguage(
      remainingActiveEmployees,
      activeCountsMap,
      language
    );

    for (const lead of leads) {
      const nextEligibleUsers = sortUsersForAssignment(eligibleUsersWithCounts);
      const nextUserEntry = nextEligibleUsers[0];

      if (!nextUserEntry || nextUserEntry.activeLeadsCount >= THRESHOLD) {
        bulkOperations.push({
          updateOne: {
            filter: { _id: lead._id },
            update: {
              $set: {
                assignedTo: null,
                assignedAt: null
              }
            }
          }
        });
        unassignedLeadCount += 1;
        continue;
      }

      const assignedAt = new Date();

      bulkOperations.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              assignedTo: nextUserEntry.user._id,
              assignedAt
            }
          }
        }
      });

      nextUserEntry.activeLeadsCount += 1;
      activeCountsMap.set(nextUserEntry.user._id.toString(), nextUserEntry.activeLeadsCount);
      reassignedLeads.push({
        leadId: lead._id,
        leadName: lead.name,
        userId: nextUserEntry.user._id,
        userFirstName: nextUserEntry.user.firstName,
        userLastName: nextUserEntry.user.lastName
      });
    }
  }

  if (bulkOperations.length > 0) {
    await Lead.bulkWrite(bulkOperations);
  }

  const employeesToSync = [...new Set(reassignedLeads.map((entry) => entry.userId.toString()))];
  if (employeesToSync.length > 0) {
    await syncEmployeeLeadStats(employeesToSync);
  }

  return {
    reassignedLeads,
    unassignedLeadCount
  };
};

const reconcileLeadAssignments = async () => {
  const activeEmployees = await getConfiguredActiveEmployees();
  const activeEmployeeIds = activeEmployees.map((employee) => employee._id);
  const orphanedLeadCount = await Lead.countDocuments({
    assignedTo: { $ne: null, $nin: activeEmployeeIds }
  });

  if (activeEmployees.length === 0) {
    await Lead.updateMany(
      { ...ACTIVE_LEAD_QUERY, assignedTo: { $ne: null } },
      { $set: { assignedTo: null, assignedAt: null } }
    );

    return {
      orphanedLeadCount,
      reassignedLeadCount: 0
    };
  }

  await Lead.updateMany(
    ACTIVE_LEAD_QUERY,
    { $set: { assignedTo: null, assignedAt: null } }
  );


  const activeCountsMap = new Map(
    activeEmployeeIds.map((employeeId) => [employeeId.toString(), 0])
  );
  const activeLeadLanguages = await Lead.distinct('language', ACTIVE_LEAD_QUERY);
  const languages = [...new Set(activeLeadLanguages.map((language) => normalizeLanguage(language)).filter(Boolean))];
  let reassignedLeadCount = 0;

  for (const language of languages) {
    const userIds = await assignBacklogForLanguage(language, activeEmployees, activeCountsMap);
    reassignedLeadCount += userIds.length;
  }

  const employeesToSync = new Set([
    ...activeEmployeeIds.map((employeeId) => employeeId.toString())
  ]);

  if (employeesToSync.size > 0) {
    await syncEmployeeLeadStats([...employeesToSync]);
  }

  return {
    orphanedLeadCount,
    reassignedLeadCount
  };
};

const ensureLeadAssignmentsHealthy = async () => {
  if (leadAssignmentHealthCheckPromise) {
    return leadAssignmentHealthCheckPromise;
  }

  leadAssignmentHealthCheckPromise = (async () => {
    const configuredActiveEmployees = await getConfiguredActiveEmployees();
    const configuredActiveEmployeeIds = configuredActiveEmployees.map((employee) => employee._id);
    const orphanedActiveLeadQuery = configuredActiveEmployeeIds.length === 0
      ? {
          ...ACTIVE_LEAD_QUERY,
          assignedTo: { $ne: null }
        }
      : {
          ...ACTIVE_LEAD_QUERY,
          assignedTo: { $ne: null, $nin: configuredActiveEmployeeIds }
        };

    const orphanedActiveLeadCount = await Lead.countDocuments(orphanedActiveLeadQuery);

    const overThresholdAssignments = await Lead.aggregate([
      {
        $match: {
          ...ACTIVE_LEAD_QUERY,
          assignedTo: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          activeLeadCount: { $sum: 1 }
        }
      },
      {
        $match: {
          activeLeadCount: { $gt: THRESHOLD }
        }
      },
      { $limit: 1 }
    ]);

    const activeAssignedLeads = await Lead.find({
      ...ACTIVE_LEAD_QUERY,
      assignedTo: { $ne: null }
    })
      .select('language assignedTo')
      .populate('assignedTo', 'preferredLanguage');

    const hasLanguageMismatch = activeAssignedLeads.some((lead) => (
      !lead.assignedTo ||
      normalizeLanguage(lead.assignedTo.preferredLanguage) !== normalizeLanguage(lead.language)
    ));

    if (orphanedActiveLeadCount > 0 || overThresholdAssignments.length > 0 || hasLanguageMismatch) {
      return reconcileLeadAssignments();
    }

    return null;
  })();

  try {
    return await leadAssignmentHealthCheckPromise;
  } finally {
    leadAssignmentHealthCheckPromise = null;
  }
};

/**
 * Assign a lead to the next active employee for the given language in threshold
 * windows of 3 leads per user before moving to the next same-language employee.
 */
const assignLeadToUser = async (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return null;
  }

  const eligibleUsers = await getActiveEmployees();

  if (eligibleUsers.length === 0) {
    return null;
  }

  const activeCountsMap = await getActiveLeadCountsMap(eligibleUsers.map((user) => user._id));
  const eligibleUsersWithCounts = getEligibleUsersWithCountsForLanguage(
    eligibleUsers,
    activeCountsMap,
    normalizedLanguage
  );

  return eligibleUsersWithCounts[0]?.user?._id || null;
};

const assignUnassignedLeadsToEmployee = async (employee) => {
  if (!employee || employee.role !== 'user') {
    return [];
  }

  const normalizedPreferredLanguage = normalizeLanguage(
    employee.preferredLanguage || employee.languages?.[0]
  );

  if (!normalizedPreferredLanguage) {
    return [];
  }

  const activeCountsMap = await getActiveLeadCountsMap([employee._id]);
  const availableSlots = getAvailableSlotsBeforeNextThreshold(
    activeCountsMap.get(employee._id.toString()) || 0
  );

  if (availableSlots <= 0) {
    return [];
  }

  const unassignedLeads = await Lead.find({
    assignedTo: null,
    language: normalizedPreferredLanguage
  })
    .sort({ createdAt: 1 })
    .limit(availableSlots);

  if (unassignedLeads.length === 0) {
    return [];
  }

  const assignedAt = new Date();
  const leadIds = unassignedLeads.map((lead) => lead._id);

  await Lead.updateMany(
    { _id: { $in: leadIds } },
    {
      $set: {
        assignedTo: employee._id,
        assignedAt
      }
    }
  );

  await syncEmployeeLeadStats(employee._id);

  return unassignedLeads;
};

module.exports = {
  assignLeadToUser,
  assignUnassignedLeadsToEmployee,
  ensureLeadAssignmentsHealthy,
  reconcileLeadAssignments,
  reassignDeletedEmployeeLeads
};
