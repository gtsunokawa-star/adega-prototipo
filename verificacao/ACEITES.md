# Verificação da entrega

Referência: briefing v5, com D50 (marcas e fotos reais) e D51 (publicação no GitHub). Execuções em 25/09/2026, Chrome instalado no Windows, localidade pt-BR e fuso America/Sao_Paulo.

## Resultados

- **28/28 testes de cálculo e dados**: 22 do motor e 6 do gerador.
- **11/11 fluxos completos no navegador**: primeiro acesso; comanda e desfazer; venda rápida e cancelamento; compra; contagem; filtros; personalização e PIN; exportar/restaurar/importar; cadastros próprios; celular; arquivo local offline.
- **4/4 fluxos adicionais**: fotos nos dois perfis e teclado; roteiro e link personalizado; avanço de 21 dias e isolamento dos perfis; recuperação física após abertura automática de uma garrafa.
- **18/18 verificações de layout**: seis áreas em 360, 768 e 1440 px, sem erro de JavaScript ou rolagem horizontal da página.
- Inspeção das capturas do Painel, Balcão e Estoque; correção do tamanho dos valores no celular e do posicionamento das fotos.

Os resultados estruturados estão em browser-flows.json, browser-extra.json e browser-smoke.json. As capturas e exportações usadas nos testes permanecem locais. Os testes usam contextos de navegador isolados e não alteram os dados de uso do usuário.

## Critérios do briefing

| Nº | Verificação e evidência |
|---|---|
| 1 | Arquivo local e servidor estático: fluxos e ausência de erros; recursos externos bloqueados confirmam tabelas e fotos offline. O endereço público é conferido após o envio. |
| 2 | Comanda real pela UI: Kit Ballantine’s + 2 Copões de Smirnoff, R$ 183, cartão R$ 6,41, Balcão 2; componentes e estoque conferidos; desfazer repõe o saldo. |
| 3 | Motor: travessia de garrafas, reserva de lacradas e ruptura integral sem alteração parcial. |
| 4 | UI: quatro períodos, balcão, estoque compartilhado e contador independente; valores da demo crescem com o intervalo. |
| 5 | Motor e gerador conciliam itens, componentes, receita, custo, margem e taxas; KPI de bebida confrontado com o relatório. |
| 6 | Motor: exemplo exato de custo médio ponderado; compra pela UI também confere o resultado. |
| 7 | Motor: falta/sobra, histórico e recontagem; UI: destilado, insumo, item pulado, motivo, revisão e confirmação. |
| 8 | Motor: alterações de preço, ficha, combo, custo, dose e inativação preservam snapshots e relatórios anteriores. Formulários de cadastro exercitados na UI. |
| 9 | UI: destaques, seleção, hash e carrossel por teclado; layout com rolagem própria e controles. Fotos carregadas em todos os destilados. |
| 10 | UI: prévias de custo/margem de drink e combo; ficha vazia rejeitada. Preço positivo validado no formulário e motor. |
| 11 | UI: nome/cor, link, recarga, troca de perfil e perfil vazio com novos cadastros e venda. |
| 12 | UI: Balcão e Estoque sem custo, margem, taxas, compras ou abertura manual; modo preservado ao recarregar; PIN incorreto rejeitado. |
| 13 | UI: exportação confrontada com o estado; fechar restauração não muda nada; restaurar e importar recupera exatamente o estado e datas. Importação adulterada é rejeitada. |
| 14 | Seis áreas nas três larguras: 18 verificações sem transbordamento da página. Tabelas e carrosséis usam rolagem interna. |
| 15 | Atualizado pela D50: marcas e fotografias reais com fontes documentadas; números e receitas demonstrativos. Sem cobrança, sensor ou integração real. |
| 16 | UI: venda rápida, espera de 5 s, cancelamento com motivo, consumo mantido e taxa devolvida. Motor cobre duplicação, compra posterior e estorno de venda antiga. |
| 17 | Motor: 02h, 05h59, 06h e viradas de mês/ano. UI: balcão de registro não muda o contador geral do dia; histórico mostra o horário real. |
| 18 | UI: primeiro acesso, dispensa persistida, retomada do roteiro e ausência no modo Balcão. |
| 19 | UI: fornecedor e destilado com 2 fechadas + 500 ml, custo R$ 60; saldo inicial sem venda/compra. Motor cobre custo ausente e bloqueio de edição direta de saldo. |
| 20 | Motor: uma fechada não atende simultaneamente garrafa e dose, inclusive dentro de combo. |
| 21 | UI: filtro de relatórios não altera balcão de registro; opção Todos ausente no registro. Motor preserva os preços avulsos históricos do combo. |
| 22 | Motor: devolução já incorporada por contagem não entra duas vezes; consumo recente, saldo zero e item novo tratados. UI adicional confere distribuição física após abertura automática. |
| 23 | Motor: taxa original mantida ou devolvida uma vez, percentual posterior e outro mês. UI confere rótulos separados e devolução efetiva. |
| 24 | Motor: ranking em reais vence porcentagem maior; UI usa esse ranking nos destaques, carrossel e resumo. |
| 25 | UI: avanço de 21 dias sem adicionar movimentos; aviso discreto; restauração explícita preserva identidade e outro perfil. Fluxo principal confirma preservação do PIN e importação original. |

## Reprodução

1. Cálculos e gerador: node --test verificacao/engine.test.cjs verificacao/demo.test.cjs
2. Montagem: node verificacao/build.cjs
3. Dependência de QA: npm ci --prefix verificacao
4. Servidor local: node verificacao/server.cjs
5. Navegador: node verificacao/browser-flows.cjs; node verificacao/browser-extra.cjs; node verificacao/browser-smoke.cjs

O HTML entregue não precisa de Node, build ou servidor para uso local. Chart.js e fontes são opcionais; sem rede, gráficos viram tabelas. Este registro não equivale a uma certificação formal de acessibilidade nem a homologação para operação financeira real.
