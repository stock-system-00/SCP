import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const items = await prisma.item.findMany({
    where: {
      createdAt: {
        gte: today
      }
    }
  })
  
  console.log(`Deletando ${items.length} itens criados hoje...`)
  
  let deletedCount = 0;
  for (const item of items) {
     await prisma.vendaItem.deleteMany({ where: { itemId: item.id } });
     await prisma.item.delete({ where: { id: item.id } });
     deletedCount++;
  }
  
  console.log(`Sucesso: ${deletedCount} itens excluídos.`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
