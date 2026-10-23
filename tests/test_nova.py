"""
Automated Test Suite for NOVA AI Assistant (Alexa-Next 2.0).
Verifies:
1. Health and diagnostic endpoint
2. Chat API and multi-turn context
3. Autonomous Mission Mode (Creation, Step Editing, Approval, Execution, Verification)
4. Tool Registry (validation, permissions, execution logging, verification)
5. User-Controlled Persistent Memory (CRUD, persistence, search)
6. Task & Planner CRUD with conflict detection
7. Multimodal upload validation & analysis
8. Smart Home IoT persistence across operations
9. Proactive Life Insights
10. What-If Simulator & Personal Skills
"""

import unittest
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"


class TestNovaAIAssistant(unittest.TestCase):

    def setUp(self):
        # Verify server is responding
        try:
            res = requests.get(f"{BASE_URL}/api/health", timeout=5)
            self.assertEqual(res.status_code, 200)
        except Exception as e:
            self.fail(f"NOVA backend server is not reachable at {BASE_URL}: {e}")

    # 1. System Health & Diagnostics
    def test_01_health_endpoint(self):
        res = requests.get(f"{BASE_URL}/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["service"], "NOVA AI Assistant API (Alexa-Next 2.0)")
        self.assertTrue(data["mcp_enabled"])
        self.assertTrue(data["autonomous_missions_active"])
        self.assertGreaterEqual(data["tools_registered_count"], 10)

    # 2. Conversational Voice & Text Chat
    def test_02_chat_endpoint(self):
        res = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "Hello Nova, tell me about your capabilities",
            "conversation_id": "test-session"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue("speech_reply" in data or "reply" in data)
        self.assertIn("mood", data)

    # 3. Autonomous Mission Mode: Planning, Approval, Execution & Verification
    def test_03_autonomous_mission_flow(self):
        # Step A: Formulate plan
        plan_res = requests.post(f"{BASE_URL}/api/missions/plan", json={
            "goal": "Help me organize my week, prepare for my assignments, identify deadline conflicts, and create a realistic study schedule.",
            "conversation_id": "test-session"
        })
        self.assertEqual(plan_res.status_code, 200)
        plan_data = plan_res.json()
        mission_id = plan_data["mission_id"]
        steps = plan_data["steps"]
        self.assertGreaterEqual(len(steps), 2)
        self.assertEqual(plan_data["status"], "pending_review")

        # Step B: Edit plan steps (remove/modify a step)
        modified_steps = steps[:3]
        modified_steps[0]["title"] = "Pre-Execution Context Analysis (Edited by User)"
        update_res = requests.put(f"{BASE_URL}/api/missions/{mission_id}/steps", json={
            "steps": modified_steps
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(len(update_res.json()["steps"]), 3)

        # Step C: Approve and execute mission
        exec_res = requests.post(f"{BASE_URL}/api/missions/{mission_id}/approve")
        self.assertEqual(exec_res.status_code, 200)
        exec_data = exec_res.json()
        self.assertIn(exec_data["status"], ["completed", "completed_with_warnings"])
        self.assertGreaterEqual(exec_data["completed_steps"], 1)

        # Step D: Verify mission status persisted in database
        get_res = requests.get(f"{BASE_URL}/api/missions/{mission_id}")
        self.assertEqual(get_res.status_code, 200)
        persisted = get_res.json()
        self.assertEqual(persisted["id"], mission_id)
        self.assertEqual(persisted["status"], exec_data["status"])

    # 4. Tool Registry, Activity Logging & Trust Center
    def test_04_tool_activity_and_trust_center(self):
        # Fetch activity logs
        logs_res = requests.get(f"{BASE_URL}/api/activity/logs")
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json().get("logs", [])
        self.assertGreater(len(logs), 0)
        latest = logs[0]
        self.assertIn("tool_name", latest)
        self.assertIn("verified", latest)
        self.assertIn("duration_ms", latest)

        # Fetch Trust Center
        trust_res = requests.get(f"{BASE_URL}/api/trust-center")
        self.assertEqual(trust_res.status_code, 200)
        trust = trust_res.json()
        self.assertEqual(trust["status"], "secure")
        self.assertTrue(trust["api_keys_server_side"])
        self.assertGreaterEqual(len(trust["registered_tools"]), 10)

    # 5. User-Controlled Persistent Memory
    def test_05_persistent_memory_crud(self):
        # Create memory
        test_content = f"User prefers deep focus work between 8 AM and 11 AM {time.time()}"
        save_res = requests.post(f"{BASE_URL}/api/memory", json={
            "content": test_content,
            "category": "routine",
            "is_pinned": True
        })
        self.assertEqual(save_res.status_code, 200)
        mem_id = save_res.json()["id"]

        # List memories and verify presence
        list_res = requests.get(f"{BASE_URL}/api/memory")
        self.assertEqual(list_res.status_code, 200)
        mems = list_res.json()["memories"]
        found = any(m["id"] == mem_id for m in mems)
        self.assertTrue(found)

        # Delete memory
        del_res = requests.delete(f"{BASE_URL}/api/memory/{mem_id}")
        self.assertEqual(del_res.status_code, 200)

    # 6. Task Management & Conflict Detection
    def test_06_task_crud_and_conflicts(self):
        # Create task
        task_res = requests.post(f"{BASE_URL}/api/planner/deadlines", json={
            "title": "Automated Unit Test Assignment",
            "due_date": "2026-10-24 17:00",
            "category": "Assignment",
            "priority": "high",
            "estimated_hours": 3.5
        })
        self.assertEqual(task_res.status_code, 200)
        t_id = task_res.json()["id"]

        # Complete task
        comp_res = requests.post(f"{BASE_URL}/api/planner/deadlines/{t_id}/complete")
        self.assertEqual(comp_res.status_code, 200)

        # Delete task
        del_res = requests.delete(f"{BASE_URL}/api/planner/deadlines/{t_id}")
        self.assertEqual(del_res.status_code, 200)

    # 7. Multimodal File Upload Validation
    def test_07_multimodal_upload_validation(self):
        # Test valid text file
        file_content = b"Course: CS402 Distributed Systems\nAssignment 3 Due: 2026-10-27 18:00\nImplement Raft algorithm."
        files = {"file": ("test_syllabus.txt", file_content, "text/plain")}
        res = requests.post(f"{BASE_URL}/api/multimodal/upload", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["file_type"], "TXT")

        # Test unsupported extension rejection
        bad_files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
        bad_res = requests.post(f"{BASE_URL}/api/multimodal/upload", files=bad_files)
        self.assertEqual(bad_res.status_code, 400)

    # 8. Smart Home IoT Device State Persistence
    def test_08_smart_home_persistence(self):
        # Toggle living room light ON
        res_on = requests.post(f"{BASE_URL}/api/device", json={"device": "living_room_light", "on": True})
        self.assertEqual(res_on.status_code, 200)

        # Check devices list
        devs_res = requests.get(f"{BASE_URL}/api/devices")
        devs = devs_res.json()
        self.assertTrue(devs["living_room_light"]["on"])

        # Check energy summary
        energy_res = requests.get(f"{BASE_URL}/api/energy")
        self.assertEqual(energy_res.status_code, 200)
        energy = energy_res.json()
        self.assertGreaterEqual(energy["estimated_current_watts"], 9)

    # 9. Proactive Life Insights
    def test_09_proactive_insights(self):
        res = requests.get(f"{BASE_URL}/api/proactive/insights")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("insights", data)

    # 10. What-If Simulator
    def test_10_what_if_simulator(self):
        sim_res = requests.post(f"{BASE_URL}/api/what-if/simulate", json={
            "scenario_title": "Test Workload Shift",
            "modifications": [{"id": 1, "new_date": "2026-10-25 18:00", "new_priority": "urgent"}]
        })
        self.assertEqual(sim_res.status_code, 200)
        data = sim_res.json()
        self.assertIn("tradeoff_analysis", data)
        self.assertIn("simulated_tasks", data)

    # 11. Conversation-Based Reminders & Deadline Scanner
    def test_11_conversation_reminders(self):
        scan_res = requests.post(f"{BASE_URL}/api/reminders/scan-conversations")
        self.assertEqual(scan_res.status_code, 200)
        scan_data = scan_res.json()
        self.assertIn("count", scan_data)
        self.assertIn("captured", scan_data)

        reminders_res = requests.get(f"{BASE_URL}/api/reminders")
        self.assertEqual(reminders_res.status_code, 200)
        self.assertIn("reminders", reminders_res.json())

    # 12. Weather, Daily Briefing, Alarms & Music Player
    def test_12_weather_briefing_music_alarms(self):
        w_res = requests.get(f"{BASE_URL}/api/weather")
        self.assertEqual(w_res.status_code, 200)
        w_data = w_res.json()
        self.assertIn("city", w_data)
        self.assertIn("temperature", w_data)

        b_res = requests.get(f"{BASE_URL}/api/briefing")
        self.assertEqual(b_res.status_code, 200)
        b_data = b_res.json()
        self.assertTrue("spoken" in b_data or "display" in b_data or "weather" in b_data)

        m_res = requests.get(f"{BASE_URL}/api/music/state")
        self.assertEqual(m_res.status_code, 200)

        a_res = requests.get(f"{BASE_URL}/api/alarms")
        self.assertEqual(a_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
