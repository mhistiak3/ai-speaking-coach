import type { Metadata } from "next";

import { ProgressDashboard } from "@/components/progress/progress-dashboard";

export const metadata: Metadata = {
  title: "Progress",
  description: "Streaks, estimates, and the words that need work.",
};

export default function ProgressPage() {
  return <ProgressDashboard />;
}
