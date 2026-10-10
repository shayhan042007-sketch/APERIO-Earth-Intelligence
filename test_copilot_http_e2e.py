import urllib.request
import urllib.error
import json
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "http://127.0.0.1:8000/api"

def get(path):
    req = urllib.request.Request(f"{API_BASE}{path}")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post(path, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

def test_api():
    print("================================================================")
    print("       TESTING /api/geochat OVER LIVE HTTP SERVER              ")
    print("================================================================")

    # 0. Health check
    h = get("/health")
    assert h["status"] == "HEALTHY", "Health check failed"
    print(f"[0] Server Health: {h['status']} ({h['service']})")

    # 1. Provider status
    p = get("/geochat/provider")
    print(f"[1] LLM Provider Status: configured={p['configured']}, provider={p['provider']}, status={p['status']}")
    assert "configured" in p and "provider" in p

    history = []

    def ask_http(question, scenario_id="wayanad-landslide"):
        print(f"\n--- HTTP POST /api/geochat ---")
        print(f"QUESTION: \"{question}\" (Scenario: {scenario_id})")
        payload = {
            "question": question,
            "scenario_id": scenario_id,
            "messages": history
        }
        res = post("/geochat", payload)
        print(f"ANSWER:\n{res['answer']}\n")
        print(f"Confidence: {res['confidence']}")
        print(f"Map Target: {res.get('map_target')}")
        print(f"LLM Provider: {res.get('llm_provider')}")
        history.append({
            "question": question,
            "answer": res["answer"],
            "mapTarget": res.get("map_target")
        })
        return res

    # 2. Case 1: hello
    print("\n>>> HTTP TEST CASE 1: Greeting")
    r1 = ask_http("hello")
    assert "APERIO" in r1["answer"] and "Copilot" in r1["answer"]
    assert "Meppadi, Wayanad" in r1["answer"]
    print("PASS: Case 1 (hello)")

    # 3. Case 2: What is the current risk?
    print("\n>>> HTTP TEST CASE 2: What is the current risk?")
    r2 = ask_http("What is the current risk?")
    assert "91%" in r2["answer"]
    assert "CRITICAL" in r2["answer"]
    assert "HRI" in r2["answer"] or "Hazard Risk" in r2["answer"]
    print("PASS: Case 2 (What is the current risk?)")

    # 4. Case 3: Where should we relocate people?
    print("\n>>> HTTP TEST CASE 3: Where should we relocate people?")
    r3 = ask_http("Where should we relocate people?")
    assert "Government Higher Secondary School Meppadi" in r3["answer"]
    assert "2.4 km" in r3["answer"] or "2.4" in r3["answer"]
    assert "270" in r3["answer"]
    print("PASS: Case 3 (Where should we relocate people?)")

    # 5. Case 4: Which location has the highest capacity?
    print("\n>>> HTTP TEST CASE 4: Which location has the highest capacity?")
    r4 = ask_http("Which location has the highest capacity?")
    assert "Vythiri District Camp North" in r4["answer"]
    assert "800" in r4["answer"]
    assert "650" in r4["answer"]
    print("PASS: Case 4 (Which location has the highest capacity?)")

    # 6. Case 5: Show it on the map
    print("\n>>> HTTP TEST CASE 5: Show it on the map")
    r5 = ask_http("Show it on the map")
    assert r5["map_target"] is not None
    assert "Vythiri District Camp North" in r5["map_target"]["target_name"]
    assert r5["map_target"]["lat"] == 11.59 and r5["map_target"]["lon"] == 76.08
    print("PASS: Case 5 (Show it on the map)")

    # 7. Case 6: Contextual follow-up
    print("\n>>> HTTP TEST CASE 6: Contextual follow-up")
    r6 = ask_http("What is its road status?")
    assert "Vythiri District Camp North" in r6["answer"]
    assert "Open" in r6["answer"]
    print("PASS: Case 6 (Contextual follow-up)")

    # 8. Case 7: Error handling / invalid request
    print("\n>>> HTTP TEST CASE 7: Error handling")
    try:
        # Invalid payload without question
        invalid_data = json.dumps({"scenario_id": "test"}).encode('utf-8')
        req = urllib.request.Request(f"{API_BASE}/geochat", data=invalid_data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
        assert False, "Expected HTTP 422 for missing question"
    except urllib.error.HTTPError as e:
        assert e.code == 422, f"Expected 422 error, got {e.code}"
        print(f"PASS: Case 7 (Error handled properly with HTTP {e.code} Unprocessable Entity)")

    print("\n================================================================")
    print("     ALL LIVE HTTP API ENDPOINTS TESTED AND PASSED 100%!        ")
    print("================================================================")

if __name__ == "__main__":
    test_api()
