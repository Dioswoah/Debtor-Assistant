import os
from dotenv import load_dotenv
from server import _make_simpro_request

load_dotenv()

def test_api():
    print("Testing SimPRO connection...")
    
    # 1. Company Information
    print("\n--- Fetching Companies ---")
    companies = _make_simpro_request("/api/v1.0/companies/")
    print("Companies result:", companies)
    
    # 2. Try fetching a few Jobs from Company 1
    print("\n--- Fetching Jobs from Company 1 (Limit 2) ---")
    jobs = _make_simpro_request("/api/v1.0/companies/1/jobs/", {"pageSize": 2})
    
    if isinstance(jobs, list):
        print("Jobs fetched successfully:")
        for job in jobs[:2]:
            print(f" - Job ID: {job.get('ID')}, Description: {job.get('Description', 'N/A')}")
    else:
        print("Jobs result error:", jobs)
        
    # 3. Try fetching a few Invoices from Company 1
    print("\n--- Fetching Invoices from Company 1 (Limit 2) ---")
    invoices = _make_simpro_request("/api/v1.0/companies/1/invoices/", {"pageSize": 2})
    
    if isinstance(invoices, list):
        print("Invoices fetched successfully:")
        for inv in invoices[:2]:
            print(f" - Invoice ID: {inv.get('ID')}, Total: {inv.get('Total', 'N/A')}, Due Date: {inv.get('DateDue', 'N/A')}")
    else:
        print("Invoices result error:", invoices)

if __name__ == "__main__":
    test_api()
