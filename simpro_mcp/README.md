# SimPRO Data Fetcher - MCP Server

This is a Python-based [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server using `fastmcp` to fetch data from your SimPRO instance. It serves as the "muscle" for your AI automation or Chatbot, allowing it to interact directly with SimPRO through the defined local endpoints.

## 📁 Project Structure

*   `server.py`: The main MCP server file containing all defined tools (Jobs, Invoices, Notes, Customers).
*   `.env`: Local environment variables (SimPRO keys).
*   `test.py`: A simple testing script to verify the connection and endpoints without needing an AI agent.
*   `venv/`: The local Python virtual environment.

## 🛠 Prerequisites & Installation

Since you've run this locally, the virtual environment is already set up. If you are starting fresh:

```powershell
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\activate

# 3. Install dependencies
pip install mcp requests python-dotenv
```

## 🔐 Configuration

Ensure the `.env` file exists with your `SIMPRO_BASE_URL` and `SIMPRO_ACCESS_TOKEN`. No GCP or other database keys are used here as we are focusing strictly on Local SimPRO endpoints.

## 🚀 Running the MCP Server locally

During the future development of your Google Vertex AI Chatbot agent, you can configure it to connect to this MCP Server by running:

```powershell
python server.py
```
*(By default, this will run and communicate through Stdio, which is how MCP servers are integrated with most AI frameworks and Chat UIs like Cursor or the MCP Inspector).*

## 🧪 Testing the SimPRO Connection

To quickly run queries and test exactly what your SimPRO returns before tying it to an AI:

```powershell
.\venv\Scripts\activate
python test.py
```

## 🛠 Available Tools (AI Actions)

The AI agent will automatically have access to these predefined actions:

1.  `get_jobs(limit, company_id)`
2.  `get_job_details(job_id, company_id)`
3.  `get_job_notes(job_id, company_id)`
4.  `get_invoices(limit, company_id)`
5.  `get_customer_info(customer_id, company_id)`
6.  `search_simpro_endpoint(relative_url, query_params)` — A generic fallback the AI can use to explore any endpoint dynamically.

## 💡 Next Steps (Cloud Run)

For now, this server runs **locally**. When you are ready to deploy to GCP Cloud Run, you can extend the `server.py` to optionally expose a REST server (using FastAPI or FastMCP's SSE deployment tools) instead of Stdio, so your Chatbot agent in the cloud can reach the webhook over HTTPS.
