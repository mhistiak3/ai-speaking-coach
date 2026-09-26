import type { Metadata } from "next";

import { PracticeHub } from "@/components/practice/practice-hub";

export const metadata: Metadata = {
  title: "Practice",
  description: "Pick a conversation scenario and start speaking.",
};

export default function PracticePage() {
  return <PracticeHub />;
}
