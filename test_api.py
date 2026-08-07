import requests

url = "https://admin.arko360.net/api/v1/cost360/items"
params = {
    "search": "alambre",
    "search_desc": "false",
    "search_insumos": "true",
    "limit": 1
}

response = requests.get(url, params=params)
data = response.json()
print("Total Items API:", data.get("total"))
