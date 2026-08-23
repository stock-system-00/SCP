import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugCustos() {
  const items = await prisma.item.findMany({
    where: {
      nfeCompraItens: { some: {} }
    },
    include: {
      nfeCompraItens: true
    },
    take: 5
  });

  for (const item of items) {
    console.log(`Item ${item.nome} (${item.id}):`)
    console.log(`  custo: ${item.custo}, custoMedio: ${item.custoMedio}`)
    let somaValores = 0;
    let somaQuantidades = 0;
    for (const nfeItem of item.nfeCompraItens) {
      console.log(`    NFeItem: valorTotal=${nfeItem.valorTotal}, quantidade=${nfeItem.quantidade}, valorUnitario=${nfeItem.valorUnitario}`)
      somaValores += Number(nfeItem.valorTotal || 0);
      somaQuantidades += Number(nfeItem.quantidade || 0);
    }
    console.log(`  Calculado: ${somaQuantidades > 0 ? somaValores / somaQuantidades : 0}`)
    console.log('---')
  }
}

debugCustos().finally(() => prisma.$disconnect())
