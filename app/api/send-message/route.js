export async function POST(request) {
  try {
    const message = await request.json();
    
    // Forward the message to the stream-events endpoint
    const eventsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stream-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!eventsResponse.ok) {
      throw new Error('Failed to broadcast message');
    }
    
    const result = await eventsResponse.json();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Message sent successfully',
      ...result 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send message',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}