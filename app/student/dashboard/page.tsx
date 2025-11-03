import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentDashboardContent } from "@/components/student/dashboard-content"

export default async function StudentDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()

  if (profile?.role !== "student") {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentDashboardContent user={user} profile={profile} />
    </div>
  )
}
