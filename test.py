import urllib.request, json
with open('test.json') as f: data=f.read().encode('utf-8')
req=urllib.request.Request('http://localhost:8000/api/v1/generate', data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as response:
    print(f"Status Code: {response.status}")
    res = json.loads(response.read().decode('utf-8'))
    print(f"Message: {res.get('message')}")
    data = res.get('data', {})
    val = data.get('validation', {})
    print(f"Validation Status: {val.get('status')}")
    print("Issues:")
    for issue in val.get('issues', []):
        print(f"  - [{issue.get('severity')}] {issue.get('message_fr')}")
    print("\nFloors Layout:")
    for floor in data.get('floors', []):
        print(f"Floor {floor.get('floor_number')} ({floor.get('floor_label')}):")
        print("  Rooms:")
        for r in floor.get('rooms', []):
            print(f"    - {r.get('room_type')} (x={r.get('x')}, y={r.get('y')}, w={r.get('width')}, h={r.get('height')})")
        print("  Doors:")
        for d in floor.get('doors', []):
            print(f"    - from {d.get('from_room')} to {d.get('to_room')} ({d.get('wall_side')})")
