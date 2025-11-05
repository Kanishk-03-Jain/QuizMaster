from locust import HttpUser, task, between


class QuizMasterUser(HttpUser):
    """Simulates a typical user browsing key pages of QuizMaster."""

    # Set wait time between tasks to simulate realistic user pacing
    wait_time = between(1, 3)

    # Target the deployed site directly so you can run without passing --host
    host = "https://quiz-master-bay.vercel.app"

    @task(5)
    def visit_homepage(self):
        self.client.get("/")

    @task(3)
    def visit_login(self):
        self.client.get("/auth/login")

    @task(2)
    def visit_signup(self):
        self.client.get("/auth/sign-up")

    @task(3)
    def browse_student_join_quiz(self):
        self.client.get("/student/join-quiz")

    @task(2)
    def browse_student_dashboard(self):
        # This page may require auth; if unauthorized, Locust will still record response metrics
        self.client.get("/student/dashboard")

    @task(2)
    def browse_teacher_dashboard(self):
        # This page may require auth; if unauthorized, Locust will still record response metrics
        self.client.get("/teacher/dashboard")

    @task(1)
    def hit_nonexistent_route(self):
        # Lightly exercise error paths/404 handling
        self.client.get("/nonexistent-route-for-load-test", name="/nonexistent")


class FastBrowsingUser(HttpUser):
    """Simulates a faster user with shorter waits, stressing the server harder."""

    wait_time = between(0.3, 1.0)
    host = "https://quiz-master-bay.vercel.app"

    @task(6)
    def cycle_main_pages(self):
        self.client.get("/")
        self.client.get("/auth/login")
        self.client.get("/auth/sign-up")
        self.client.get("/student/join-quiz")


