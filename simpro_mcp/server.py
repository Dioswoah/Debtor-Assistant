import os
import requests
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SIMPRO_BASE_URL = os.getenv("SIMPRO_BASE_URL")
SIMPRO_ACCESS_TOKEN = os.getenv("SIMPRO_ACCESS_TOKEN")

if not SIMPRO_BASE_URL or not SIMPRO_ACCESS_TOKEN:
    raise ValueError("SIMPRO_BASE_URL and SIMPRO_ACCESS_TOKEN must be set in the environment.")

# Initialize FastMCP Server
mcp = FastMCP("SimPRO Services MCP")

def _make_simpro_request(endpoint: str, params: dict = None) -> dict:
    """Helper function to make requests to the SimPRO API."""
    url = f"{SIMPRO_BASE_URL.rstrip('/')}{endpoint}"
    headers = {
        "Authorization": f"Bearer {SIMPRO_ACCESS_TOKEN}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        return {"error": str(e), "response_text": e.response.text if hasattr(e, 'response') else None}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
def get_jobs(limit: int = 50, company_id: int = 1) -> list[dict]:
    """
    Fetch a list of jobs from SimPRO.
    This can be used to monitor jobs for accomplishment and status.
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/"
    params = {"pageSize": limit}
    return _make_simpro_request(endpoint, params)

@mcp.tool()
def get_job_details(job_id: int, company_id: int = 1) -> dict:
    """
    Fetch detailed information about a specific job, including its notes, status, and letters.
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/{job_id}"
    return _make_simpro_request(endpoint)

@mcp.tool()
def get_job_notes(job_id: int, company_id: int = 1) -> list[dict]:
    """
    Fetch logs and notes for a specific job to get context, such as L1, L2, or disputes.
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/{job_id}/notes/"
    return _make_simpro_request(endpoint)

@mcp.tool()
def get_invoices(limit: int = 50, company_id: int = 1) -> list[dict]:
    """
    Fetch invoices to check for due dates, aging, and payment status.
    """
    endpoint = f"/api/v1.0/companies/{company_id}/invoices/"
    params = {"pageSize": limit}
    return _make_simpro_request(endpoint, params)

@mcp.tool()
def get_customer_info(customer_id: int, company_id: int = 1) -> dict:
    """
    Fetch customer contact information if they are not yet paid and need to be reached out.
    """
    endpoint = f"/api/v1.0/companies/{company_id}/customers/{customer_id}"
    return _make_simpro_request(endpoint)

@mcp.tool()
def get_invoice_forms(company_id: int = 1) -> list[dict]:
    """
    Fetch the list of available invoice forms, including collection letters (L1, L2, etc.).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/invoices/forms/"
    return _make_simpro_request(endpoint)

@mcp.tool()
def get_collection_scripts(company_id: int = 1) -> list[dict]:
    """
    Fetch standard scripts and templates used for collections (courtesy reminders, overdue letters).
    """
    endpoint = f"/api/v1.0/setup/scripts/"
    return _make_simpro_request(endpoint)

@mcp.tool()
def search_simpro_endpoint(relative_url: str, query_params: str = "") -> dict:
    """
    A generic tool to search and test an arbitrary SimPRO endpoint (e.g., '/api/v1.0/companies/1/setup/').
    This is extremely useful for exploring the API structure to find L1/L2 templates.
    """
    import urllib.parse
    params = dict(urllib.parse.parse_qsl(query_params)) if query_params else None
    return _make_simpro_request(relative_url, params)

if __name__ == "__main__":
    # Start the MCP server
    mcp.run()
