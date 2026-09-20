import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/lib/server/prisma-client/client';

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
});

const survey = await prisma.survey.findFirst({
	where: { slug: 'cqsc' },
	select: {
		id: true,
		title: true,
		status: true,
		openformsSlug: true,
		_count: { select: { responses: true } },
		questions: {
			orderBy: { position: true ? 'asc' : 'asc' },
			select: { code: true, label: true, type: true, openformsKey: true }
		}
	}
});

console.log('enquete:', survey?.title, '| statut', survey?.status, '| id', survey?.id);
console.log('reponses deja en base:', survey?._count.responses);
console.log('questions:');
for (const q of survey?.questions ?? []) {
	console.log(`  ${q.code} (${q.type}) -> openformsKey = ${q.openformsKey ?? 'AUCUNE'} | ${q.label}`);
}

await prisma.$disconnect();
