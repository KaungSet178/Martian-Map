import requests
import re

def check_sim3292():
    url = "https://pubs.usgs.gov/sim/3292/"
    print("Checking USGS SIM 3292 at", url)
    try:
        r = requests.get(url, timeout=20)
        print("SIM 3292 status:", r.status_code)
        links = re.findall(r'href=[\'"]([^\'"]+)[\'"]', r.text)
        data_links = [l for l in links if any(l.lower().endswith(ext) for ext in ['.zip', '.tar', '.gz', '.gdb', '.shp', '.pdf'])]
        print("Found data links:", len(data_links))
        for l in data_links[:10]:
            print("  ", l)
    except Exception as e:
        print("Error checking SIM 3292:", e)

def check_zenodo_5808381():
    url = "https://zenodo.org/api/records/5808381"
    print("\nChecking Zenodo 5808381 at", url)
    try:
        r = requests.get(url, timeout=20)
        data = r.json()
        print("Title:", data.get("metadata", {}).get("title"))
        print("Description:", data.get("metadata", {}).get("description")[:300], "...")
        for f in data.get("files", []):
            print(f"  {f['key']} ({f['size'] / 1024 / 1024:.2f} MB)")
    except Exception as e:
        print("Error checking Zenodo:", e)

if __name__ == "__main__":
    check_sim3292()
    check_zenodo_5808381()
