const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        // Check agent configurations for the empty-response agents
        const agents = await prisma.agent.findMany({
            where: {
                name: {
                    in: ['MarketValidationAgent', 'RiskAgent', 'BusinessModelAgent']
                }
            },
            include: {
                model: true
            }
        });

        console.log('=== AGENTS WITH EMPTY RESPONSES ===\n');

        for (const agent of agents) {
            console.log(`\n--- ${agent.name} ---`);
            console.log(`ID: ${agent.id}`);
            console.log(`Model: ${agent.model?.name || 'No model'} (${agent.model?.modelId || 'N/A'})`);
            console.log(`Is Active: ${agent.isActive}`);
            console.log(`Instructions Length: ${agent.instructions.length} chars`);
            console.log(`Instructions Preview: ${agent.instructions.substring(0, 200)}...`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
