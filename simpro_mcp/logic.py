import os
import requests
from typing import Optional, List, Dict, Any, Union
from dotenv import load_dotenv

load_dotenv()

# Configuration
SIMPRO_BASE_URL = os.getenv("SIMPRO_BASE_URL", "")
SIMPRO_ACCESS_TOKEN = os.getenv("SIMPRO_ACCESS_TOKEN", "")

def _make_simpro_request(endpoint: str, params: Optional[Dict[str, Any]] = None):
    """Helper function to make requests to the SimPRO API."""
    if not SIMPRO_BASE_URL or not SIMPRO_ACCESS_TOKEN:
         return {"error": "SimPRO credentials not configured"}
    
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

def get_jobs(limit: int = 50, company_id: int = 1):
    """
    Fetch a list of jobs from SimPRO.
    This can be used to monitor jobs for accomplishment and status.

    Args:
        limit: The maximum number of jobs to fetch (default: 50).
        company_id: The ID of the company to fetch from (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/"
    params = {"pageSize": limit}
    return _make_simpro_request(endpoint, params)

def get_job_details(job_id: int, company_id: int = 1):
    """
    Fetch detailed information about a specific job, including its notes, status, and letters.

    Args:
        job_id: The unique ID of the job to retrieve.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/{job_id}"
    return _make_simpro_request(endpoint)

def get_job_timelines(job_id: int, company_id: int = 1):
    """
    Fetch the comprehensive timeline entries for a specific job.

    Args:
        job_id: The unique ID of the job.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/{job_id}/timelines/"
    return _make_simpro_request(endpoint)

def get_job_notes(job_id: int, company_id: int = 1):
    """
    Fetch the activity/log notes for a specific job.

    Args:
        job_id: The unique ID of the job.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/jobs/{job_id}/notes/"
    return _make_simpro_request(endpoint)

def get_invoices(limit: int = 50, company_id: int = 1):
    """
    Fetch invoices to check for due dates, aging, and payment status.
    Includes OrderNo and PaymentTerms for better tracking.

    Args:
        limit: The number of invoices to return (default: 50).
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/invoices/"
    params = {
        "pageSize": limit,
        "columns": "ID,Type,Customer,Jobs,Total,IsPaid,DateIssued,PaymentTerms,Period,OrderNo"
    }
    return _make_simpro_request(endpoint, params)

def get_invoice_details(invoice_id: int, company_id: int = 1):
    """
    Fetch comprehensive information about an invoice, including line items/computation,
    salesperson, quote number, and contact details.

    Args:
        invoice_id: The ID of the invoice.
        company_id: The ID of the company (default: 1).
    """
    invoice_endpoint = f"/api/v1.0/companies/{company_id}/invoices/{invoice_id}"
    invoice = _make_simpro_request(invoice_endpoint)
    
    if isinstance(invoice, dict) and 'ID' in invoice:
        if invoice.get('Jobs'):
            try:
                job_id = invoice['Jobs'][0]['ID']
                job_res = _make_simpro_request(f"/api/v1.0/companies/{company_id}/jobs/{job_id}")
                if isinstance(job_res, dict):
                    invoice['Salesperson'] = job_res.get('Salesperson', {}).get('Name', 'N/A')
                    invoice['QuoteNo'] = job_res.get('Quote', {}).get('ID', 'N/A')
                    invoice['JobNo'] = job_id
            except Exception:
                pass

        try:
            cc_res = _make_simpro_request(f"{invoice_endpoint}/costCenters/")
            if isinstance(cc_res, list):
                detailed_sections = []
                for cc in cc_res:
                    cc_id = cc['ID']
                    items_res = _make_simpro_request(f"{invoice_endpoint}/costCenters/{cc_id}/items/")
                    detailed_sections.append({
                        "Name": cc.get('Name', 'Standard Section'),
                        "Items": items_res if isinstance(items_res, list) else []
                    })
                invoice['Sections'] = detailed_sections
        except Exception:
            pass
    return invoice

def get_invoice_logs(invoice_id: int, company_id: int = 1):
    """
    Fetch the activity/log entries (notes) for a specific invoice.

    Args:
        invoice_id: The ID of the invoice.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/invoices/{invoice_id}/notes/"
    return _make_simpro_request(endpoint)

