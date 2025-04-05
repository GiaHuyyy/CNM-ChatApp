import "./App.css";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import GlobalProvider from "./context/GlobalProvider";
import CallProvider from "./context/CallProvider";
import IncomingCallDialog from "./components/calls/IncomingCallDialog";
import CallInterface from "./components/calls/CallInterface";
import CallingIndicator from "./components/calls/CallingIndicator";
import CallDebugger from "./components/calls/CallDebugger";

function App() {
  return (
    <GlobalProvider>
      <CallProvider>
        <Toaster richColors position="top-right" />
        <main>
          <Outlet />
        </main>

        {/* Call Components */}
        <IncomingCallDialog />
        <CallInterface />
        <CallingIndicator />
        <CallDebugger />
      </CallProvider>
    </GlobalProvider>
  );
}

export default App;
