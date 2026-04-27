import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchDashboardSummary = createAsyncThunk(
  'dashboard/fetchDashboardSummary',
  async () => {
    const [statsRes, graphRes, activityRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/sales-graph'),
      api.get('/dashboard/recent-activity'),
    ]);

    return {
      stats: statsRes.data,
      graphData: graphRes.data,
      activities: activityRes.data,
    };
  }
);

export const fetchActiveSalespeople = createAsyncThunk(
  'dashboard/fetchActiveSalespeople',
  async (searchTerm = '') => {
    const response = await api.get('/dashboard/active-salespeople', {
      params: searchTerm ? { search: searchTerm } : {},
    });

    return response.data;
  }
);

const initialState = {
  stats: {
    unassignedLeads: 0,
    assignedThisWeek: 0,
    activeSalesPeople: 0,
    conversionRate: 0,
  },
  graphData: [],
  activities: [],
  salespeople: [],
  searchTerm: '',
  summaryLoading: false,
  salespeopleLoading: false,
  error: '',
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setSalespeopleSearch(state, action) {
      state.searchTerm = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = '';
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.stats = action.payload.stats;
        state.graphData = action.payload.graphData;
        state.activities = action.payload.activities;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error = action.error.message || 'Unable to load dashboard summary.';
      })
      .addCase(fetchActiveSalespeople.pending, (state) => {
        state.salespeopleLoading = true;
        state.error = '';
      })
      .addCase(fetchActiveSalespeople.fulfilled, (state, action) => {
        state.salespeopleLoading = false;
        state.salespeople = action.payload;
      })
      .addCase(fetchActiveSalespeople.rejected, (state, action) => {
        state.salespeopleLoading = false;
        state.error = action.error.message || 'Unable to load active salespeople.';
      });
  },
});

export const { setSalespeopleSearch } = dashboardSlice.actions;

export default dashboardSlice.reducer;
