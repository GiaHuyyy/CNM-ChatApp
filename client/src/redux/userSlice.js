import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  _id: "",
  phone: "",
  name: "",
  profilePic: "",
  token: "",
  onlineUser: [],
  // socketConnection: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state._id = action.payload._id;
      state.phone = action.payload.phone;
      state.name = action.payload.name;
      state.profilePic = action.payload.profilePic;
      state.gender = action.payload.gender;
      state.dateOfBirth = action.payload.dateOfBirth;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state._id = "";
      state.phone = "";
      state.name = "";
      state.profilePic = "";
      state.token = "";
      state.gender = "";
      state.dateOfBirth = "";
      // state.onlineUser = [];
      // state.socketConnection = null;
    },
    setOnlineUser: (state, action) => {
      state.onlineUser = action.payload;
    },
    // setSocketConnection: (state, action) => {
    //   state.socketConnection = action.payload;
    // },
  },
});

// Action creators are generated for each case reducer function
export const { setUser, setToken, logout, setOnlineUser } = userSlice.actions;

export default userSlice.reducer;
