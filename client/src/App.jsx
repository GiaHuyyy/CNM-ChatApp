import "./App.css";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import GlobalProvider from "./context/GlobalProvider";

function App() {
  return (
    <GlobalProvider>
      <Toaster richColors position="top-right" />
      <main>
        <Outlet />
      </main>
    </GlobalProvider>
  );
}

export default App;
