import sys
import os
from dotenv import load_dotenv

# Add simpro_mcp to path and load env
sys.path.append(r'c:\Users\marcr\Desktop\Debtor\simpro_mcp')
load_dotenv(dotenv_path=r'c:\Users\marcr\Desktop\Debtor\simpro_mcp\.env')

from server import get_jobs, get_job_details, get_job_notes, get_invoices, get_customer_info, search_simpro_endpoint, get_invoice_forms, get_collection_scripts
from google.adk.agents.llm_agent import Agent

root_agent = Agent(
    model='gemini-2.5-flash',
    name='Debtor Assistant',
    description="An AI Collections Dashboard Agent that assists with Debtors by interacting with the SimPRO CRM.",
    instruction="""You are the RISA Debtor AI Triage Agent running on a Collections Dashboard.
Your job is to assist the Debtor team with their collections process. 
You must proactively query SimPRO using your tools to fetch data about jobs, customers, and invoices.
Use the get_invoice_forms and get_collection_scripts tools to find L1, L2, and other collection templates.
You should be helpful, concise, and structured.
Answer questions concisely but with professional courtesy.""",
    tools=[get_jobs, get_job_details, get_job_notes, get_invoices, get_customer_info, search_simpro_endpoint, get_invoice_forms, get_collection_scripts],
)
