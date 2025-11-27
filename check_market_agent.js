const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        // Get the most recent messages from MarketValidationAgent in Flow Mode
        const messages = await prisma.chatMessage.findMany({
            where: {
                metadata: {
                    path: ['agentName'],
                    equals: 'MarketValidationAgent'
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5,
            select: {
                id: true,
                role: true,
                content: true,
                metadata: true,
                createdAt: true,
                session: {
                    select: {
                        orchestrationMode: true
                    }
                }
            }
        });

        console.log('=== MarketValidationAgent Messages ===\n');

        for (const msg of messages) {
            console.log(`\n--- ${msg.createdAt.toISOString()} ---`);
            console.log(`Mode: ${msg.session.orchestrationMode}`);
            console.log(`Content Length: ${msg.content.length} chars`);
            console.log(`Metadata:`, JSON.stringify(msg.metadata, null, 2));
            console.log(`Content: ${msg.content.substring(0, 500)}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
