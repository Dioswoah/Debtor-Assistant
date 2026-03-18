import sys
import os
from dotenv import load_dotenv

ROOT = r'c:\Users\marcr\Desktop\Debtor'
CHABOT_DIR = os.path.join(ROOT, 'chatbot_adk')
SIMPRO_MCP_PATH = os.path.join(ROOT, 'simpro_mcp')

if SIMPRO_MCP_PATH not in sys.path:
    sys.path.insert(0, SIMPRO_MCP_PATH)

# Load env
try:
    load_dotenv(dotenv_path=os.path.join(CHABOT_DIR, '.env'), override=True)
except:
    pass
load_dotenv(dotenv_path=os.path.join(SIMPRO_MCP_PATH, '.env'), override=False)

# CLEAN ENV FOR AI STUDIO
gcp_vars = [
    'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT_ID', 'GCP_LOCATION', 
    'PROJECT_ID', 'REGION', 'VERTEX_RAG_CORPUS_ID',
    'GOOGLE_APPLICATION_CREDENTIALS', 'CLOUD_SDK_CONFIG'
]
for var in gcp_vars:
    if var in os.environ:
        os.environ.pop(var, None)

# Ensure ALL variations of the API key are set for LiteLLM/ADK
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
if api_key:
    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ["GEMINI_API_KEY"] = api_key
    os.environ["GOOGLE_GENERATIVE_AI_API_KEY"] = api_key

import logic
from google.adk.agents.llm_agent import Agent

# Define the agent with the standard Gemini name
root_agent = Agent(
    model='gemini-2.5-flash', 
    name='Debtor_Assistant',
    instruction='''You are the Debtor Agent, a high-level financial assistant for SimPRO.
    Your mission is to provide complete visibility into debtors, invoices, and payment behavior.
    
    CAPABILITIES:
    - INVOICES: You can fetch all invoices and check balance due, due dates, and payment status using `get_invoices`.
    - HISTORY: Use `get_invoice_logs` to see the full audit trail (notes) of an invoice. Use `get_customer_invoices` for a customer's payment track record.
    - CUSTOMERS: Retrieve phone, email, and specific Payment Terms using `get_customer_info`.
    - CONTACTS: For company staff, use `get_customer_contacts`. For on-site personnel, use `get_site_contacts`.
    - JOBS: Check job status, salesperson, and job notes using `get_job_details` and `get_job_notes`.
    - STRATEGY: Use `get_collection_scripts` and `get_late_payment_settings` to recommend the best way to contact a debtor.
    
    CRITICAL RULES:
    1. You MUST use the `company_id` provided in the "[System Context: ...]" of the message for all tool calls.
    2. NEVER say you can't find something without trying the relevant search or list tool first.
    3. Always give detailed, professional, and actionable financial insights.
    4. If asked generic questions, summarize current outstanding balances using `get_invoices`.''',
    tools=[
        logic.get_jobs, 
        logic.get_job_details, 
        logic.get_job_notes, 
        logic.get_invoices, 
        logic.get_invoice_details,
        logic.get_invoice_logs,
        logic.get_customer_invoices,
        logic.get_customer_info, 
        logic.get_customer_contacts,
        logic.get_site_details,
        logic.get_site_contacts,
        logic.get_invoice_forms, 
        logic.get_collection_scripts,
        logic.get_payment_terms,
        logic.get_late_payment_settings,
        logic.get_companies,
        logic.search_simpro_endpoint
    ],
)
