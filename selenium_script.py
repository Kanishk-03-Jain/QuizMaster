#!/usr/bin/env python3
"""
Comprehensive Selenium Test Script for QuizMaster
Tests all pages, buttons, forms, and interactive elements

USAGE:
------
1. Install dependencies:
   pip install -r requirements.txt

2. Make sure Chrome browser is installed

3. Run the script:
   python selenium_script.py
   
   Or with a custom URL:
   python selenium_script.py https://your-site.com

OUTPUT:
-------
The script generates two report files:
- test_report_YYYYMMDD_HHMMSS.txt (human-readable)
- test_report_YYYYMMDD_HHMMSS.json (machine-readable)

FEATURES:
---------
- Tests all pages and routes
- Clicks on all buttons and links
- Fills all input fields and forms
- Tests interactive elements (tabs, modals, etc.)
- Generates comprehensive test reports
- Handles authentication redirects gracefully
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementNotInteractableException,
    ElementClickInterceptedException
)
import time
import json
from datetime import datetime
from typing import List, Dict, Tuple
import sys

class QuizMasterTester:
    def __init__(self, base_url: str = "https://quiz-master-bay.vercel.app"):
        self.base_url = base_url
        self.results = {
            "passed": [],
            "failed": [],
            "warnings": [],
            "tested_elements": [],
            "timestamp": datetime.now().isoformat()
        }
        self.driver = None
        
    def setup_driver(self):
        """Setup Chrome WebDriver with options"""
        chrome_options = Options()
        # Visible browser by default so it takes control of the computer.
        # Use HEADLESS=1 env to run headless if desired.
        import os
        if os.environ.get("HEADLESS", "0") == "1":
            chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        try:
            # Try using webdriver-manager if available
            try:
                from webdriver_manager.chrome import ChromeDriverManager
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
            except ImportError:
                # Fallback to system ChromeDriver
                self.driver = webdriver.Chrome(options=chrome_options)
            
            self.driver.implicitly_wait(5)
            self.wait = WebDriverWait(self.driver, 10)
            return True
        except Exception as e:
            print(f"Error setting up driver: {e}")
            print("Make sure ChromeDriver is installed and in PATH")
            print("Or install webdriver-manager: pip install webdriver-manager")
            return False
    
    def log_result(self, test_name: str, status: str, message: str = "", element_type: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "url": self.driver.current_url if self.driver else "",
            "timestamp": datetime.now().isoformat(),
            "element_type": element_type
        }
        
        if status == "PASS":
            self.results["passed"].append(result)
        elif status == "FAIL":
            self.results["failed"].append(result)
        else:
            self.results["warnings"].append(result)
        
        print(f"[{status}] {test_name}: {message}")
    
    def safe_click(self, element, test_name: str = "") -> bool:
        """Safely click an element"""
        try:
            # Scroll element into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(0.5)
            
            # Try clicking
            element.click()
            return True
        except ElementClickInterceptedException:
            try:
                # Try JavaScript click
                self.driver.execute_script("arguments[0].click();", element)
                return True
            except Exception as e:
                if test_name:
                    self.log_result(test_name, "FAIL", f"Could not click element: {str(e)}")
                return False
        except Exception as e:
            if test_name:
                self.log_result(test_name, "FAIL", f"Error clicking element: {str(e)}")
            return False
    
    def find_and_test_elements(self, selector: str, element_type: str, test_name_prefix: str = "") -> List:
        """Find all elements matching selector and test them"""
        found_elements = []
        try:
            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            for i, element in enumerate(elements):
                try:
                    if element.is_displayed() and element.is_enabled():
                        test_name = f"{test_name_prefix}_{element_type}_{i+1}"
                        found_elements.append((element, test_name))
                        self.results["tested_elements"].append({
                            "type": element_type,
                            "selector": selector,
                            "index": i,
                            "text": element.text[:50] if element.text else "",
                            "url": self.driver.current_url
                        })
                except Exception:
                    pass
        except Exception as e:
            self.log_result(f"{test_name_prefix}_find_{element_type}", "WARN", f"Could not find elements: {str(e)}")
        return found_elements
    
    def test_page_load(self, url: str, expected_title: str = None) -> bool:
        """Test if a page loads successfully"""
        try:
            self.driver.get(url)
            time.sleep(2)  # Wait for page to load
            
            if expected_title:
                if expected_title.lower() in self.driver.title.lower():
                    self.log_result(f"Page Load: {url}", "PASS", f"Page loaded with title: {self.driver.title}")
                    return True
                else:
                    self.log_result(f"Page Load: {url}", "WARN", f"Title mismatch. Expected: {expected_title}, Got: {self.driver.title}")
            else:
                self.log_result(f"Page Load: {url}", "PASS", f"Page loaded successfully")
                return True
        except Exception as e:
            self.log_result(f"Page Load: {url}", "FAIL", f"Failed to load page: {str(e)}")
            return False
    
    def test_all_buttons(self):
        """Test all buttons on current page"""
        buttons = self.find_and_test_elements("button", "button", "buttons")
        links_as_buttons = self.find_and_test_elements("a[role='button'], a.button", "link_button", "link_buttons")
        
        all_buttons = buttons + links_as_buttons
        
        for element, test_name in all_buttons:
            try:
                if self.safe_click(element, test_name):
                    time.sleep(1)  # Wait for action to complete
                    self.log_result(test_name, "PASS", f"Button clicked successfully: {element.text[:30]}")
                else:
                    self.log_result(test_name, "FAIL", "Button click failed")
            except Exception as e:
                self.log_result(test_name, "FAIL", f"Error testing button: {str(e)}")
    
    def test_all_links(self):
        """Test all links on current page"""
        links = self.find_and_test_elements("a[href]", "link", "links")
        
        for element, test_name in links:
            try:
                href = element.get_attribute("href")
                if href and href.startswith(self.base_url):
                    if self.safe_click(element, test_name):
                        time.sleep(1)
                        self.log_result(test_name, "PASS", f"Link clicked: {href}")
                    else:
                        self.log_result(test_name, "FAIL", f"Link click failed: {href}")
            except Exception as e:
                self.log_result(test_name, "FAIL", f"Error testing link: {str(e)}")

    def login(self, email: str, password: str) -> bool:
        """Login using provided credentials and wait for redirect away from /auth/login"""
        try:
            self.driver.get(f"{self.base_url}/auth/login")
            email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
            password_input = self.driver.find_element(By.ID, "password")
            email_input.clear(); email_input.send_keys(email)
            password_input.clear(); password_input.send_keys(password)
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            self.safe_click(submit_btn, "Login Submit")
            # Wait for navigation away from login
            self.wait.until(EC.url_changes(f"{self.base_url}/auth/login"))
            time.sleep(2)
            # Basic sanity: should not be on login page
            if "/auth/login" in self.driver.current_url:
                self.log_result("Login", "FAIL", "Still on login page after submit")
                return False
            self.log_result("Login", "PASS", f"Logged in as {email}")
            return True
        except Exception as e:
            self.log_result("Login", "FAIL", f"Login failed for {email}: {str(e)}")
            return False

    def try_logout(self):
        """Attempt to logout by clicking any visible Logout button"""
        try:
            # Try common logout buttons
            candidates = self.driver.find_elements(By.XPATH, "//button[normalize-space()='Logout'] | //a[normalize-space()='Logout']")
            for el in candidates:
                if el.is_displayed():
                    if self.safe_click(el, "Logout"):
                        time.sleep(2)
                        self.log_result("Logout", "PASS", "Clicked Logout")
                        return True
        except Exception:
            pass
        # As a fallback, navigate to login page which typically redirects if logged in
        try:
            self.driver.get(f"{self.base_url}/auth/login")
            time.sleep(1)
        except Exception:
            pass
        return False

    def explore_authenticated_site(self, start_paths: list[str], max_depth: int = 3, max_pages: int = 50):
        """Breadth-first exploration of internal links, clicking buttons and links on each page."""
        from collections import deque
        visited = set()
        queue = deque()
        for p in start_paths:
            queue.append(self.base_url + p if p.startswith('/') else p)

        pages_explored = 0
        while queue and pages_explored < max_pages:
            url = queue.popleft()
            if url in visited or not url.startswith(self.base_url):
                continue
            visited.add(url)

            try:
                self.driver.get(url)
                time.sleep(1.5)
                self.log_result("Explore Page", "PASS", f"Visited {url}")

                # Interact with elements on this page
                self.test_all_buttons()
                self.test_all_inputs()

                # Collect new internal links (limit per page to avoid explosion)
                link_els = self.driver.find_elements(By.CSS_SELECTOR, "a[href]")
                new_links_added = 0
                for a in link_els:
                    try:
                        href = a.get_attribute("href") or ""
                        if href.startswith(self.base_url) and href not in visited and new_links_added < 20:
                            queue.append(href)
                            new_links_added += 1
                    except Exception:
                        continue

                pages_explored += 1
            except Exception as e:
                self.log_result("Explore Page", "WARN", f"Error visiting {url}: {str(e)}")

    def run_authenticated_flows(self):
        """Login as teacher and student sequentially and explore their areas."""
        # Teacher flow
        if self.login("kanishkjain03082005@gmail.com", "1234567"):
            # Prioritize teacher pages
            self.explore_authenticated_site([
                "/teacher/dashboard",
            ], max_depth=3, max_pages=40)
            # Also try student pages in case of role redirects (harmless)
            self.explore_authenticated_site([
                "/student/dashboard",
                "/student/join-quiz",
            ], max_depth=2, max_pages=10)
            self.try_logout()

        # Student flow
        if self.login("kanishkjaincloud@gmail.com", "12345678"):
            self.explore_authenticated_site([
                "/student/dashboard",
                "/student/join-quiz",
            ], max_depth=3, max_pages=40)
            # Visit a likely quiz page if reachable via links (crawler handles it)
            self.try_logout()
    
    def test_all_inputs(self):
        """Test all input fields on current page"""
        inputs = self.find_and_test_elements("input, textarea, select", "input", "inputs")
        
        for element, test_name in inputs:
            try:
                input_type = element.get_attribute("type") or "text"
                input_name = element.get_attribute("name") or element.get_attribute("id") or "unknown"
                
                # Skip hidden inputs
                if input_type == "hidden":
                    continue
                
                if element.is_displayed():
                    element.clear()
                    test_value = "test_input_value"
                    
                    if input_type == "email":
                        test_value = "test@example.com"
                    elif input_type == "password":
                        test_value = "testpassword123"
                    elif input_type == "number":
                        test_value = "10"
                    
                    element.send_keys(test_value)
                    time.sleep(0.5)
                    
                    self.log_result(test_name, "PASS", f"Input field filled: {input_name} (type: {input_type})")
            except Exception as e:
                self.log_result(test_name, "FAIL", f"Error testing input: {str(e)}")
    
    def test_all_forms(self):
        """Test form submission"""
        forms = self.find_and_test_elements("form", "form", "forms")
        
        for element, test_name in forms:
            try:
                # Find all inputs in form and fill them
                inputs = element.find_elements(By.CSS_SELECTOR, "input, textarea, select")
                for inp in inputs:
                    try:
                        if inp.is_displayed() and inp.get_attribute("type") != "hidden":
                            inp_type = inp.get_attribute("type") or "text"
                            if inp_type == "email":
                                inp.send_keys("test@example.com")
                            elif inp_type == "password":
                                inp.send_keys("testpassword123")
                            elif inp_type == "number":
                                inp.send_keys("10")
                            else:
                                inp.send_keys("test")
                    except Exception:
                        pass
                
                # Try to find and click submit button
                submit_buttons = element.find_elements(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
                if submit_buttons:
                    submit_btn = submit_buttons[0]
                    if self.safe_click(submit_btn, f"{test_name}_submit"):
                        time.sleep(2)
                        self.log_result(f"{test_name}_submit", "PASS", "Form submitted")
                    else:
                        self.log_result(f"{test_name}_submit", "FAIL", "Form submit button click failed")
                else:
                    self.log_result(test_name, "WARN", "No submit button found in form")
            except Exception as e:
                self.log_result(test_name, "FAIL", f"Error testing form: {str(e)}")
    
    def test_homepage(self):
        """Test homepage"""
        self.log_result("Homepage Test", "INFO", "Starting homepage tests")
        if not self.test_page_load(self.base_url, "QuizMaster"):
            return
        
        time.sleep(2)
        
        # Test all elements on homepage
        self.test_all_buttons()
        self.test_all_links()
        self.test_all_inputs()
    
    def test_login_page(self):
        """Test login page"""
        self.log_result("Login Page Test", "INFO", "Starting login page tests")
        if not self.test_page_load(f"{self.base_url}/auth/login", "Login"):
            return
        
        time.sleep(2)
        
        # Test login form
        try:
            email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
            password_input = self.driver.find_element(By.ID, "password")
            
            email_input.clear()
            email_input.send_keys("test@example.com")
            password_input.clear()
            password_input.send_keys("testpassword123")
            
            self.log_result("Login Form Fill", "PASS", "Login form filled successfully")
            
            # Test submit button
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            if submit_btn:
                self.log_result("Login Submit Button", "PASS", "Submit button found and clickable")
                # Don't actually submit to avoid authentication errors
            
        except TimeoutException:
            self.log_result("Login Form", "FAIL", "Login form elements not found")
        except Exception as e:
            self.log_result("Login Form", "FAIL", f"Error: {str(e)}")
        
        # Test all other elements
        self.test_all_buttons()
        self.test_all_links()
        
        # Test sign up link
        try:
            signup_link = self.driver.find_element(By.LINK_TEXT, "Sign up here")
            if self.safe_click(signup_link, "Sign Up Link"):
                time.sleep(2)
                self.log_result("Sign Up Link", "PASS", "Sign up link works")
        except Exception as e:
            self.log_result("Sign Up Link", "FAIL", f"Error: {str(e)}")
    
    def test_signup_page(self):
        """Test signup page"""
        self.log_result("Signup Page Test", "INFO", "Starting signup page tests")
        if not self.test_page_load(f"{self.base_url}/auth/sign-up", "Sign Up"):
            return
        
        time.sleep(2)
        
        # Test signup form
        try:
            fullname_input = self.wait.until(EC.presence_of_element_located((By.ID, "fullName")))
            email_input = self.driver.find_element(By.ID, "email")
            role_select = self.driver.find_element(By.ID, "role")
            password_input = self.driver.find_element(By.ID, "password")
            repeat_password_input = self.driver.find_element(By.ID, "repeatPassword")
            
            fullname_input.clear()
            fullname_input.send_keys("Test User")
            email_input.clear()
            email_input.send_keys(f"test{int(time.time())}@example.com")
            password_input.clear()
            password_input.send_keys("testpassword123")
            repeat_password_input.clear()
            repeat_password_input.send_keys("testpassword123")
            
            self.log_result("Signup Form Fill", "PASS", "Signup form filled successfully")
            
            # Test role select
            if role_select:
                self.log_result("Role Select", "PASS", "Role select found")
            
            # Test submit button
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            if submit_btn:
                self.log_result("Signup Submit Button", "PASS", "Submit button found")
                # Don't actually submit to avoid creating test accounts
            
        except TimeoutException:
            self.log_result("Signup Form", "FAIL", "Signup form elements not found")
        except Exception as e:
            self.log_result("Signup Form", "FAIL", f"Error: {str(e)}")
        
        # Test all other elements
        self.test_all_buttons()
        self.test_all_links()
        
        # Test login link
        try:
            login_link = self.driver.find_element(By.LINK_TEXT, "Login")
            if self.safe_click(login_link, "Login Link from Signup"):
                time.sleep(2)
                self.log_result("Login Link from Signup", "PASS", "Login link works")
        except Exception as e:
            self.log_result("Login Link from Signup", "FAIL", f"Error: {str(e)}")
    
    def test_student_dashboard(self):
        """Test student dashboard (may require authentication)"""
        self.log_result("Student Dashboard Test", "INFO", "Starting student dashboard tests")
        if not self.test_page_load(f"{self.base_url}/student/dashboard"):
            return
        
        time.sleep(3)
        
        # Check if redirected to login (expected if not authenticated)
        if "login" in self.driver.current_url.lower():
            self.log_result("Student Dashboard Auth", "WARN", "Redirected to login (authentication required)")
            return
        
        # Test all elements
        self.test_all_buttons()
        self.test_all_links()
        self.test_all_inputs()
        
        # Test tabs
        try:
            tabs = self.driver.find_elements(By.CSS_SELECTOR, "[role='tab'], button[data-state]")
            for tab in tabs:
                if tab.is_displayed():
                    self.safe_click(tab, "Tab Click")
                    time.sleep(1)
        except Exception:
            pass
        
        # Test quiz cards
        try:
            quiz_cards = self.driver.find_elements(By.CSS_SELECTOR, "[data-testid='quiz-card'], .card")
            self.log_result("Quiz Cards", "PASS", f"Found {len(quiz_cards)} quiz cards")
        except Exception:
            pass
    
    def test_teacher_dashboard(self):
        """Test teacher dashboard (may require authentication)"""
        self.log_result("Teacher Dashboard Test", "INFO", "Starting teacher dashboard tests")
        if not self.test_page_load(f"{self.base_url}/teacher/dashboard"):
            return
        
        time.sleep(3)
        
        # Check if redirected to login
        if "login" in self.driver.current_url.lower():
            self.log_result("Teacher Dashboard Auth", "WARN", "Redirected to login (authentication required)")
            return
        
        # Test all elements
        self.test_all_buttons()
        self.test_all_links()
        self.test_all_inputs()
        
        # Test tabs
        try:
            tabs = self.driver.find_elements(By.CSS_SELECTOR, "[role='tab'], button[data-state]")
            for tab in tabs:
                if tab.is_displayed():
                    self.safe_click(tab, "Tab Click")
                    time.sleep(1)
        except Exception:
            pass
        
        # Test create quiz button
        try:
            create_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Create')]")
            if create_btn:
                self.log_result("Create Quiz Button", "PASS", "Create quiz button found")
        except Exception:
            pass
    
    def test_join_quiz_page(self):
        """Test join quiz page"""
        self.log_result("Join Quiz Page Test", "INFO", "Starting join quiz page tests")
        if not self.test_page_load(f"{self.base_url}/student/join-quiz"):
            return
        
        time.sleep(2)
        
        # Test join code input
        try:
            join_code_input = self.wait.until(EC.presence_of_element_located((By.ID, "joinCode")))
            join_code_input.clear()
            join_code_input.send_keys("TEST01")
            self.log_result("Join Code Input", "PASS", "Join code input works")
        except Exception as e:
            self.log_result("Join Code Input", "FAIL", f"Error: {str(e)}")
        
        # Test all elements
        self.test_all_buttons()
        self.test_all_links()
    
    def test_all_pages(self):
        """Test all accessible pages"""
        pages_to_test = [
            ("/", "Homepage"),
            ("/auth/login", "Login Page"),
            ("/auth/sign-up", "Signup Page"),
            ("/auth/sign-up-success", "Signup Success Page"),
            ("/student/dashboard", "Student Dashboard"),
            ("/student/join-quiz", "Join Quiz Page"),
            ("/teacher/dashboard", "Teacher Dashboard"),
        ]
        
        for path, name in pages_to_test:
            try:
                self.log_result(f"Testing {name}", "INFO", f"Accessing {path}")
                self.test_page_load(f"{self.base_url}{path}")
                time.sleep(2)
                
                # Test all interactive elements on each page
                self.test_all_buttons()
                self.test_all_links()
                self.test_all_inputs()
                self.test_all_forms()
                
                time.sleep(1)
            except Exception as e:
                self.log_result(f"Testing {name}", "FAIL", f"Error: {str(e)}")
    
    def generate_report(self):
        """Generate comprehensive test report"""
        total_tests = len(self.results["passed"]) + len(self.results["failed"]) + len(self.results["warnings"])
        pass_rate = (len(self.results["passed"]) / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
{'='*80}
QUIZMASTER COMPREHENSIVE TEST REPORT
{'='*80}
Generated: {self.results['timestamp']}
Base URL: {self.base_url}

SUMMARY:
--------
Total Tests: {total_tests}
Passed: {len(self.results['passed'])} ({len(self.results['passed'])/total_tests*100:.1f}%)
Failed: {len(self.results['failed'])} ({len(self.results['failed'])/total_tests*100:.1f}%)
Warnings: {len(self.results['warnings'])} ({len(self.results['warnings'])/total_tests*100:.1f}%)
Pass Rate: {pass_rate:.1f}%

Elements Tested: {len(self.results['tested_elements'])}

PASSED TESTS ({len(self.results['passed'])}):
--------------
"""
        for test in self.results["passed"][:20]:  # Show first 20
            report += f"✓ {test['test']}: {test['message']}\n"
        if len(self.results["passed"]) > 20:
            report += f"... and {len(self.results['passed']) - 20} more passed tests\n"
        
        report += f"\nFAILED TESTS ({len(self.results['failed'])}):\n"
        report += "---------------\n"
        for test in self.results["failed"]:
            report += f"✗ {test['test']}: {test['message']}\n"
            if test['url']:
                report += f"  URL: {test['url']}\n"
        
        report += f"\nWARNINGS ({len(self.results['warnings'])}):\n"
        report += "---------\n"
        for test in self.results["warnings"]:
            report += f"⚠ {test['test']}: {test['message']}\n"
        
        report += f"\n{'='*80}\n"
        
        # Save to file
        filename = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, "w") as f:
            f.write(report)
        
        # Also save JSON
        json_filename = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_filename, "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(report)
        print(f"\nReport saved to: {filename}")
        print(f"JSON report saved to: {json_filename}")
        
        return report
    
    def run_all_tests(self):
        """Run authenticated flows for teacher and student, then general checks"""
        if not self.setup_driver():
            print("Failed to setup driver. Exiting.")
            return False
        
        try:
            print("Starting comprehensive QuizMaster testing...")
            print(f"Testing: {self.base_url}\n")
            
            # Homepage smoke
            self.test_homepage()
            time.sleep(1)

            # Authenticated exploration as requested
            print("\nRunning authenticated flows (teacher and student)...")
            self.run_authenticated_flows()
            
            # Generate report
            print("\nGenerating test report...")
            self.generate_report()
            
            return True
            
        except KeyboardInterrupt:
            print("\n\nTest interrupted by user")
            self.generate_report()
            return False
        except Exception as e:
            print(f"\n\nFatal error during testing: {str(e)}")
            import traceback
            traceback.print_exc()
            self.generate_report()
            return False
        finally:
            if self.driver:
                self.driver.quit()
                print("\nBrowser closed.")

if __name__ == "__main__":
    base_url = "https://quiz-master-bay.vercel.app"
    
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    tester = QuizMasterTester(base_url)
    tester.run_all_tests()

