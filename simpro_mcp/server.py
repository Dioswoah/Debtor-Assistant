import os
from mcp.server.fastmcp import FastMCP
from logic import (
    get_jobs, 
    get_job_details, 
    get_job_timelines, 
    get_invoices, 
    get_customer_info, 
    get_invoice_forms, 
    get_collection_scripts, 
    get_late_payment_settings, 
    search_simpro_endpoint,
    get_companies,
    get_invoice_details
)
from dotenv import load_dotenv

# Ensure environment variables are loaded if running as standalone server
load_dotenv()

# Initialize FastMCP Server
mcp = FastMCP("SimPRO Services MCP")

# Register tools by wrapping the logic functions
mcp.tool()(get_jobs)
mcp.tool()(get_job_details)
mcp.tool()(get_job_timelines)
mcp.tool()(get_invoices)
mcp.tool()(get_customer_info)
mcp.tool()(get_invoice_forms)
mcp.tool()(get_collection_scripts)
mcp.tool()(get_late_payment_settings)
mcp.tool()(search_simpro_endpoint)
mcp.tool()(get_companies)
mcp.tool()(get_invoice_details)

if __name__ == "__main__":
    # When running locally, this starts a Stdio-based server.
    # It can be used by an AI agent or debugging tools.
    mcp.run()
