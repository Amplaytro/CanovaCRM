import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchActiveSalespeople,
  fetchDashboardSummary,
  setSalespeopleSearch,
} from '../../store/dashboardSlice';
import dashboardActive from '../../assets/dashboard-active.svg';
import dashboardAssigned from '../../assets/dashboard-assigned.svg';
import dashboardChevron from '../../assets/dashboard-chevron.svg';
import dashboardConversion from '../../assets/dashboard-conversion.svg';
import dashboardSearch from '../../assets/dashboard-search.svg';
import dashboardUnassigned from '../../assets/dashboard-unassigned.svg';
import './Dashboard.css';

const DASHBOARD_ASSETS = {
  search: dashboardSearch,
  unassigned: dashboardUnassigned,
  assigned: dashboardAssigned,
  active: dashboardActive,
  conversion: dashboardConversion,
  chevron: dashboardChevron,
};

const KPI_CARDS = [
  { key: 'unassignedLeads', label: 'Unassigned Leads', icon: DASHBOARD_ASSETS.unassigned, formatter: (value) => value ?? 0 },
  { key: 'assignedThisWeek', label: 'Assigned This Week', icon: DASHBOARD_ASSETS.assigned, formatter: (value) => value ?? 0 },
  { key: 'activeSalesPeople', label: 'Active Salespeople', icon: DASHBOARD_ASSETS.active, formatter: (value) => value ?? 0 },
  { key: 'conversionRate', label: 'Conversion Rate', icon: DASHBOARD_ASSETS.conversion, formatter: (value) => `${value ?? 0}%` },
];