def get_customer_invoices(customer_id: int, company_id: int = 1, page: int = 1, limit: int = 20):
    """
    Fetch all invoices for a customer, useful for seeing their payment history.

    Args:
        customer_id: The ID of the customer.
        company_id: The ID of the company (default: 1).
        page: The page number for pagination (default: 1).
        limit: The number of results per page (default: 20).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/customers/{customer_id}/invoices/"
    params = {"page": page, "pageSize": limit, "columns": "ID,DateIssued,Total,IsPaid,PaymentTerms"}
    return _make_simpro_request(endpoint, params)

def get_customer_info(customer_id: int, company_id: int = 1):
    """
    Fetch comprehensive customer information including main phone, email, and Payment Terms.

    Args:
        customer_id: The ID of the customer.
        company_id: The ID of the company (default: 1).
    """
    res = _make_simpro_request(f"/api/v1.0/companies/{company_id}/customers/companies/{customer_id}")
    if isinstance(res, dict) and 'ID' in res:
        return res
    return _make_simpro_request(f"/api/v1.0/companies/{company_id}/customers/individuals/{customer_id}")

def get_payment_terms(company_id: int = 1):
    """
    Fetch the list of standard payment terms configured in SimPRO setup.

    Args:
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/setup/accounts/paymentTerms/"
    return _make_simpro_request(endpoint)

def get_invoice_forms(company_id: int = 1):
    """
    Fetch the list of available invoice forms, including collection letters (L1, L2, etc.).

    Args:
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/invoices/forms/"
    return _make_simpro_request(endpoint)

def get_collection_scripts(company_id: int = 1):
    """
    Fetch standard scripts and templates used for collections (courtesy reminders, overdue letters).

    Args:
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/setup/scripts/"
    return _make_simpro_request(endpoint)

def get_late_payment_settings(company_id: int = 1):
    """
    Fetch the Late Payment settings from SimPRO setup.

    Args:
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/setup/accounts/latePayment/"
    return _make_simpro_request(endpoint)

def get_companies():
    """
    Fetch the list of all available companies in this SimPRO instance.
    This tool takes no arguments.
    """
    endpoint = "/api/v1.0/companies/"
    return _make_simpro_request(endpoint)

def get_customer_contacts(customer_id: int, company_id: int = 1):
    """
    Fetch all contacts associated with a customer company.

    Args:
        customer_id: The unique customer ID.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/customers/{customer_id}/contacts/"
    return _make_simpro_request(endpoint)

def get_site_details(site_id: int, company_id: int = 1):
    """
    Fetch the main address and phone/email details for a site.

    Args:
        site_id: The unique ID of the site.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/sites/{site_id}"
    return _make_simpro_request(endpoint)

def get_site_contacts(site_id: int, company_id: int = 1):
    """
    Fetch specific personnel linked to a physical site location.

    Args:
        site_id: The unique site ID.
        company_id: The ID of the company (default: 1).
    """
    endpoint = f"/api/v1.0/companies/{company_id}/sites/{site_id}/contacts/"
    return _make_simpro_request(endpoint)

def search_simpro_endpoint(relative_url: str, query_params: str = ""):
    """
    A generic tool to search and test an arbitrary SimPRO endpoint.

    Args:
        relative_url: The relative URL path (e.g. '/api/v1.0/companies/1/setup/').
        query_params: URL-encoded query string (e.g. 'page=1&pageSize=10').
    """
    import urllib.parse
    params = None
    if isinstance(query_params, str) and query_params:
        params = dict(urllib.parse.parse_qsl(query_params))
    return _make_simpro_request(relative_url, params)
