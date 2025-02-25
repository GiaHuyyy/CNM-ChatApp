import { createBrowserRouter } from "react-router-dom";
import App from "../App";
// import RegisterPage from "../pages/RegisterPage";
// import CheckPhonePage from "../pages/LoginWithPhonePage";
// import CheckPasswordPage from "../pages/CheckPasswordPage";
// import LoginWithQR from "../pages/LoginWithQR";
import Home from "../pages/Home";
import MessagePage from "../components/MessagePage";
import AuthLayout from "../layout/AuthLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/auth",
        element: <AuthLayout />,
      },
      // {
      //   path: "/register",
      //   element: (
      //     <AuthLayout>
      //       <RegisterPage />
      //     </AuthLayout>
      //   ),
      // },
      // {
      //   path: "/qr",
      //   element: (
      //     <AuthLayout>
      //       <LoginWithQR />
      //     </AuthLayout>
      //   ),
      // },
      // {
      //   path: "/phone",
      //   element: (
      //     <AuthLayout>
      //       <CheckPhonePage />
      //     </AuthLayout>
      //   ),
      // },
      // {
      //   path: "/password",
      //   element: (
      //     <AuthLayout>
      //       <CheckPasswordPage />
      //     </AuthLayout>
      //   ),
      // },
      {
        path: "",
        element: <Home />,
        children: [
          {
            path: ":userId",
            element: <MessagePage />,
          },
        ],
      },
    ],
  },
]);

export default router;
