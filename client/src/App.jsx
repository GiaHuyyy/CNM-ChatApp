import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import CallDebugger from "./components/calls/CallDebugger";
import CallingIndicator from "./components/calls/CallingIndicator";
import CallInterface from "./components/calls/CallInterface";
import IncomingCallDialog from "./components/calls/IncomingCallDialog";
import CallProvider from "./context/CallProvider";
import GlobalProvider from "./context/GlobalProvider";

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
