import requests
import json

def test_ml_server():
    url = "http://127.0.0.1:8000/api/ml/analyze"
    payload = {
        "student_id": 1,
        "content": "오늘 프로젝트가 잘 마무리되어서 너무 기뻐요!",
        "delay_minutes": 0,
        "prev_cer": 0.5
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response Data:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
    except Exception as e:
        print(f"Connection Failed: {e}")
        return False

if __name__ == "__main__":
    test_ml_server()
