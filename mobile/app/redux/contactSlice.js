import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk để lấy danh sách bạn bè
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (_, { getState }) => {
    const { user } = getState();
    try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/friends`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Lỗi khi tải danh sách bạn bè';
    }
  }
);

// Async thunk để lấy danh sách lời mời kết bạn
export const fetchFriendRequests = createAsyncThunk(
  'contacts/fetchFriendRequests',
  async (_, { getState }) => {
    const { user } = getState();
    try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/friend-requests`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Lỗi khi tải danh sách lời mời kết bạn';
    }
  }
);

// Async thunk để chấp nhận lời mời kết bạn
export const acceptFriendRequest = createAsyncThunk(
  'contacts/acceptFriendRequest',
  async (requestId, { getState }) => {
    const { user } = getState();
    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/friend-requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Lỗi khi chấp nhận lời mời kết bạn';
    }
  }
);

// Async thunk để từ chối lời mời kết bạn
export const rejectFriendRequest = createAsyncThunk(
  'contacts/rejectFriendRequest',
  async (requestId, { getState }) => {
    const { user } = getState();
    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/friend-requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Lỗi khi từ chối lời mời kết bạn';
    }
  }
);

// Async thunk để tìm kiếm người dùng trong hệ thống
export const searchUsers = createAsyncThunk(
  'contacts/searchUsers',
  async (query, { getState }) => {
    const { user } = getState();
    try {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/search?q=${query}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Lỗi khi tìm kiếm người dùng';
    }
  }
);

const initialState = {
  contacts: [],
  friendRequests: [],
  loading: false,
  error: null,
  searchResults: [],
  searchLoading: false,
};

const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Xử lý fetchContacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Xử lý fetchFriendRequests
      .addCase(fetchFriendRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriendRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.friendRequests = action.payload;
      })
      .addCase(fetchFriendRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Xử lý acceptFriendRequest
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.friendRequests = state.friendRequests.filter(
          (request) => request._id !== action.payload._id
        );
        state.contacts.push(action.payload);
      })
      // Xử lý rejectFriendRequest
      .addCase(rejectFriendRequest.fulfilled, (state, action) => {
        state.friendRequests = state.friendRequests.filter(
          (request) => request._id !== action.payload._id
        );
      })
      // Xử lý searchUsers
      .addCase(searchUsers.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearSearchResults, clearError } = contactSlice.actions;
export default contactSlice.reducer; 