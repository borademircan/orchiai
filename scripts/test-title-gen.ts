
import { prisma } from '@orchiai/database';
import chatService from '../packages/backend/src/services/ChatService';
import { MessageRole } from '@orchiai/shared';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    console.log('Starting title generation test...');

    if (!process.env.OPENAI_API_KEY) {
        console.error('ERROR: OPENAI_API_KEY is not set in environment variables');
        process.exit(1);
    } else {
        console.log('OPENAI_API_KEY is present');
    }

    try {
        // 1. Create a test agent if needed (or use existing)
        const agent = await prisma.agent.findFirst();
        if (!agent) {
            console.error('No agent found. Please seed the database first.');
            process.exit(1);
        }
        console.log(`Using agent: ${agent.name} (${agent.id})`);

        // 2. Create a new chat session
        const session = await chatService.createSession({
            agentId: agent.id,
            userId: 'test-user-123',
        });
        console.log(`Created session: ${session.id}`);

        // 3. Send a first message to trigger title generation
        const messageContent = "Hello, I need help planning a marketing campaign for a new coffee brand.";
        console.log(`Sending message: "${messageContent}"`);

        await chatService.createMessage({
            sessionId: session.id,
            role: MessageRole.USER,
            content: messageContent,
        });

        // 4. Fetch the session again to check the title
        const updatedSession = await chatService.getSession(session.id);
        console.log(`Session Title: "${updatedSession.title}"`);

        if (updatedSession.title && updatedSession.title !== messageContent) {
            console.log('SUCCESS: Title was generated and is different from the message content.');
        } else if (updatedSession.title === messageContent) {
            console.log('WARNING: Title is identical to message content (fallback might have triggered).');
        } else {
            console.error('FAILURE: No title was generated.');
        }

        // Cleanup
        await chatService.deleteSession(session.id);
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
