const Attendance = require('../models/Attendance');
const Activity = require('../models/Activity');
const { assignUnassignedLeadsToEmployee } = require('../utils/leadAssignment');

function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function ensureTodayAttendance(userId) {
  const todayStart = getStartOfDay();

  let attendance = await Attendance.findOne({
    user: userId,
    attendanceDate: todayStart
  });

  if (attendance) {
    return { attendance, created: false };
  }

  attendance = await Attendance.create({
    user: userId,
    attendanceDate: todayStart,
    checkInAt: new Date()
  });

  await Activity.create({
    type: 'attendance_checked_in',
    message: 'Checked in for the day',
    relatedUser: userId
  });

  return { attendance, created: true };
}

async function getTodayAttendance(userId) {
  const todayStart = getStartOfDay();

  return Attendance.findOne({
    user: userId,
    attendanceDate: todayStart
  });
}

async function recordLeadAssignmentActivity(user, leads) {
  if (!user || leads.length === 0) {
    return;
  }

  await Activity.insertMany(
    leads.map((lead) => ({
      type: 'lead_assigned',
      message: `Lead "${lead.name}" assigned to ${user.firstName} ${user.lastName}`,
      relatedUser: user._id,
      relatedLead: lead._id
    }))
  );
}

async function buildAttendanceSummary(userId) {
  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();

  const currentDay = await Attendance.findOne({
    user: userId,
    attendanceDate: todayStart
  }).lean();

  const previousCheckoutRecord = await Attendance.findOne({
    user: userId,
    attendanceDate: { $lt: todayStart },
    checkOutAt: { $ne: null }
  })
    .sort({ attendanceDate: -1 })
    .lean();

  const breakLogs = (currentDay?.breaks || [])
    .filter((entry) => entry.startAt && entry.endAt)
    .map((entry) => ({
      startAt: entry.startAt,
      endAt: entry.endAt,
      date: currentDay.attendanceDate
    }))
    .sort((left, right) => new Date(right.startAt) - new Date(left.startAt))
    .slice(0, 4);

  const todayBreaks = currentDay?.breaks || [];
  const activeBreak = todayBreaks.find((entry) => !entry.endAt) || null;
  const hasCompletedBreakToday = todayBreaks.some((entry) => entry.startAt && entry.endAt);
  const hasCheckedOutToday = Boolean(currentDay?.checkOutAt);
  const isCheckedIn = Boolean(currentDay?.checkInAt && !hasCheckedOutToday);

  return {
    currentDay,
    previousCheckoutAt: previousCheckoutRecord?.checkOutAt || null,
    breakLogs,
    isCheckedIn,
    hasCheckedOutToday,
    isOnBreak: Boolean(activeBreak && isCheckedIn),
    hasCompletedBreakToday,
    activeBreakStartedAt: isCheckedIn ? activeBreak?.startAt || null : null
  };
}

const getSummary = async (req, res) => {
  try {
    const summary = await buildAttendanceSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkIn = async (req, res) => {
  try {
    const existingAttendance = await getTodayAttendance(req.user._id);

    if (existingAttendance?.checkOutAt) {
      return res.status(400).json({
        message: 'Attendance for today is already complete. It will reset after midnight.'
      });
    }

    if (!existingAttendance) {
      await ensureTodayAttendance(req.user._id);
    }

    const autoAssignedLeads = await assignUnassignedLeadsToEmployee(req.user);
    await recordLeadAssignmentActivity(req.user, autoAssignedLeads);

    const summary = await buildAttendanceSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkOut = async (req, res) => {
  try {
    const attendance = await getTodayAttendance(req.user._id);

    if (!attendance?.checkInAt) {
      return res.status(400).json({
        message: 'Check in first before checking out.'
      });
    }

    if (attendance.checkOutAt) {
      return res.status(400).json({
        message: 'Attendance for today is already complete. It will reset after midnight.'
      });
    }

    const activeBreakIndex = attendance.breaks.findIndex((entry) => !entry.endAt);
    if (activeBreakIndex >= 0) {
      attendance.breaks[activeBreakIndex].endAt = new Date();
    }

    attendance.checkOutAt = new Date();
    await attendance.save();

    await Activity.create({
      type: 'attendance_checked_out',
      message: 'Checked out for the day',
      relatedUser: req.user._id
    });

    const summary = await buildAttendanceSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleBreak = async (req, res) => {
  try {
    const attendance = await getTodayAttendance(req.user._id);

    if (!attendance?.checkInAt) {
      return res.status(400).json({
        message: 'Check in before starting or ending a break.'
      });
    }

    if (attendance.checkOutAt) {
      return res.status(400).json({
        message: 'Breaks cannot be changed after checkout.'
      });
    }

    const activeBreakIndex = attendance.breaks.findIndex((entry) => !entry.endAt);

    let endedBreak = false;

    if (activeBreakIndex >= 0) {
      attendance.breaks[activeBreakIndex].endAt = new Date();
      endedBreak = true;
      await Activity.create({
        type: 'break_ended',
        message: 'Break ended',
        relatedUser: req.user._id
      });
    } else {
      if (attendance.breaks.length > 0) {
        return res.status(400).json({
          message: 'Only one break is allowed per day.'
        });
      }

      attendance.breaks.push({ startAt: new Date() });
      await Activity.create({
        type: 'break_started',
        message: 'Break started',
        relatedUser: req.user._id
      });
    }

    await attendance.save();

    if (endedBreak) {
      const autoAssignedLeads = await assignUnassignedLeadsToEmployee(req.user);
      await recordLeadAssignmentActivity(req.user, autoAssignedLeads);
    }

    const summary = await buildAttendanceSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  buildAttendanceSummary,
  ensureTodayAttendance,
  getTodayAttendance,
  getSummary,
  checkIn,
  checkOut,
  toggleBreak
};
