import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import MessagePage from "../components/MessagePage";
import AuthLayout from "../layout/AuthLayout";
import BookPhonePage from "../components/BookPhonePage";
import ListFriend from "../components/ListFriend";
import ListInvite from "../components/ListInvite";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/auth",
        element: <AuthLayout />,
      },
      {
        path: "/chat",
        element: <Home />,
        children: [
          {
            path: "/chat/:userId",
            element: <MessagePage />,
          },
        ],
      },
      {
        path: "/bookphone",
        element: <Home />,
        children: [
          {
            path: "/bookphone",
            element: <BookPhonePage />,
          },
          {
            path: "/bookphone/listfriends",
            element: <ListFriend />,
          },
          {
            path: "/bookphone/listinvites",
            element: <ListInvite />,
          },
        ],
      },
    ],
  },
]);

export default router;
