// Simple in-memory store for connected clients and messages
let connectedClients = new Map();
let messageQueue = [];
let clientIdCounter = 0;

export async function GET(request) {
  const url = new URL(request.url);
  const clientType = url.searchParams.get('type') || 'unknown';
  
  // Create a unique client ID
  const clientId = `${clientType}_${++clientIdCounter}_${Date.now()}`;
  
  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the client connection
      connectedClients.set(clientId, {
        controller,
        type: clientType,
        connectedAt: new Date()
      });

      // Send initial connection confirmation
      const data = `data: ${JSON.stringify({
        type: 'CONNECTED',
        clientId,
        message: `${clientType} connected successfully`
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      console.log(`${clientType} client connected:`, clientId);
      
      // Notify other clients about the connection
      broadcastToClients({
        type: clientType === 'mobile' ? 'MOBILE_CONNECTED' : 'WEB_CONNECTED',
        clientId
      }, clientId);

      // Send any queued messages for this client type
      const relevantMessages = messageQueue.filter(msg => 
        msg.targetType === clientType || msg.targetType === 'all'
      );
      
      relevantMessages.forEach(msg => {
        const data = `data: ${JSON.stringify(msg)}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      });
    },
    
    cancel() {
      // Client disconnected
      const client = connectedClients.get(clientId);
      if (client) {
        console.log(`${client.type} client disconnected:`, clientId);
        connectedClients.delete(clientId);
        
        // Notify other clients about the disconnection
        broadcastToClients({
          type: client.type === 'mobile' ? 'MOBILE_DISCONNECTED' : 'WEB_DISCONNECTED',
          clientId
        }, clientId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request) {
  try {
    const message = await request.json();
    const { targetType = 'all', ...messageData } = message;
    
    console.log('Broadcasting message:', messageData);
    
    // Add to message queue for any clients that connect later
    messageQueue.push({ ...messageData, targetType, timestamp: Date.now() });
    
    // Keep only the last 50 messages to prevent memory issues
    if (messageQueue.length > 50) {
      messageQueue = messageQueue.slice(-50);
    }
    
    // Broadcast to connected clients
    broadcastToClients(messageData, null, targetType);
    
    return new Response(JSON.stringify({ success: true, clientsNotified: connectedClients.size }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error handling POST message:', error);
    return new Response(JSON.stringify({ error: 'Failed to process message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function broadcastToClients(message, excludeClientId = null, targetType = 'all') {
  connectedClients.forEach((client, clientId) => {
    if (clientId === excludeClientId) return;
    
    // Filter by target type if specified
    if (targetType !== 'all' && client.type !== targetType) return;
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      // Remove dead client
      connectedClients.delete(clientId);
    }
  });
}