const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins || 1} minute${diffMins === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const formatActivityScheduleDate = (dateStr) => {
  if (!dateStr) {
    return '';
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getActivityDisplayMessage = (activity) => {
  const fullName = `${activity.relatedUser?.firstName ?? ''} ${activity.relatedUser?.lastName ?? ''}`.trim();
  const leadName = activity.relatedLead?.name;
  const scheduledDate = formatActivityScheduleDate(activity.scheduledDate || activity.relatedLead?.scheduledDate);

  if (!fullName) {
    if (activity.type === 'lead_scheduled' && scheduledDate) {
      return leadName
        ? `Lead "${leadName}" was scheduled for ${scheduledDate}`
        : `Lead was scheduled for ${scheduledDate}`;
    }

    return activity.message;
  }

  if (activity.type === 'attendance_checked_in') {
    return `${fullName} checked in for the day`;
  }

  if (activity.type === 'attendance_checked_out') {
    return `${fullName} checked out for the day`;
  }

  if (activity.type === 'lead_scheduled') {
    if (scheduledDate) {
      return leadName
        ? `${fullName} scheduled lead "${leadName}" for ${scheduledDate}`
        : `${fullName} scheduled a lead for ${scheduledDate}`;
    }

    return leadName
      ? `${fullName} cleared the schedule for lead "${leadName}"`
      : `${fullName} cleared a lead schedule`;
  }

  return activity.message;
};

const md5 = (value) => {
  const rotateLeft = (x, c) => (x << c) | (x >>> (32 - c));
  const addUnsigned = (x, y) => {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);

    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
      return result ^ 0x40000000 ^ x8 ^ y8;
    }

    return result ^ x8 ^ y8;
  };
  const f = (x, y, z) => (x & y) | (~x & z);
  const g = (x, y, z) => (x & z) | (y & ~z);
  const h = (x, y, z) => x ^ y ^ z;
  const i = (x, y, z) => y ^ (x | ~z);
  const ff = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac)), s), b);
  const gg = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac)), s), b);
  const hh = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac)), s), b);
  const ii = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac)), s), b);
  const convertToWordArray = (str) => {
    const messageLength = str.length;
    const numberOfWordsTemp1 = messageLength + 8;
    const numberOfWordsTemp2 = (numberOfWordsTemp1 - (numberOfWordsTemp1 % 64)) / 64;
    const numberOfWords = (numberOfWordsTemp2 + 1) * 16;
    const wordArray = new Array(numberOfWords - 1);
    let bytePosition = 0;
    let byteCount = 0;

    while (byteCount < messageLength) {
      const wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePosition = (byteCount % 4) * 8;
      wordArray[wordCount] = wordArray[wordCount] | (str.charCodeAt(byteCount) << bytePosition);
      byteCount += 1;
    }

    const wordCount = (byteCount - (byteCount % 4)) / 4;
    bytePosition = (byteCount % 4) * 8;
    wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
    wordArray[numberOfWords - 2] = messageLength << 3;
    wordArray[numberOfWords - 1] = messageLength >>> 29;
    return wordArray;
  };
  const wordToHex = (lValue) => {
    let wordToHexValue = '';

    for (let lCount = 0; lCount <= 3; lCount += 1) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const wordToHexValueTemp = `0${lByte.toString(16)}`;
      wordToHexValue += wordToHexValueTemp.slice(-2);
    }

    return wordToHexValue;
  };
  const utf8Encode = (str) => unescape(encodeURIComponent(str));

  const x = convertToWordArray(utf8Encode(value));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = ff(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = gg(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = hh(b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

    a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
};

const getInitials = (person) => {
  const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

const getPhotoUrl = (person) => {
  if (person.photoUrl) {
    return person.photoUrl;
  }

  const email = person.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  return `https://www.gravatar.com/avatar/${md5(email)}?d=404&s=80`;
};

const EmployeeAvatar = ({ person }) => {
  const [showImage, setShowImage] = useState(Boolean(getPhotoUrl(person)));
  const photoUrl = getPhotoUrl(person);

  useEffect(() => {
    setShowImage(Boolean(photoUrl));
  }, [photoUrl]);

  return (
    <div className={`dashboard-avatar ${showImage ? 'has-photo' : ''}`}>
      {showImage && photoUrl ? (
        <img src={photoUrl} alt="" onError={() => setShowImage(false)} />
      ) : (
        <span>{getInitials(person) || 'NA'}</span>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label: axisLabel }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const { date, label: pointLabel } = payload[0].payload;
  const assigned = payload.find((entry) => entry.dataKey === 'assigned')?.value ?? 0;
  const closed = payload.find((entry) => entry.dataKey === 'closed')?.value ?? 0;
  const total = assigned + closed;

  return (
    <div className="dashboard-chart-tooltip">
      <p>{pointLabel || date || axisLabel}</p>
      <p>Assigned Leads: {assigned}</p>
      <p>Closed Leads: {closed}</p>
      <p>Total Leads: {total}</p>
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const [searchDraft, setSearchDraft] = useState('');
  const {
    stats,
    graphData,
    activities,
    salespeople,
    searchTerm,
    summaryLoading,
    salespeopleLoading,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      dispatch(setSalespeopleSearch(searchDraft));
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [dispatch, searchDraft]);

  useEffect(() => {
    dispatch(fetchActiveSalespeople(searchTerm.trim()));
  }, [dispatch, searchTerm]);

  return (
    <div className="dashboard-screen" id="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-search-shell">
          <img className="dashboard-search-icon" src={DASHBOARD_ASSETS.search} alt="" />
          <input
            className="dashboard-search-input"
            type="text"
            placeholder="Search here..."
            id="dashboard-search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
      </header>

      <div className="dashboard-breadcrumb">
        <span className="dashboard-breadcrumb-home">Home</span>
        <img className="dashboard-breadcrumb-chevron" src={DASHBOARD_ASSETS.chevron} alt="" />
        <span className="dashboard-breadcrumb-current">Dashboard</span>
      </div>

      <section className="dashboard-kpi-grid">
        {KPI_CARDS.map((card) => (
          <article key={card.key} className="dashboard-kpi-card">
            <img className="dashboard-kpi-icon" src={card.icon} alt="" />
            <div className="dashboard-kpi-copy">
              <p className="dashboard-kpi-label">{card.label}</p>
              <p className="dashboard-kpi-value">{card.formatter(stats[card.key])}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-analytics-row">
        <article className="dashboard-chart-card">
          <h2 className="dashboard-card-heading">Sale Analytics</h2>
          <div className="dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#D9D9D9" strokeDasharray="5 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#B1B1B1', fontFamily: 'REM, sans-serif', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'dataMax']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#B1B1B1', fontFamily: 'REM, sans-serif', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(217, 217, 217, 0.18)' }} />
                <Bar dataKey="assigned" name="Assigned" fill="#D9D9D9" radius={[20, 20, 0, 0]} maxBarSize={20} />
                <Bar dataKey="closed" name="Closed" fill="#D9D9D9" radius={[20, 20, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-activity-card">
          <h2 className="dashboard-card-heading dashboard-card-heading--activity">Recent Activity Feed</h2>
          <div className="dashboard-activity-list" id="activity-list">
            {summaryLoading ? (
              <p className="dashboard-loading-note">Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="dashboard-panel-empty">No recent activity</p>
            ) : (
                <ul>
                {activities.map((activity) => (
                  <li key={activity._id}>
                    <span>{getActivityDisplayMessage(activity)}</span>
                    <span className="dashboard-activity-time">- {formatRelativeTime(activity.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-team-card" id="salespeople-list">
        <div className="dashboard-team-header">
          <span>Name</span>
          <span>Employee ID</span>
          <span>Assigned Leads</span>
          <span>Closed Leads</span>
          <span>Status</span>
        </div>

        <div className="dashboard-team-body">
          {salespeopleLoading ? (
            <div className="dashboard-team-empty">Loading active salespeople...</div>
          ) : salespeople.length === 0 ? (
            <div className="dashboard-team-empty">No active salespeople</div>
          ) : (
            salespeople.map((person) => (
              <div className="dashboard-team-row" key={person._id}>
                <div className="dashboard-team-name">
                  <EmployeeAvatar person={person} />
                  <div className="dashboard-team-identity">
                    <p>{person.firstName} {person.lastName}</p>
                    <span>{person.email}</span>
                  </div>
                </div>
                <div className="dashboard-team-id">#{person.employeeId}</div>
                <div className="dashboard-team-stat">{person.assignedLeadsCount}</div>
                <div className="dashboard-team-stat">{person.closedLeadsCount}</div>
                <div className="dashboard-team-status">
                  <span className={`dashboard-status-pill ${person.status === 'inactive' ? 'is-inactive' : ''}`}>
                    <span className="dashboard-status-dot" />
                    {person.status === 'inactive' ? 'Inactive' : 'Active'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
