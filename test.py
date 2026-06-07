import urllib.request, json
with open('test.json') as f: data=f.read().encode('utf-8')
req=urllib.request.Request('http://localhost:8000/generate', data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as response:
    print(response.status)
    print(response.read().decode('utf-8')[:1000])
