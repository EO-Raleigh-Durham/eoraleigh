import { redirect } from "next/navigation";

// The admin entry point lands on the Chapter Dashboard. The feature
// directory ("Overview") moved to /board/overview.
export default function AdminIndex() {
  redirect("/board/chapter-dashboard");
}
