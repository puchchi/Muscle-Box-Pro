import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import GymDemo from "@/pages/GymDemo";
import Account from "@/pages/Account";
import Advertiser from "@/pages/Advertiser";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import MachineSpecs from "@/pages/MachineSpecs";
import ForgotPassword from "@/pages/ForgotPassword";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import HelpCenter from "@/pages/HelpCenter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gym-demo" component={GymDemo} />
      <Route path="/specs" component={MachineSpecs} />
      <Route path="/account" component={Account} />
      <Route path="/advertise" component={Advertiser} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/about" component={AboutUs} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/help" component={HelpCenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
