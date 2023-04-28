//This will delete literally all bot posts, do not run this unless you have a good reason, if you need to delete one bots posts edit it to target that one bot
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// async function deleteAllBotposts() {
//     await prisma.botPost.deleteMany();
//     console.log('All Botposts deleted successfully');
// }

// deleteAllBotposts()
//     .catch((e) => {
//         console.error(e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });