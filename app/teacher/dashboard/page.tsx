import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeacherDashboardContent } from "@/components/teacher/dashboard-content"

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()

  if (profile?.role !== "teacher") {
    redirect("/")
  }

  return (
    <div className="flex h-screen bg-background">
      <TeacherDashboardContent user={user} profile={profile} />
    </div>
  )
}
