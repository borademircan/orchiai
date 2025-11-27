const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        // Get the most recent chat messages with agent names
        const messages = await prisma.chatMessage.findMany({
            where: {
                metadata: {
                    path: ['agentName'],
                    not: null
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 30,
            select: {
                id: true,
                role: true,
                content: true,
                metadata: true,
                createdAt: true
            }
        });

        console.log('=== RECENT AGENT MESSAGES ===\n');

        for (const msg of messages) {
            const agentName = msg.metadata?.agentName || 'Unknown';
            const summary = msg.metadata?.summary;
            const contentPreview = msg.content.substring(0, 200);
            const contentLength = msg.content.length;

            console.log(`\n--- ${agentName} (${msg.createdAt.toISOString()}) ---`);
            console.log(`Content Length: ${contentLength} chars`);
            console.log(`Has Summary: ${summary ? 'YES (' + summary.length + ' chars)' : 'NO'}`);
            console.log(`Content Preview: ${contentPreview}${contentLength > 200 ? '...' : ''}`);

            // Check if it looks like JSON
            if (msg.content.trim().startsWith('{')) {
                console.log(`⚠️  Looks like JSON response`);
            }

            // Check if empty
            if (msg.content.trim().length === 0) {
                console.log(`❌ EMPTY RESPONSE!`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
