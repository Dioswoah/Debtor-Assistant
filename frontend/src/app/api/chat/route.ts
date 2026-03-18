import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, companyId, companyName, sessionId: clientSessionId } = await req.json();
    const sessionId = clientSessionId || `session-${companyId || '1'}-${Date.now()}`; // unique session per company AND instance
    const userId = "user1";

    const enhancedMessage = `[System Context: Current Company is ${companyName || 'Unknown'} (ID: ${companyId || '1'})] ${message}`;

    // 1. Ensure the ADK session is created
    console.log(`Connecting to ADK at 127.0.0.1:8000 for session: ${sessionId}`);
    try {
      const sessionRes = await fetch(`http://127.0.0.1:8000/apps/chatbot_adk/users/${userId}/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (!sessionRes.ok) {
        console.warn(`ADK Session Creation Status: ${sessionRes.status}`);
      }
    } catch (e: any) {
      console.error("ADK Session Creation Failed (Fetch Error):", e.message);
    }

    // 2. Query the ADK Agent
    const adkPayload = {
      appName: "chatbot_adk",
      userId: userId,
      sessionId: sessionId,
      newMessage: {
        role: "user",
        parts: [{ text: enhancedMessage }]
      }
    };

    const response = await fetch("http://127.0.0.1:8000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adkPayload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`ADK Server Error (${response.status}):`, errBody);
      throw new Error(`ADK Server returned ${response.status}: ${errBody}`);
    }

    const events = await response.json();
    console.log("ADK Response Events:", JSON.stringify(events, null, 2));
    
    // Parse the ADK streaming/response events
    // ADK returns an array of model responses.
    let replyText = "I received no response from the server.";
    if (events && events.length > 0) {
      // Find the last model response message
      const lastEvent = events[events.length - 1];
      if (lastEvent?.content?.parts && lastEvent.content.parts.length > 0) {
        replyText = lastEvent.content.parts.map((p: any) => p.text || JSON.stringify(p)).join('\n');
      }
    }

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { reply: "I encountered an error connecting to my local ADK server. Please ensure the ADK server is running (adk web --port 8000)." },
      { status: 500 }
    );
  }
}
