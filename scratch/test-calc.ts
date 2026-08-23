import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function testCalc() {
  const nfeItens = await prisma.nFeCompraItem.findMany({
    where: { itemId: { not: null } },
    include: { nfeCompra: true }
  });

  console.log(`Found ${nfeItens.length} mapped items in NFE.`);

  if (nfeItens.length > 0) {
    const item = nfeItens[0];
    const v = Number(item.valorTotal?.toString() || 0);
    const q = Number(item.quantidade?.toString() || 0);
    console.log(`Item ${item.id}: valorTotal=${v}, quantidade=${q}`);
  }
}

testCalc().finally(() => prisma.$disconnect())
