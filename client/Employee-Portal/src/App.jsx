import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useOutletContext
} from 'react-router-dom';
import api from './api/axios';
import {
  BackIcon,
  CalendarSmallIcon,
  FilterIcon,
  HomeNavIcon,
  LeadActionIcon,
  LeadClockIcon,
  LeadEditIcon,
  LeadsNavIcon,
  LocationPinIcon,
  ProfileNavIcon,
  ScheduleNavIcon,
  SearchIcon
} from './components/PortalIcons';
import { useAuth } from './context/AuthContext';
import './App.css';

const PHONE_WIDTH = 393;
const DEFAULT_PHONE_HEIGHT = 852;
const LEADS_PHONE_HEIGHT = 874;
const SCHEDULE_TIME_HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const SCHEDULE_TIME_MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function getScale(width, height) {
  return Math.min(
    (window.innerWidth - 48) / width,
    (window.innerHeight - 48) / height,
    1
  );
}

function formatLeadDate(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });
}

function formatShortDate(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString('en-GB').replace(/\//g, '/');
}

function formatTime(value) {
  if (!value) {
    return '--:--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatActivityTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatScheduleDateTime(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatScheduleCardDate(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function getInitials(name) {
  const words = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '--';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function getLeadPhotoUrl(lead) {
  return lead.photoUrl || lead.avatarUrl || lead.profilePhoto || lead.imageUrl || '';
}

function formatLeadStatus(status) {
  return status === 'closed' ? 'Closed' : 'Ongoing';
}

function hasScheduledDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getScheduleDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getScheduleTimeInput(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function getTimeInputParts(value) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    hours: match[1],
    minutes: match[2]
  };
}

function getTodayDateInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseScheduleInput(dateValue, timeValue) {
  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.trim().match(/^(\d{2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 0 || month > 11 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const date = new Date(year, month, day, hour, minute);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function isBeforeToday(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return selectedDay < todayStart;
}

function DropdownCaret({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 12 7" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.333 6.722L0 1.344L1.333 0L6 4.705L10.667 0L12 1.344L6.667 6.722C6.49 6.9 6.25 7 6 7C5.75 7 5.51 6.9 5.333 6.722Z"
      />
    </svg>
  );
}

function formatRecentActivity(activity) {
  const leadName = activity.relatedLead?.name;
  const scheduledDate = formatScheduleDateTime(activity.scheduledDate || activity.relatedLead?.scheduledDate);
  let message = null;

  switch (activity.type) {
    case 'employee_logged_in':
      message = 'You logged in';
      break;
    case 'employee_logged_out':
      message = 'You logged out';
      break;
    case 'attendance_checked_in':
      message = 'You checked in';
      break;
    case 'attendance_checked_out':
      message = 'You checked out';
      break;
    case 'break_started':
      message = 'You started a break';
      break;
    case 'break_ended':
      message = 'You ended your break';
      break;
    case 'lead_assigned':
      message = leadName ? `Deal "${leadName}" was assigned to you` : 'A deal was assigned to you';
      break;
    case 'lead_status_updated':
      if ((activity.message || '').toLowerCase().includes('closed')) {
        message = leadName ? `You closed deal "${leadName}"` : 'You closed a deal';
      }
      break;
    case 'lead_type_updated':
      message = activity.message || (leadName ? `Deal "${leadName}" type was updated` : 'A deal type was updated');
      break;
    case 'lead_scheduled':
      if (scheduledDate !== '--') {
        message = leadName
          ? `Lead "${leadName}" is scheduled for ${scheduledDate}`
          : `A lead is scheduled for ${scheduledDate}`;
      } else {
        message = leadName ? `Lead "${leadName}" schedule was cleared` : 'A lead schedule was cleared';
      }
      break;
    case 'profile_updated':
      message = 'Your profile was updated';
      break;
    default:
      return null;
  }

  if (!message) {
    return null;
  }

  const timestamp = formatActivityTime(activity.createdAt);
  return timestamp ? `${message} - ${timestamp}` : message;
}

function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <PortalLoading />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <LoginScreen />}
      />
      <Route element={<ProtectedPortal />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/leads" element={<LeadsScreen />} />
        <Route path="/schedule" element={<ScheduleScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
    </Routes>
  );
}

function ProtectedPortal() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <PortalDataLayout />;
}

function PortalDataLayout() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPortalData() {
      try {
        const [profileResponse, leadsResponse] = await Promise.all([
          api.get('/settings/profile'),
          api.get('/leads?mine=true&limit=50')
        ]);

        if (cancelled) {
          return;
        }

        setProfile(profileResponse.data);
        setLeads(leadsResponse.data.leads || []);
      } catch {
        if (!cancelled) {
          setLeads([]);
        }
      }
    }

    loadPortalData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshLeads() {
    const { data } = await api.get('/leads?mine=true&limit=50');
    setLeads(data.leads || []);
    return data.leads || [];
  }

  const contextValue = useMemo(
    () => ({
      user: profile || user,
      logout,
      leads,
      refreshLeads,
      setProfile,
      setLeads
    }),
    [leads, logout, profile, user]
  );

  return <Outlet context={contextValue} />;
}

function usePortalContext() {
  return useOutletContext();
}

function PortalLoading() {
  return (
    <div className="portal-shell">
      <div className="portal-loading">Loading employee portal...</div>
    </div>
  );
}

function PhoneStage({ height, className = '', children }) {
  const [scale, setScale] = useState(() => getScale(PHONE_WIDTH, height));

  useEffect(() => {
    const handleResize = () => {
      setScale(getScale(PHONE_WIDTH, height));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  return (
    <div className="portal-shell">
      <div
        className="phone-stage"
        style={{
          width: PHONE_WIDTH * scale,
          height: height * scale
        }}
      >
        <div
          className={`phone-canvas ${className}`.trim()}
          style={{
            width: PHONE_WIDTH,
            height,
            transform: `scale(${scale})`
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function BrandWordmark({ className = '' }) {
  return (
    <div className={`brand-wordmark ${className}`.trim()}>
      <span>Canova</span>
      <span className="brand-wordmark__crm">CRM</span>
    </div>
  );
}

function BackHeader({ title }) {
  return (
    <>
      <div className="portal-top-band" />
      <BrandWordmark className="portal-brand" />
      <BackIcon className="portal-back-icon" />
      <div className="portal-header-title">{title}</div>
    </>
  );
}

function BottomNav({ active }) {
  return (
    <div className="bottom-nav">
      <div className="bottom-nav__bar" />
      <div className="bottom-nav__divider" />
      <NavItem to="/home" label="Home" active={active === 'home'} className="bottom-nav__home">
        <HomeNavIcon />
      </NavItem>
      <NavItem to="/leads" label="Leads" active={active === 'leads'} className="bottom-nav__leads">
        <LeadsNavIcon />
      </NavItem>
      <NavItem
        to="/schedule"
        label="Schedule"
        active={active === 'schedule'}
        className="bottom-nav__schedule"
      >
        <ScheduleNavIcon />
      </NavItem>
      <NavItem
        to="/profile"
        label="Profile"
        active={active === 'profile'}
        className="bottom-nav__profile"
      >
        <ProfileNavIcon />
      </NavItem>
      <div className="bottom-nav__home-indicator" />
    </div>
  );
}

function NavItem({ to, label, active, className, children }) {
  return (
    <Link to={to} className={`bottom-nav__item ${className} ${active ? 'is-active' : ''}`.trim()}>
      <div className="bottom-nav__icon">{children}</div>
      <div className="bottom-nav__label">{label}</div>
    </Link>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      const authData = await login(email, password);

      if (authData.role === 'admin') {
        const bridgeUrl = new URL(
          `${window.location.protocol}//${window.location.hostname}:5173/auth-bridge`
        );

        bridgeUrl.hash = new URLSearchParams({
          token: authData.token,
          user: JSON.stringify({
            _id: authData._id,
            firstName: authData.firstName,
            lastName: authData.lastName,
            email: authData.email,
            role: authData.role,
            status: authData.status,
            languages: authData.languages
          })
        }).toString();

        window.location.href = bridgeUrl.toString();
        return;
      }

      startTransition(() => navigate('/home', { replace: true }));
    } catch (error) {
      window.alert(error.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PhoneStage height={DEFAULT_PHONE_HEIGHT} className="screen-login">
      <BrandWordmark className="login-brand" />
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          className="login-form__input"
          type="email"
          value={email}
          placeholder="email"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="login-form__input login-form__input--password"
          type="password"
          value={password}
          placeholder="password"
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button className="login-form__button" type="submit" disabled={submitting}>
          {submitting ? '...' : 'Submit'}
        </button>
      </form>
    </PhoneStage>
  );
}

function HomeScreen() {
  const { user } = usePortalContext();
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendancePending, setAttendancePending] = useState(false);
  const [breakPending, setBreakPending] = useState(false);
  const employeeName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      try {
        const [summaryResponse, activityResponse] = await Promise.all([
          api.get('/attendance/summary'),
          api.get('/dashboard/recent-activity?mine=true&limit=20')
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryResponse.data);
        setActivities(activityResponse.data || []);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setActivities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHome();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAttendanceToggle() {
    const hasCheckedOutToday = summary?.hasCheckedOutToday;

    if (hasCheckedOutToday) {
      window.alert('Attendance for today is already complete. It will reset after midnight.');
      return;
    }

    const endpoint = summary?.isCheckedIn ? '/attendance/check-out' : '/attendance/check-in';

    try {
      setAttendancePending(true);
      const [summaryResponse, activityResponse] = await Promise.all([
        api.post(endpoint),
        api.get('/dashboard/recent-activity?mine=true&limit=20')
      ]);
      setSummary(summaryResponse.data);
      setActivities(activityResponse.data || []);
    } catch (error) {
      window.alert(error.response?.data?.message || 'Unable to update attendance.');
    } finally {
      setAttendancePending(false);
    }
  }

  async function handleBreakToggle() {
    try {
      setBreakPending(true);
      const [summaryResponse, activityResponse] = await Promise.all([
        api.post('/attendance/break-toggle'),
        api.get('/dashboard/recent-activity?mine=true&limit=20')
      ]);
      setSummary(summaryResponse.data);
      setActivities(activityResponse.data || []);
    } catch (error) {
      window.alert(error.response?.data?.message || 'Unable to update break state.');
    } finally {
      setBreakPending(false);
    }
  }

  const latestBreak = summary?.breakLogs?.[0] || null;
  const hasCompletedBreakToday = Boolean(summary?.hasCompletedBreakToday);
  const breakActionDisabled =
    loading ||
    breakPending ||
    !summary?.isCheckedIn ||
    (!summary?.isOnBreak && hasCompletedBreakToday);
  const breakHistory = (summary?.breakLogs || [])
    .filter((entry) => entry.startAt && entry.endAt)
    .sort((left, right) => new Date(right.startAt) - new Date(left.startAt))
    .slice(0, 4)
    .map((entry) => ({
      id: `${entry.startAt}-${entry.endAt}`,
      breakLabel: 'Break',
      breakTime: formatTime(entry.startAt),
      endLabel: 'Ended',
      endTime: formatTime(entry.endAt),
      date: formatShortDate(entry.date)
    }));
  const activityText = activities.map(formatRecentActivity).filter(Boolean).slice(0, 7);

  return (
    <PhoneStage height={DEFAULT_PHONE_HEIGHT} className="screen-home">
      <div className="portal-top-band" />
      <BrandWordmark className="portal-brand" />
      <div className="home-greeting">Good Morning</div>
      <div className="home-employee-name">{employeeName}</div>

      <div className="section-title section-title--timings">Timings</div>

      <div className="home-check-card">
        <div className="home-check-card__label">Check In</div>
        <div className="home-check-card__value">
          {loading ? '...' : formatTime(summary?.currentDay?.checkInAt)}
        </div>
        <div className="home-check-card__label home-check-card__label--right">Check Out</div>
        <div className="home-check-card__value home-check-card__value--right">
          {loading ? '...' : formatTime(summary?.currentDay?.checkOutAt)}
        </div>
        <button
          className={`home-card-rail ${summary?.isCheckedIn ? 'home-card-rail--checked-in' : ''} ${summary?.hasCheckedOutToday ? 'home-card-rail--checked-out' : ''}`.trim()}
          type="button"
          onClick={handleAttendanceToggle}
          disabled={loading || attendancePending || summary?.hasCheckedOutToday}
          aria-label={
            summary?.hasCheckedOutToday
              ? 'Attendance completed for today'
              : summary?.isCheckedIn
                ? 'Check out'
                : 'Check in'
          }
        >
          <span className="home-card-rail__outer" />
          <span className="home-card-rail__inner" />
        </button>
      </div>

      <div className="home-break-card">
        <div className="home-break-card__header">Break</div>
        <div className="home-break-card__subheader">{summary?.isOnBreak ? 'Started' : 'Ended'}</div>
        <div className="home-break-card__time">
          {loading
            ? '...'
            : summary?.isOnBreak
              ? formatTime(summary?.activeBreakStartedAt)
              : formatTime(latestBreak?.startAt)}
        </div>
        <div className="home-break-card__time home-break-card__time--right">
          {loading
            ? '...'
            : summary?.isOnBreak
              ? formatTime(null)
              : formatTime(latestBreak?.endAt)}
        </div>
        <button
          className={`home-card-rail home-card-rail--break ${summary?.isOnBreak ? 'home-card-rail--break-active' : ''} ${hasCompletedBreakToday ? 'home-card-rail--break-complete' : ''}`.trim()}
          type="button"
          onClick={handleBreakToggle}
          disabled={breakActionDisabled}
          aria-label={
            summary?.isOnBreak
              ? 'End break'
              : hasCompletedBreakToday
                ? 'Break already used for today'
                : 'Start break'
          }
        >
          <span className="home-card-rail__outer" />
          <span className="home-card-rail__inner" />
        </button>
        <div className="home-break-history">
          {breakHistory.map((item) => (
            <div key={item.id} className="home-break-history__row">
              <div className="home-break-history__cell">
                <div className="home-break-history__label">{item.breakLabel}</div>
                <div className="home-break-history__value">{item.breakTime}</div>
              </div>
              <div className="home-break-history__cell home-break-history__cell--ended">
                <div className="home-break-history__label">{item.endLabel}</div>
                <div className="home-break-history__value">{item.endTime}</div>
              </div>
              <div className="home-break-history__cell home-break-history__cell--date">
                <div className="home-break-history__label">Date</div>
                <div className="home-break-history__value">{item.date}</div>
              </div>
            </div>
          ))}
          {!loading && breakHistory.length === 0 ? (
            <div className="home-break-history__empty">No break logs yet.</div>
          ) : null}
        </div>
      </div>

      <div className="home-activity-title">Recent Activity</div>
      <div className="home-activity-card">
        <div className="home-activity-card__text">
          {activityText.map((line) => (
            <div key={line}>{`\u2022  ${line}`}</div>
          ))}
          {!loading && activityText.length === 0 ? <div>No activity yet.</div> : null}
        </div>
      </div>

      <BottomNav active="home" />
    </PhoneStage>
  );
}

function LeadsScreen() {
  const { leads, setLeads } = usePortalContext();
  const [search, setSearch] = useState('');
  const [activeLeadAction, setActiveLeadAction] = useState(null);
  const [savingLeadId, setSavingLeadId] = useState(null);
  const deferredSearch = useDeferredValue(search);
  const cards = useMemo(() => {
    const source = leads.filter((lead) => lead.assignedTo);

    if (!deferredSearch.trim()) {
      return source;
    }

    return source.filter((lead) =>
      [lead.name, lead.email, lead.source, lead.location].some((value) =>
        (value || '').toLowerCase().includes(deferredSearch.toLowerCase())
      )
    );
  }, [deferredSearch, leads]);
  const visibleCards = cards.slice(0, 3);

  function handleOpenLeadAction(leadId, action) {
    setActiveLeadAction((current) =>
      current?.leadId === leadId && current?.action === action ? null : { leadId, action }
    );
  }

  async function handleLeadPatch(leadId, patch) {
    try {
      setSavingLeadId(leadId);
      const { data } = await api.put(`/leads/${leadId}`, patch);
      setLeads((current) => current.map((lead) => (lead._id === leadId ? data : lead)));
      setActiveLeadAction(null);
    } catch (error) {
      console.error(error);
      window.alert(error.response?.data?.message || 'Unable to update lead.');
    } finally {
      setSavingLeadId(null);
    }
  }

  return (
    <PhoneStage height={LEADS_PHONE_HEIGHT} className="screen-leads">
      <BackHeader title="Leads" />

      <div className="search-bar search-bar--full">
        <SearchIcon className="search-bar__icon" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          className="search-bar__input"
        />
      </div>

      <div className="lead-card-stack">
        {visibleCards.map((lead, index) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            index={index}
            activeAction={activeLeadAction?.leadId === lead._id ? activeLeadAction.action : null}
            isSaving={savingLeadId === lead._id}
            onOpenAction={handleOpenLeadAction}
            onPatch={handleLeadPatch}
          />
        ))}
        {cards.length === 0 ? <div className="portal-empty-state">No assigned leads found.</div> : null}
      </div>

      <BottomNav active="leads" />
    </PhoneStage>
  );
}

function ScheduleScreen() {
  const { leads } = usePortalContext();
  const [search, setSearch] = useState('');
  const [scheduledLeads, setScheduledLeads] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [filter, setFilter] = useState('all');
  const [draftFilter, setDraftFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function loadScheduledLeads() {
      try {
        setLoadingSchedules(true);
        const { data } = await api.get('/leads?mine=true&scheduled=true&limit=100');

        if (!cancelled) {
          setScheduledLeads((data.leads || []).filter((lead) => lead.status !== 'closed'));
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setScheduledLeads(leads.filter((lead) => lead.scheduledDate && lead.status !== 'closed'));
        }
      } finally {
        if (!cancelled) {
          setLoadingSchedules(false);
        }
      }
    }

    loadScheduledLeads();

    return () => {
      cancelled = true;
    };
  }, [leads]);

  const cards = useMemo(() => {
    const source = scheduledLeads
      .filter((lead) => lead.scheduledDate && lead.status !== 'closed')
      .sort((left, right) => new Date(left.scheduledDate) - new Date(right.scheduledDate))
      .filter((lead) => {
        if (filter === 'today') {
          return formatShortDate(lead.scheduledDate) === formatShortDate(new Date());
        }

        return true;
      });

    if (!deferredSearch.trim()) {
      return source;
    }

    return source.filter((lead) =>
      [lead.name, lead.source, lead.location].some((value) =>
        (value || '').toLowerCase().includes(deferredSearch.toLowerCase())
      )
    );
  }, [deferredSearch, filter, scheduledLeads]);

  return (
    <PhoneStage height={DEFAULT_PHONE_HEIGHT} className="screen-schedule">
      <BackHeader title="Schedule" />

      <div className="search-bar search-bar--schedule">
        <SearchIcon className="search-bar__icon" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          className="search-bar__input"
        />
      </div>

      <button
        className="schedule-filter-trigger"
        type="button"
        onClick={() => {
          setDraftFilter(filter);
          setShowFilterOptions(false);
          setShowFilter((open) => !open);
        }}
      >
        <FilterIcon className="schedule-filter-trigger__icon" />
      </button>

      <div className="schedule-card-stack">
        {cards.map((card, index) => (
          <ScheduleCard key={card._id} card={card} tone={index === 0 ? 'primary' : 'neutral'} />
        ))}
        {!loadingSchedules && cards.length === 0 ? <div className="portal-empty-state">No scheduled leads found.</div> : null}
      </div>

      {showFilter ? (
        <div className="schedule-filter-popup">
          <div className="schedule-filter-popup__title">Filter</div>
          <button
            type="button"
            className={`schedule-filter-popup__toggle ${draftFilter === 'today' ? 'is-selected' : ''}`}
            onClick={() => setShowFilterOptions((open) => !open)}
          >
            <span className="schedule-filter-popup__value">{draftFilter === 'today' ? 'Today' : 'All'}</span>
            <DropdownCaret className={`schedule-filter-popup__caret ${showFilterOptions ? 'is-open' : ''}`} />
          </button>
          {showFilterOptions ? (
            <div
              className={`schedule-filter-popup__option ${draftFilter === 'today' ? 'schedule-filter-popup__option--today-selected' : ''}`}
              role="group"
              aria-label="Schedule filter options"
            >
              <button
                type="button"
                className={`schedule-filter-popup__choice schedule-filter-popup__choice--top ${draftFilter === 'today' ? 'is-selected' : ''}`}
                onClick={() => {
                  setDraftFilter('today');
                  setShowFilterOptions(false);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className={`schedule-filter-popup__choice schedule-filter-popup__choice--bottom ${draftFilter === 'all' ? 'is-selected' : ''}`}
                onClick={() => {
                  setDraftFilter('all');
                  setShowFilterOptions(false);
                }}
              >
                All
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="schedule-filter-popup__save"
            onClick={() => {
              setFilter(draftFilter);
              setShowFilterOptions(false);
              setShowFilter(false);
            }}
          >
            Save
          </button>
        </div>
      ) : null}

      <BottomNav active="schedule" />
    </PhoneStage>
  );
}

function ProfileScreen() {
  const { user, setProfile, logout } = usePortalContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    }));
  }, [user.email, user.firstName, user.lastName]);

  async function handleSave() {
    if (form.password && form.password !== form.confirmPassword) {
      window.alert('Password and confirm password must match.');
      return;
    }

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email
      };

      if (form.password) {
        payload.password = form.password;
      }

      const { data } = await api.put('/settings/profile', payload);
      setProfile(data);
      setForm((current) => ({
        ...current,
        password: '',
        confirmPassword: ''
      }));
      window.alert('Profile updated.');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Profile update failed.');
    }
  }

  async function handleLogout() {
    await logout();
    startTransition(() => navigate('/login', { replace: true }));
  }

  return (
    <PhoneStage height={DEFAULT_PHONE_HEIGHT} className="screen-profile">
      <BackHeader title="Profile" />

      <div className="profile-form">
        <ProfileField
          label="First name"
          value={form.firstName}
          onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
          type="text"
        />
        <ProfileField
          label="Last name"
          value={form.lastName}
          onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
          type="text"
        />
        <ProfileField
          label="Email"
          value={form.email}
          onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          type="email"
        />
        <ProfileField
          label="Password"
          value={form.password}
          onChange={(value) => setForm((current) => ({ ...current, password: value }))}
          type="password"
        />
        <ProfileField
          label="Confirm Password"
          value={form.confirmPassword}
          onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
          type="password"
        />
      </div>

      <button className="profile-action profile-action--save" type="button" onClick={handleSave}>
        Save
      </button>
      <button className="profile-action profile-action--logout" type="button" onClick={handleLogout}>
        Logout
      </button>

      <BottomNav active="profile" />
    </PhoneStage>
  );
}

function LeadCard({ lead, index, activeAction, isSaving, onOpenAction, onPatch }) {
  const initialScheduleTimeParts = getTimeInputParts(getScheduleTimeInput(lead.scheduledDate));
  const [scheduleDate, setScheduleDate] = useState(() => getScheduleDateInput(lead.scheduledDate));
  const [scheduleHour, setScheduleHour] = useState(() => initialScheduleTimeParts?.hours || '');
  const [scheduleMinute, setScheduleMinute] = useState(() => initialScheduleTimeParts?.minutes || '');
  const [selectedStatus, setSelectedStatus] = useState(lead.status === 'closed' ? 'closed' : 'ongoing');
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const statusValue = lead.status === 'closed' ? 'closed' : 'ongoing';
  const leadType = ['hot', 'warm', 'cold'].includes(lead.type) ? lead.type : 'warm';
  const tone =
    statusValue === 'closed'
      ? 'closed'
      : leadType;
  const emailText = lead.email?.startsWith('@') ? lead.email : `@${lead.email || ''}`;
  const showStatusWarning = hasScheduledDate(lead.scheduledDate);
  const isClosed = statusValue === 'closed';
  const closedMessage = 'This lead is closed';
  const scheduleTime = scheduleHour && scheduleMinute ? `${scheduleHour}:${scheduleMinute}` : '';
  const scheduleTimeLabel = `${scheduleHour || '--'}:${scheduleMinute || '--'}`;

  useEffect(() => {
    if (activeAction === 'schedule') {
      const nextScheduleTimeParts = getTimeInputParts(getScheduleTimeInput(lead.scheduledDate));

      setScheduleDate(getScheduleDateInput(lead.scheduledDate));
      setScheduleHour(nextScheduleTimeParts?.hours || '');
      setScheduleMinute(nextScheduleTimeParts?.minutes || '');
      setShowTimeOptions(false);
    }

    if (activeAction === 'status') {
      setSelectedStatus(statusValue);
      setShowTimeOptions(false);
      setShowStatusOptions(false);
    }
  }, [activeAction, lead.scheduledDate, statusValue]);

  function saveSchedule() {
    if (isClosed) {
      window.alert(closedMessage);
      return;
    }

    const scheduledDate = parseScheduleInput(scheduleDate, scheduleTime);

    if (!scheduledDate) {
      window.alert('Select a valid date and time.');
      return;
    }

    if (isBeforeToday(scheduledDate)) {
      window.alert('Select today or a later date.');
      return;
    }

    onPatch(lead._id, { scheduledDate });
  }

  function saveStatus() {
    if (isClosed) {
      window.alert(closedMessage);
      return;
    }

    if (showStatusWarning) {
      onOpenAction(lead._id, 'status');
      return;
    }

    onPatch(lead._id, { status: selectedStatus });
  }

  function openAction(action) {
    if (isClosed) {
      window.alert(closedMessage);
      return;
    }

    onOpenAction(lead._id, action);
  }

  function handleScheduleHourSelect(hour) {
    setScheduleHour(hour);

    if (scheduleMinute) {
      setShowTimeOptions(false);
    }
  }

  function handleScheduleMinuteSelect(minute) {
    setScheduleMinute(minute);

    if (scheduleHour) {
      setShowTimeOptions(false);
    }
  }

  return (
    <div className={`lead-card lead-card--${tone} ${activeAction ? 'lead-card--active-action' : ''}`}>
      <div className="lead-card__accent" />
      <div className="lead-card__name">{lead.name}</div>
      <div className="lead-card__email">{emailText}</div>
      <div className="lead-card__date-row">
        <CalendarSmallIcon className="lead-card__calendar-icon" />
        <span>{formatLeadDate(lead.assignedAt || lead.createdAt)}</span>
      </div>
      <div className="lead-card__status-orb">{formatLeadStatus(statusValue)}</div>
      <div className="lead-card__actions">
        <button
          className="lead-card__action-button"
          type="button"
          aria-label={`Edit ${lead.name}`}
          aria-expanded={activeAction === 'type'}
          aria-disabled={isClosed}
          onClick={() => openAction('type')}
        >
          <LeadEditIcon className="lead-card__action-icon lead-card__action-icon--edit" />
        </button>
        <button
          className="lead-card__action-button"
          type="button"
          aria-label={`Schedule ${lead.name}`}
          aria-expanded={activeAction === 'schedule'}
          aria-disabled={isClosed}
          onClick={() => openAction('schedule')}
        >
          <LeadClockIcon className="lead-card__action-icon lead-card__action-icon--clock" />
        </button>
        <button
          className="lead-card__action-button"
          type="button"
          aria-label={`Expand ${lead.name}`}
          aria-expanded={activeAction === 'status'}
          aria-disabled={isClosed}
          onClick={() => openAction('status')}
        >
          <LeadActionIcon className="lead-card__action-icon lead-card__action-icon--expand" />
        </button>
      </div>

      {activeAction === 'type' ? (
        <div className="lead-popover lead-type-popover">
          <div className="lead-popover__title lead-type-popover__title">Type</div>
          {['hot', 'warm', 'cold'].map((type) => (
            <button
              key={type}
              className={`lead-type-popover__option lead-type-popover__option--${type} ${leadType === type ? 'is-selected' : ''}`}
              type="button"
              onClick={() => onPatch(lead._id, { type })}
              disabled={isSaving || isClosed}
            >
              {type[0].toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      ) : null}

      {activeAction === 'schedule' ? (
        <div className="lead-popover lead-schedule-popover">
          <label className="lead-popover__title lead-schedule-popover__date-label" htmlFor={`lead-date-${lead._id}`}>
            Date
          </label>
          <input
            id={`lead-date-${lead._id}`}
            type="date"
            className="lead-schedule-popover__input lead-schedule-popover__input--date"
            value={scheduleDate}
            min={getTodayDateInput()}
            onChange={(event) => setScheduleDate(event.target.value)}
          />
          <label className="lead-popover__title lead-schedule-popover__time-label" htmlFor={`lead-time-${lead._id}`}>
            Time
          </label>
          <button
            id={`lead-time-${lead._id}`}
            type="button"
            className="lead-schedule-popover__input lead-schedule-popover__time-field"
            aria-expanded={showTimeOptions}
            aria-haspopup="listbox"
            onClick={() => setShowTimeOptions((open) => !open)}
          >
            <span>{scheduleTimeLabel}</span>
            <DropdownCaret className={`lead-schedule-popover__time-caret ${showTimeOptions ? 'is-open' : ''}`} />
          </button>
          {showTimeOptions ? (
            <div className="lead-schedule-popover__time-menu" aria-label="Time options">
              <div className="lead-schedule-popover__time-column" role="listbox" aria-label="Hours">
                {SCHEDULE_TIME_HOURS.map((hour) => (
                  <button
                    key={hour}
                    className={`lead-schedule-popover__time-option ${scheduleHour === hour ? 'is-selected' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={scheduleHour === hour}
                    onClick={() => handleScheduleHourSelect(hour)}
                  >
                    {hour}
                  </button>
                ))}
              </div>
              <div className="lead-schedule-popover__time-column" role="listbox" aria-label="Minutes">
                {SCHEDULE_TIME_MINUTES.map((minute) => (
                  <button
                    key={minute}
                    className={`lead-schedule-popover__time-option ${scheduleMinute === minute ? 'is-selected' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={scheduleMinute === minute}
                    onClick={() => handleScheduleMinuteSelect(minute)}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button className="lead-popover__save lead-schedule-popover__save" type="button" onClick={saveSchedule} disabled={isSaving}>
            Save
          </button>
        </div>
      ) : null}

      {activeAction === 'status' ? (
        <div className={`lead-popover lead-status-popover ${showStatusWarning ? 'lead-status-popover--warning' : ''}`}>
          <div className="lead-popover__title lead-status-popover__title">Lead Status</div>
          <button
            className="lead-status-popover__field"
            type="button"
            onClick={() => {
              if (!showStatusWarning) {
                setShowStatusOptions((open) => !open);
              }
            }}
          >
            <span className="lead-status-popover__value">{formatLeadStatus(selectedStatus)}</span>
            <DropdownCaret className={`lead-status-popover__caret ${showStatusOptions ? 'is-open' : ''}`} />
          </button>
          {showStatusWarning ? (
            <>
              <span className="lead-status-popover__info" aria-hidden="true">i</span>
              <div className="lead-status-popover__tooltip">Lead can not be closed if scheduled</div>
            </>
          ) : showStatusOptions ? (
            <div className="lead-status-popover__menu">
              {['ongoing', 'closed'].map((status) => (
                <button
                  key={status}
                  className={`lead-status-popover__menu-option ${selectedStatus === status ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(status);
                    setShowStatusOptions(false);
                  }}
                >
                  {formatLeadStatus(status)}
                </button>
              ))}
            </div>
          ) : null}
          <button className="lead-popover__save lead-status-popover__save" type="button" onClick={saveStatus}>
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleCard({ card, tone }) {
  const photoUrl = getLeadPhotoUrl(card);
  const initials = getInitials(card.name);
  const location = card.location || '--';

  return (
      <div className={`schedule-card ${tone === 'primary' ? 'schedule-card--primary' : ''}`}>
      <div className="schedule-card__source">{card.source || '--'}</div>
      <div className="schedule-card__date-label">Date</div>
      <div className="schedule-card__date">{formatScheduleCardDate(card.scheduledDate)}</div>
      <LocationPinIcon className="schedule-card__location" />
      <div className="schedule-card__action" title={location}>{location}</div>
      <div className="schedule-card__name">{card.name}</div>
      <div className="schedule-card__avatar">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="schedule-card__avatar-image" />
        ) : (
          <span className="schedule-card__avatar-initials">{initials}</span>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, value, onChange, type }) {
  return (
    <div className="profile-field">
      <div className="profile-field__label">{label}</div>
      <input className="profile-field__input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="profile-field__error">Error message</div>
    </div>
  );
}

export default App;
