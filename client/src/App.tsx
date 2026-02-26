import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const Home = lazy(() => import("@/pages/Home"));
const GymDemo = lazy(() => import("@/pages/GymDemo"));
const Account = lazy(() => import("@/pages/Account"));
const Advertiser = lazy(() => import("@/pages/Advertiser"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const MachineSpecs = lazy(() => import("@/pages/MachineSpecs"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const AboutUs = lazy(() => import("@/pages/AboutUs"));
const ContactUs = lazy(() => import("@/pages/ContactUs"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={null}>
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
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <Analytics />
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
