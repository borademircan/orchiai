
async function main() {
    const API_URL = 'http://localhost:3001/api/v1';
    console.log(`Testing API at ${API_URL}`);

    try {
        // 1. Get an agent
        console.log('Fetching agents...');
        const agentsRes = await fetch(`${API_URL}/agents`);
        if (!agentsRes.ok) throw new Error(`Failed to fetch agents: ${agentsRes.statusText}`);
        const agentsData = await agentsRes.json();
        const agent = agentsData.data[0];

        if (!agent) {
            console.error('No agents found. Please seed the database.');
            process.exit(1);
        }
        console.log(`Using agent: ${agent.name} (${agent.id})`);

        // 2. Create a session
        console.log('Creating session...');
        const sessionRes = await fetch(`${API_URL}/chat/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agent.id, userId: 'test-user-api' }),
        });
        if (!sessionRes.ok) throw new Error(`Failed to create session: ${sessionRes.statusText}`);
        const sessionData = await sessionRes.json();
        const sessionId = sessionData.data.id;
        console.log(`Created session: ${sessionId}`);

        // 3. Send a message
        const messageContent = "Can you help me design a logo for a futuristic tech company?";
        console.log(`Sending message: "${messageContent}"`);
        const messageRes = await fetch(`${API_URL}/chat/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                role: 'USER',
                content: messageContent,
            }),
        });
        if (!messageRes.ok) {
            const errorBody = await messageRes.text();
            throw new Error(`Failed to create message: ${messageRes.statusText} - ${errorBody}`);
        }
        console.log('Message sent.');

        // 4. Check title
        console.log('Checking session title...');
        // Wait a bit for async processing if any (though it seems synchronous in code)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const updatedSessionRes = await fetch(`${API_URL}/chat/sessions/${sessionId}`);
        if (!updatedSessionRes.ok) throw new Error(`Failed to fetch session: ${updatedSessionRes.statusText}`);
        const updatedSessionData = await updatedSessionRes.json();
        const title = updatedSessionData.data.title;

        console.log(`Session Title: "${title}"`);

        if (title && title !== messageContent) {
            console.log('SUCCESS: Title was generated and is different from the message content.');
        } else if (title === messageContent) {
            console.log('WARNING: Title is identical to message content (fallback might have triggered).');
        } else {
            console.error('FAILURE: No title was generated.');
        }

        // Cleanup
        console.log('Cleaning up...');
        await fetch(`${API_URL}/chat/sessions/${sessionId}`, { method: 'DELETE' });
        console.log('Session deleted.');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

main();
