# Exceção de Importação de NFe

Este documento descreve uma regra de negócio específica aplicada ao sistema de Importação de NFe.

## Descrição da Regra

A loja com o ID `66cb52b6-0ccb-4c97-9ab0-ed1515df1356` possui uma configuração especial no sistema e **não tem acesso** à funcionalidade de "Importação de NFe". Para esta loja específica, a opção de NFe é ocultada nos menus e as rotas são bloqueadas, redirecionando o usuário para o Dashboard.

## Arquivos Modificados

As seguintes alterações foram implementadas para garantir esse comportamento:

1. **Menus de Navegação**:
   - `components/NavRail.tsx`: Oculta a opção de menu lateral (Desktop) filtrando o item se o `activeLojaId` for igual ao da loja bloqueada.
   - `components/BottomNav.tsx`: Oculta a opção do menu inferior (Mobile) filtrando a lista de itens.
   - `components/MobileHeaderMenu.tsx`: Oculta a opção no menu lateral mobile ("Mais opções").

2. **Rotas Protegidas (Server-Side)**:
   - `app/(dashboard)/nfe-importacao/page.tsx`: Verifica a sessão do usuário e executa um `redirect("/dashboard")` caso o `activeLojaId` da sessão coincida com o da loja configurada.
   - `app/(dashboard)/nfe-importacao/[id]/page.tsx`: Bloqueia o acesso a detalhes específicos de uma NFe importada usando a mesma validação, prevenindo acesso direto pela URL.

## Motivação

Esta regra atende a requisitos operacionais e logísticos especiais específicos para a loja informada, impedindo o processamento e a importação de notas fiscais através deste ambiente.
