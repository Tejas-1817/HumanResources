import json
import os

def check_logs():
    log_path = r"C:\Users\admin\.gemini\antigravity-ide\brain\940b78ed-ba9a-4f90-be99-24c12f6f7e99\.system_generated\logs\transcript.jsonl"
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            data = json.loads(line)
            step_idx = data.get("step_index", 0)
            if step_idx in (298, 299):
                print(f"Step {step_idx} | Type: {data.get('type')} | Status: {data.get('status')}")
                print(f"  Content: {data.get('content')}")
                print(f"  Tool Calls: {data.get('tool_calls')}")

if __name__ == "__main__":
    check_logs()
