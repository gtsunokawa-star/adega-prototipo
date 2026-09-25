# Briefing para o Codex — Protótipo "AdegaControl" (v5 — marcas reais e publicação)

> **Para o usuário:** as decisões da seção 0 estão consolidadas. ✅ = padrão adotado; ⚠️ = escolha com implicações relevantes, já aprovada. Para mudar uma decisão futuramente, edite a coluna "Padrão".
>
> **Para o Codex:** esta versão incorpora a sua auditoria (AUDITORIA-CODEX.md) e as respostas do dono do produto. As decisões da seção 0 são finais: siga-as sem reabrir.
>
> **Estado:** construção autorizada e implementada. Em 25/09/2026, o usuário pediu fotos reais e marcas comuns em adegas/copões (D50) e publicação direta no GitHub (D51). Essas instruções substituem a antiga restrição a marcas e garrafas genéricas.

---

## 0. Decisões

### Produto e operação
| # | Pergunta | Padrão adotado |
|---|----------|----------------|
| D1 | Garrafa fechada para levar | ✅ Sim, se houver `precoGarrafa`; sem preço, a opção some. Exige 1 garrafa **fechada**. |
| D2 | Custo | ✅ **Custo = valor pago ao fornecedor** na compra (com o nome do fornecedor registrado). Toda margem e despesa de mercadoria parte desse valor, via custo médio ponderado. |
| D3 | Dose | ✅ Medida única por adega (30/40/50 ml, padrão 50), igual à do dosador. |
| D4 | Formato | ✅ HTML único, GitHub Pages. |
| D5 | Registro de venda | ✅ **Comanda rápida:** toca nos itens (drinks, doses, garrafas, combos, unidades), escolhe a forma de pagamento (**Pix · Dinheiro · Cartão**), e isso finaliza a venda. Atalho: com 1 item só, o toque longo ou o botão "Vender já" abre direto a escolha do pagamento. |
| D6 | Drinks | ✅ Ficha técnica com insumos de unidade explícita: energético (lata), gelo (kg, fração), limão (un), açúcar (kg). |
| D7 | Vazamento | ✅ Destaque do produto, com a conciliação da seção 3. |
| D8 | Estoque | ✅ Destilados (ml) + insumos/itens por unidade. Tabacaria fora. |
| D9 | Modos | ✅ **Balcão:** vende e consulta o estoque (sem custos, compras nem abertura manual). **Dono:** tudo. PIN "1234". |
| D10 | Maquininha | ✅ Sem integração. A forma de pagamento é escolhida à mão. Nada na UI promete integração. No README, "Sugestões": avaliar integração com adquirentes que tenham API. |
| D11 | Perfis | ✅ "Adega de Bairro" e "Adega Premium", mesmo motor. Construir e validar Bairro primeiro. |
| D12 | Aparelho | ✅ Mobile-first; tablet e desktop. |
| D13 | Persistência | ✅ localStorage separado por perfil; data-base persistida. |
| D14 | Nome | ✅ "AdegaControl", numa constante. |
| D15 | Banner | ✅ "Plano Parceiro: suporte mensal + 1 dosador giratório profissional por balcão (fidelidade de 12 meses)". Sem preço. |
| D16 | Dosador eletrônico? | ✅ Não. Nada sugere sensor/automação. |

### Da auditoria do Codex
| # | Pergunta | Padrão adotado |
|---|----------|----------------|
| D17 | "Lucro" | ✅ "**Margem bruta**" = preço de venda − custo de fornecedor dos insumos. **Taxas de cartão** em linha separada, e daí sai a "**Margem após taxas**". Perdas (vazamento) também em linha separada, nunca misturadas. Tooltip: "não inclui aluguel, salários e outras despesas". |
| D18 | Resultado por item × por bebida | ✅ Os dois. **Por item vendido** (drink, dose, garrafa, combo, unidade), sem rateio. **Por bebida** (painel e carrossel, seção 4.3) via rateio da D37. |
| D19 ⚠️ | Destaque do vazamento | ✅ Principal: "R$ X em doses que deixaram de ser vendidas (estimativa)". Abaixo: "custo do estoque faltante: R$ Y". |
| D20 | Contagem | ✅ Gera ajuste e vira a nova referência. Falta e sobra separadas. "Sem contagem" ≠ zero perda. Diferença datada na data da contagem. |
| D21 | "−1 dose" | ✅ Vira "Vender dose", a mesma operação do Balcão. |
| D22 | Abrir garrafa | ✅ Uma aberta por produto. Abertura automática quando precisa. O botão manual só aparece com a aberta vazia. |
| D23 ⚠️ | Períodos | ✅ Mês atual = dia 1 até o instante atual. Trimestre/Semestre/Anual = últimos 3/6/12 meses corridos. Datas visíveis, pela convenção de dia operacional da D42. |
| D25 | Troca de perfil / restaurar | ✅ Personalização preservada. "Restaurar demo" substitui os dados operacionais do perfil atual por uma demo coerente atualizada, conforme D49; o modal explicita que isso apaga testes e cadastros operacionais personalizados. O checkbox "também apagar personalização" vem desmarcado. |
| D26 ⚠️ | Internet | ✅ Sem Tailwind (CSS próprio). Chart.js via CDN; se falhar, os gráficos viram tabelas. Fontes do Google têm fallback de sistema. |

### Respostas do dono do produto
| # | Pergunta | Padrão adotado |
|---|----------|----------------|
| D24 | Quem cadastra | ✅ **O dono**, pelo app. CRUD completo de destilados, insumos, drinks (editor de ficha técnica), combos, fornecedores e preços. Excluir = **inativar** quando houver histórico. Validações: a ficha precisa de ≥ 1 componente e o preço tem que ser > 0. A demo vem pré-populada. Botão "Começar do zero" em Ajustes cria um perfil vazio para o dono testar com os dados dele. |
| D27 | Fiado | ✅ Fora. O público-alvo não vende fiado. |
| D28 | Pagamento | ✅ Pix, Dinheiro, Cartão. Taxa por forma configurável em Ajustes (padrão Pix 0%, Dinheiro 0%, Cartão 3,5%). Relatório de mix de pagamento + total de taxas. |
| D29 | Resumo WhatsApp | ✅ "Copiar resumo" do dia/período: faturamento, margem bruta, margem após taxas, mix de pagamento, top 3 bebidas, bebida pior, alertas de reposição, vazamento da última contagem. |
| D30 | Link personalizado | ✅ `?adega=Nome&cor=%23d4a017&perfil=bairro`. (Se o projeto for fechado, o front com a cara da adega é um trabalho à parte, fora deste protótipo.) |
| D31 | Simulador de dose excessiva | ✅ Sim, na aba Vazamento; hipóteses visíveis, sem promessa. |
| D32 | "Como chegamos a este número?" | ✅ Sim, em cada KPI e no card de vazamento. |
| D33 | Motivo da diferença | ✅ Seletor opcional: quebra, cortesia, erro de registro, não identificado. |
| D34 | Sugestão de compra | ✅ Consumo médio diário (30 d) × 14 d − estoque, arredondada para cima. Agrupada por fornecedor na "Lista de compras". |
| D35 | Exportar/importar | ✅ JSON do perfil atual. |
| D36 | Roteiro de demo | ✅ No README, roteiro de 3 min (ver seção 9). |
| D37 ⚠️ | Rateio para o resultado por bebida | ✅ A receita e a margem de cada drink/combo são distribuídas entre os componentes **proporcionalmente ao custo de cada componente** naquela venda. Doses e garrafas vão 100% para a bebida. Assim, soma(bebidas) + soma(insumos) = total. Sempre rotulado "inclui participação em drinks e combos", com o detalhe no "Como chegamos". |
| D38 | Combos | ✅ Sim. O combo é um pacote com preço fechado, formado por drinks, doses, garrafas e unidades. Relatório mostra o "desconto concedido" (preço separado − preço do combo). Exemplos na seção 5. |
| D39 | Balcões | ✅ 1 ou 2 balcões (configurável, padrão 1; a demo do perfil Bairro vem com 2). A venda registra o balcão. O **estoque é único** para a adega. Relatórios filtram por "Todos / Balcão 1 / Balcão 2". O vazamento é por adega (o estoque é compartilhado). |
| D40 | Cadastro assistido (upsell) | ✅ Card discreto em Ajustes: "Prefere que a gente cadastre tudo para você? Fale com seu consultor." Sem preço, sem formulário. |

### Refinamento v4 — respostas confirmadas
| # | Pergunta | Padrão adotado |
|---|----------|----------------|
| D41 | Correção depois dos 5 segundos de "Desfazer" | ✅ **Somente o Dono pode cancelar a venda**, com motivo obrigatório e histórico preservado. O cancelamento é vinculado à venda original; não apaga nem altera seus dados históricos. O desfazer rápido continua disponível. Reposição conforme D44. |
| D42 | Vendas de madrugada | ✅ **O dia operacional vira às 6h**, em horário local da adega. Uma venda às 2h pertence ao dia operacional anterior. A regra vale para contador do dia, resumos, filtros e agrupamentos dos relatórios; o horário real do registro continua visível no histórico. |
| D43 | Primeiro acesso pelo link | ✅ No modo Dono, abrir o **Painel com roteiro opcional de três passos**: registrar uma venda → conferir a margem → verificar o estoque. O usuário pode ignorar ou fechar o roteiro e explorar livremente. O roteiro usa as operações e os números reais do perfil de demonstração. |
| D44 | Estoque de uma venda cancelada | ✅ O Dono informa **quais itens continuam disponíveis e podem voltar ao estoque**. Somente esses são repostos; produtos já servidos/consumidos não voltam. A reposição gera movimento próprio, sem apagar movimentos posteriores nem duplicar devoluções já refletidas em uma contagem. |
| D45 | Estoque já existente ao começar do zero | ✅ Informar **quantidade e custo junto do cadastro de cada produto**. Essa quantidade gera saldo inicial, separado de compras. Destilados: fechadas + ml na aberta e custo por garrafa; insumos: quantidade e custo por un/kg. |
| D46 | Contagem de insumos e unidades | ✅ Incluir **cerveja, energético, gelo e demais insumos**, respeitando un/kg. Mostrar faltas e sobras pelo custo, separadas dos destilados; esses itens não entram na estimativa principal de doses da D19. |
| D47 | Taxa de uma venda cancelada | ✅ O Dono informa se a taxa foi devolvida. **Por padrão, não foi devolvida e permanece como custo**. Se confirmar a devolução, registrar crédito pelo valor original, sem usar a taxa atual nem simular integração com a maquininha. |
| D48 | Ordenação e destaque de margem | ✅ "Maior margem" e a ordenação "Margem" usam **margem bruta total em reais no período**, com rateio D37 e estornos datados. A porcentagem aparece ao lado como informação complementar. |
| D49 | Demonstração após semanas sem uso | ✅ **Preservar os testes, sem acrescentar vendas fictícias automaticamente.** Oferecer "Restaurar demo" para recriar dados atualizados, com confirmação explícita antes de substituir dados do perfil atual. Preservar personalização por padrão (D25) e não alterar o outro perfil. |

---

### Alterações solicitadas durante a construção

| Decisão | Escolha confirmada |
|---|---|
| D50 | Usar marcas reais e fotos de garrafas: Jack Daniel’s, Ballantine’s, Smirnoff e outras comuns em adegas. Exemplos de copão com energético, gelo e copo. Preços, receitas, fornecedores e movimentos permanecem demonstrativos. As fotos entram no HTML e suas fontes ficam registradas. |
| D51 | Finalizar nesta sessão e subir diretamente ao GitHub, conforme autorização expressa do usuário. |

## 1. Contexto

Protótipo de **demonstração comercial** de um sistema enxuto para adegas. O vendedor visita a adega e põe o nome e a logo do cliente na hora. Depois mostra:

- a margem real por bebida e por item;
- o que gira e o que é dinheiro parado;
- quanto a maquininha come;
- quanto some do balcão.

O gancho é o **dosador giratório** na mesma medida do sistema.

Sem backend, login real, pagamento nem integração. Mesmo assim, tem que parecer um produto pronto, e **todos os números saem dos mesmos movimentos**, coerentes entre as telas.

## 2. Stack e entrega

- `index.html` único em `C:\Users\gtsun\adega-prototipo\` (JS e CSS inline). Chart.js via jsDelivr. Google Fonts com fallback.
- Vanilla JS, sem build. Funciona em `file://` e no GitHub Pages.
- `README.md` com: como abrir, personalizar (link D30), começar do zero e informar saldo inicial, restaurar e atualizar a demo sem perder personalização (D25/D49), exportar/importar, cancelar uma venda com motivo e destinação do estoque/taxa (D41/D44/D47), dia operacional às 6h (D42), critério de margem em reais (D48), roteiro de demo (D36), roteiro opcional dentro do app (D43), "Limites do protótipo" e "Sugestões".
- UI 100% em pt-BR. Moeda com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.

## 3. Modelo de dados e regras

### Entidades
- **Fornecedor:** `id`, `nome`, `contato?`.
- **Destilado:** `id`, `nome`, `tipo`, `volumeMl`, `custoMl` (médio), `precoDose`, `precoGarrafa?`, `estoqueMinimoGarrafas`, `fornecedorPadraoId`, `corRotulo` (cor de identidade no carrossel), `ativo`, `garrafasFechadas`, `mlNaAberta`.
- **Insumo/unidade:** `id`, `nome`, `unidade` (un|kg), `custoUnit` (médio), `precoUnit?`, `estoque`, `estoqueMinimo`, `fornecedorPadraoId`, `ativo`.
- **Drink:** `id`, `nome`, `precoVenda`, `componentes`: `[{destiladoId, ml}]` + `[{insumoId, qtd}]`, `ativo`.
- **Combo:** `id`, `nome`, `precoVenda`, `itens`: `[{tipo: drink|dose|garrafa|unidade, refId, qtd}]`, `ativo`.
- **Movimentos** (fonte única da verdade, todos com identificador, instante real do registro e data operacional pela D42):
  - `venda`: `{balcaoId, pagamento: pix|dinheiro|cartao, taxaPct, linhas: [{tipo, refId, qtd, valorTotal, custoTotal}], valorTotal, custoTotal, taxaValor, snapshot}`. O `snapshot` guarda preços, custos por ml/unidade, dose, fichas e composição de combos **no momento**, além das baixas por componente (para rateio e desfazer) e dos preços avulsos usados no desconto/acréscimo de combos.
  - `compra`: `{refId, qtd, custoTotal, fornecedorId}`.
  - `cancelamento`: vinculado por `vendaId`, com motivo obrigatório, instante próprio e destinação das quantidades por componente (reponível ou consumido/indisponível). Guarda `taxaDevolvida` (padrão `false`) e `taxaEstornadaValor` (zero ou o valor original confirmado). Preserva valores e rateios do snapshot original e os vínculos com eventuais ajustes de reposição. A venda original e seu snapshot permanecem no histórico. Somente o Dono registra esse movimento; não permitir cancelar a mesma venda duas vezes.
  - `contagem` que gera `ajuste` por item confirmado. Preserva teórico, contado, falta/sobra, motivo e snapshot do custo médio e da unidade; para destilados, também preço e medida da dose vigentes na confirmação.
  - `saldoInicial`: quantidade física e custo informados no cadastro, por item, com instante e data operacional. Na demo, integra a data-base do histórico gerado; no perfil iniciado do zero, é registrado quando cada item é cadastrado, sem criar compras ou vendas fictícias.

### Regras
- **Saldo:** `estoqueMl = garrafasFechadas × volumeMl + mlNaAberta`.
- **Baixa em ml:** consome a garrafa aberta, depois abre a próxima e continua, sem perder a sobra. Se a venda termina a garrafa exatamente, a próxima só abre na próxima demanda.
- **Validação atômica:** a comanda inteira é validada (somando as necessidades de todos os itens, inclusive drinks dentro de combos) antes de qualquer baixa. Reservar primeiro todas as garrafas fechadas vendidas avulsas ou em combos. A demanda restante de líquido deve caber em `mlNaAberta + (garrafasFechadas − garrafasReservadas) × volumeMl`; uma mesma garrafa não pode atender simultaneamente à venda fechada e à abertura para doses. Se faltar algo, bloqueia com mensagem de ruptura citando o item.
- **Desfazer (5 s):** reverte a venda inteira, com todas as baixas e o estado das garrafas.
- **Cancelamento posterior (D41/D44):** ação exclusiva do Dono, com motivo obrigatório e confirmação em modal próprio; cancela a venda inteira uma única vez, cria registro vinculado e mantém o histórico. O estorno financeiro é datado no dia operacional do cancelamento e usa receita, custo e rateios originais; não reescreve períodos anteriores. Para o filtro por balcão, pertence ao balcão da venda original. Cancelamento não executa devolução de dinheiro nem aciona maquininha. Taxas seguem D47.
- **Taxas no cancelamento (D47):** apresentar "A taxa foi devolvida?", com padrão "Não". Nesse caso, manter apenas o débito original da taxa no dia da venda; não criar outra despesa no dia do cancelamento. Com "Sim", registrar crédito no dia operacional do cancelamento pelo valor da taxa do snapshot original e usando seu rateio. `taxasLiquidas = taxasDasVendasDoPeriodo − taxasDevolvidasNoPeriodo`. A regra vale para qualquer forma com taxa configurada. Mudanças posteriores de percentual não alteram esses valores. O protótipo registra a informação do Dono, sem verificar ou executar devolução externa.
- **Reposição no cancelamento:** mostrar os componentes efetivamente baixados no snapshot, inclusive os de drinks e combos, com as quantidades máximas recuperáveis. O Dono indica apenas quantidades ainda disponíveis e utilizáveis; não presumir reposição. Um drink já preparado/servido não se transforma novamente em ingredientes. Registrar entradas de reposição com o custo histórico dos componentes e atualizar o custo médio atual sem recalcular vendas anteriores. Não restaurar o estado antigo completo: preservar compras, vendas e outros ajustes posteriores. Garrafa vendida fechada só volta como fechada se continuar lacrada; líquido não vira garrafa fechada por equivalência de volume. Conferir a distribuição física atual entre fechadas e uma aberta quando a reposição não puder ser representada sem ambiguidade.
- **Cancelamento após contagem:** se algum componente recuperável teve contagem depois da venda, conduzir à conferência do saldo físico atual desse componente pelo fluxo existente e ajustar apenas a diferença para o saldo registrado. Não somar automaticamente a reposição, pois a contagem posterior pode já tê-la incorporado. Registrar separadamente a quantidade recuperada por nova entrada e a quantidade recuperada já refletida em contagem; juntas, não podem superar a baixa original. Manter as contagens antigas e seus valores; salvar a conferência e o cancelamento de forma atômica, com vínculos que impeçam uma segunda reposição.
- **Itens consumidos em vendas canceladas:** manter suas baixas físicas. O estorno retira receita e custo da venda do resultado comercial; o custo histórico dos componentes consumidos/indisponíveis é exposto separadamente como "Custo consumido em vendas canceladas", sem nova baixa e sem somar esse consumo ao vazamento apurado nas contagens. Quantidades vendidas e canceladas aparecem separadas; o consumo físico considera a saída original menos as quantidades recuperadas, tanto por nova entrada quanto já refletidas em contagem. Não contar como consumo uma quantidade disponível apenas porque a conferência atual gerou ajuste zero. Histórico e resumos identificam vendas e cancelamentos sem contar cancelamento como nova venda.
- **Dia operacional (D42):** começa às 06:00 e termina imediatamente antes das 06:00 do dia seguinte. Antes das 06:00, a data operacional é a data civil anterior; a partir das 06:00, é a data civil atual. Preservar o instante real e ordenar compras, vendas, contagens e cancelamentos por esse instante; usar a data operacional para indicadores e filtros. Os períodos da D23 usam essas datas operacionais: mês atual começa no dia 1 às 06:00 e vai até o instante atual; antes das 06:00 do primeiro dia civil do mês, o mês operacional ainda é o anterior. Exibir datas e a indicação "Dia operacional: 6h às 6h". Não registrar movimentos futuros.
- **Doses disponíveis:** `floor(mlNaAberta / dose)` + sobra real em ml. **Doses equivalentes** em relatórios: `ml / dose`, com 1 casa decimal.
- **Custo médio ponderado:** `novoCustoMl = (estoqueMl × custoMl + custoTotalCompra) / (estoqueMl + mlComprados)`. A mesma regra vale para as unidades.
- **Cadastro com estoque inicial (D45):** permitir quantidade inicial zero. Para saldo positivo, exigir custo informado, não negativo, e sua unidade; um campo vazio não vale zero. Custo zero deve ser informado explicitamente. Em destilados, converter custo por garrafa para custo por ml; em insumos, usar custo por un/kg. Registrar o saldo inicial uma única vez por item; alterações posteriores de quantidade passam por compra, contagem ou reposição, nunca por edição direta do saldo. Catálogo sem custo conhecido não pode apresentar margem como 100% nem concluir venda: mostrar "Informe o custo" e orientar o cadastro. Preços de venda continuam estritamente positivos.
- **Mudança de embalagem/unidade:** após existir saldo ou histórico, volume da garrafa e unidade do item não são editados no mesmo registro; orientar cadastrar uma nova apresentação. Nome, preços, ficha e estado ativo podem mudar preservando os snapshots anteriores.
- **Margens:** `margemBruta = valor − custo`; `margem% = margemBruta / valor × 100` (receita líquida zero ou negativa por cancelamentos mostra "—"); `taxa = valor × taxaPct / 100`, com `taxaPct = 3,5` representando 3,5%; `margemAposTaxas = margemBruta − taxasLiquidas`. Somar taxas de todas as formas de pagamento, com discriminação de cartão/Pix/dinheiro; não ignorar taxas de Pix ou dinheiro quando configuradas.
- **Consolidação financeira e mix:** faturamento do período = vendas registradas no período menos os estornos datados no período; a margem bruta subtrai o custo das vendas líquido dos respectivos estornos. Mostrar vendas, cancelamentos e total líquido de forma reconciliável. Os percentuais do mix usam as vendas registradas por forma antes dos cancelamentos, com esse rótulo; estornos e valores líquidos aparecem separados por forma. Sem vendas no período, percentuais mostram "—", mesmo que existam cancelamentos. Não transformar totais líquidos negativos em percentuais de mix enganosos.
- **Ranking (D48):** "Margem" e "Maior margem" usam margem bruta acumulada em R$, incluindo estornos datados e o rateio original; mostrar margem% ao lado quando a receita líquida for positiva. "Volume" usa ml vendidos, incluindo doses, participação em drinks/combos e volume das garrafas fechadas, deduzidos os ml de cancelamentos datados; não contar o mesmo componente em dois canais. Usar somente bebidas ativas no carrossel; as inativas permanecem nos relatórios históricos. Para "Menos vendida", incluir as ativas com zero venda. Para "Maior margem", considerar bebidas com movimentos comerciais no período; sem movimentos, mostrar estado vazio. Empates usam faturamento líquido e depois nome; aplicar a mesma regra no carrossel, cards e resumo. Volume em primeiro lugar usa ordem decrescente; menor volume usa crescente. Não confundir ranking comercial com consumo físico da lista de compras.
- **Rateio (D37):** numa linha de drink/combo, cada componente recebe `valorLinha × custoComponente / custoLinha`, e o mesmo para margem e taxa. Se todos os custos forem explicitamente zero, repartir igualmente entre os componentes distintos por `refId`, após consolidar repetições, e explicar essa exceção em "Como chegamos"; não comparar numericamente ml, kg e unidades. Custo desconhecido não aciona essa exceção. Doses e garrafas vão 100% para a bebida. Distribuir o resíduo de centavos de forma determinística. **Invariante:** Σ bebidas + Σ insumos = total, inclusive nos estornos vinculados ao rateio original.
- **Vazamento:** `teórico = saldo na última referência + compras − saídas ± ajustes anteriores`; `diferença = teórico − contado` (positivo é falta, negativo é sobra). Confirmar a contagem gera o ajuste e vira a nova referência. O período soma as faltas das contagens datadas dentro dele. Valoração: `faltaMl/dose × precoDose` (receita potencial) e `faltaMl × custoMl` (custo).
- **Contagem de destilados:** informar garrafas fechadas inteiras e ml na garrafa aberta; o contado é `fechadas × volumeMl + mlNaAberta`. Item pulado não gera ajuste nem nova referência e aparece como "Sem contagem nesta contagem". A valoração histórica usa o snapshot da contagem; mudar custo, preço ou dose depois não altera diferenças já registradas.
- **Contagem de insumos/unidades (D46):** informar a quantidade física na unidade cadastrada (un/kg, com frações quando cabíveis). `diferença = teórico − contado`; `custoDaFalta = max(diferença, 0) × custoUnit` no snapshot. Sobras têm quantidade e valor próprios, nunca compensam faltas na exibição. Confirmar ajusta e renova a referência por item; pular preserva saldo e referência. Não converter esses itens em doses nem estimar sua receita potencial. O card principal da D19 considera somente destilados; apresentar também o custo faltante dos insumos e o total de custo faltante da adega, identificados separadamente.
- **Garrafas consumidas:** equivalentes de garrafas consumidas abertas = `ml consumido em doses e fichas / volumeMl`; mostrar garrafas fechadas vendidas em linha separada, sem contar seu volume novamente no primeiro número.
- **Dinheiro parado:** exige estoque atual positivo e ausência de venda/consumo comercial há ≥ 30 dias **ou**, também com estoque positivo, cobertura > 90 dias. Considerar uso em drinks/combos como saída do produto. Sem saída desde o cadastro, contar os dias desde o saldo inicial. Cobertura = estoque atual dividido pelo consumo físico médio diário dos últimos 30 dias; com 30 dias observados, estoque positivo e consumo zero, é infinita. Antes de haver 30 dias de histórico, identificar a cobertura como "Histórico insuficiente", sem classificar produto recém-cadastrado como parado por uma divisão por zero. Capital = `estoqueMl × custoMl`. É um indicador do estoque atual de toda a adega, sem filtro de período/balcão; não suprime o alerta de reposição.
- **Reposição:** `garrafasFechadas ≤ estoqueMinimo`, o mesmo critério da lista.
- **Sugestão de compra (D34):** usar consumo físico dos últimos 30 dias operacionais de todos os balcões; estimar `max(0, consumoMedioDiario × 14 − estoqueAtual)`. Em destilados, calcular em ml e converter o déficit em garrafas inteiras, arredondando para cima. Em insumos, usar un/kg; arredondar para unidades inteiras quando indivisíveis e para a precisão cadastrada quando fracionáveis. Sugestão zero pode coexistir com alerta de mínimo: mostrar "Abaixo do mínimo; sem compra sugerida pelo consumo recente", sem alterar a fórmula da D34.
- **Combos e preço separado:** o editor aceita drinks e doses vendáveis, garrafas com `precoGarrafa` e unidades com `precoUnit`. Ingredientes sem preço avulso podem compor a ficha de um drink; para vendê-los como item do combo, cadastrar seu preço avulso. `desconto = soma(precosAvulsos × quantidades) − precoCombo`; se negativo, mostrar "Acréscimo" pelo valor absoluto. Preservar os preços avulsos no snapshot da venda para o histórico não mudar.
- **Comparativo drink × dose:** mesma quantidade de destilado; a margem do drink já desconta os outros insumos. O texto diz "a mais" ou "a menos".
- **Filtros:** período e balcão filtram vendas no Painel e nos Relatórios. Vazamento, inclusive seus cards no Painel, é filtrado apenas pelo período: o estoque é compartilhado e não permite atribuir diferenças a um balcão. Identificar esses valores com "Estoque compartilhado da adega". Estoque atual e contador do dia não mudam com os filtros de relatórios.
- **Persistência e atualização da demo (D13/D25/D49):** guardar a origem do perfil (`demo` ou `proprio`), a data-base e o instante até o qual os dados fictícios foram gerados. Reabrir preserva integralmente dados, histórico, testes e datas; não gera vendas, compras ou contagens automaticamente, nem desloca registros no calendário. O filtro continua baseado no dia operacional atual; ausência de movimento recente aparece como estado vazio real. Em perfil demo com dados gerados há 7 dias operacionais ou mais, oferecer aviso discreto com a data de geração e "Restaurar demo"; a ação também fica em Ajustes. Em perfil próprio, não sugerir renovação automática de dados fictícios. Restaurar requer confirmação em modal, oferecendo exportação antes da substituição, e reconstrói conjuntamente catálogo demonstrativo, fornecedores, fichas, combos, configurações operacionais, saldos e movimentos do perfil atual com uma nova data-base. Preservar nome, logo, cor e PIN, salvo o checkbox explícito da D25; manter o outro perfil intacto. Nada é apagado ao apenas abrir ou fechar o modal. Importação restaura exatamente os dados exportados e suas datas, sem atualizá-los para o dia da importação.

## 4. Telas

Navegação: barra inferior no celular e lateral no desktop. Abas: **Painel · Balcão · Estoque · Relatórios · Vazamento · Ajustes**. O modo Balcão só vê Balcão e Estoque (somente consulta).

### 4.1 Header
Logo e nome da adega, badge do modo, pills **Mês atual | Trimestre | Semestre | Anual** com o intervalo de datas operacionais e a indicação da virada às 6h. Período inicial: **Mês atual**, sem troca automática de período conforme o dia do mês. Em Painel e Relatórios, filtro **Todos | Balcão 1 | Balcão 2** quando houver dois. Separar esse filtro do seletor de registro da seção 4.2. No Vazamento, informar que o estoque é compartilhado e o filtro de balcão não se aplica.

### 4.2 Balcão
- Se houver dois balcões, mostrar **"Vendendo no: Balcão 1 | Balcão 2"**, com padrão Balcão 1 e escolha persistida no aparelho por perfil. Nunca permitir "Todos" para registrar venda. Trocar o filtro de relatórios não muda silenciosamente o balcão de registro.
- Grade de botões grandes (≥ 48 px), em seções: Mais vendidos · Drinks · Combos · Doses · Garrafas · Outros.
- Comanda: lista de itens com +/−, total e três botões grandes de pagamento, **Pix · Dinheiro · Cartão**. Tocar num deles finaliza a venda. Toast "Venda registrada — Desfazer".
- Topo: número de vendas e faturamento do dia operacional (6h às 6h); no modo Dono, também a margem bruta. "Copiar resumo do dia" (Dono), com data operacional e intervalo explícitos.
- Dono: acesso ao histórico de vendas, com data/hora real, balcão, pagamento, itens, valor e situação. "Cancelar venda" abre modal com motivo obrigatório, indicação das quantidades ainda disponíveis para reposição, "A taxa foi devolvida?" (padrão "Não", apenas se houver taxa) e resumo do efeito financeiro e físico antes de confirmar. Quando necessário pela seção 3, conferir o saldo atual dos componentes. Vendas canceladas mostram vínculo, motivo, destinação e situação da taxa e não oferecem novo cancelamento. Essa ação posterior não aparece no modo Balcão.

### 4.3 Painel (Dono) — **a vitrine da demo**
Inspirado nas páginas de linha de produtos das destilarias (ver seção 6). Estrutura:

No primeiro acesso em modo Dono, o Painel oferece um roteiro opcional, sem bloquear a navegação: **Registrar uma venda → Conferir a margem → Verificar o estoque** (D43). Pode ser fechado e retomado por "Ver roteiro". O fechamento é preservado no perfil. As etapas usam as telas, movimentos e indicadores existentes; não geram vendas, contagens ou alterações automaticamente. O modo Balcão não mostra etapas que exponham margem.

1. **Hero central.** Mostra a "Visão geral" (todas as bebidas) ou a **bebida selecionada**:
   - Visão geral: faturamento, margem bruta, margem após taxas e vazamento do período em números grandes, mais um gráfico de faturamento no tempo.
   - Bebida selecionada: garrafa grande ilustrada (SVG) na cor de rótulo da bebida, com o nome em tipografia de destaque e o tipo e o volume como "sobrescrito", como numa página de produto. Ao lado, o **dash completo da bebida**:
     - volume vendido (doses equivalentes e garrafas), com divisão por canal (dose / garrafa / drinks / combos);
     - faturamento e margem bruta (com participação em drinks e combos, D37), margem%, margem após taxas;
     - gráfico da evolução no período;
     - drinks e combos que mais usam a bebida;
     - estoque atual (garrafa com nível + fechadas + cobertura em dias), com o selo de reposição se for o caso;
     - vazamento da bebida na última contagem;
     - posição no ranking ("3ª mais vendida de 10").
   - Transição suave entre as bebidas (crossfade + a garrafa sobe). Respeitar `prefers-reduced-motion`.
2. **Destaques do período:** três cards clicáveis, **Mais vendida · Menos vendida · Maior margem em R$** (e "Dinheiro parado" se houver, identificado como situação do estoque atual). Clicar seleciona a bebida no hero. A margem percentual é complementar e não define o vencedor.
3. **Carrossel de garrafas embaixo.** Todas as bebidas ativas, cada uma como uma garrafa ilustrada com o nome, ordenadas pelo ranking escolhido: toggle **Volume | Margem (R$)**. Selos pequenos: 🥇 "Mais vendida", "Menos vendida", "Maior margem", "Repor". O primeiro item é "Visão geral". Regras e desempates são os mesmos dos cards, conforme seção 3.
   - Arrastar/deslizar no touch, setas no desktop, navegação por teclado (←/→, Enter).
   - Item selecionado em destaque (escala + sublinhado na cor primária).
   - A seleção fica na URL (`#bebida=ID`) para poder voltar e compartilhar.
4. Rodapé com o card do Plano Parceiro (D15).

### 4.4 Estoque
- Card por destilado: garrafa SVG com nível, "12 doses + 20 ml na garrafa aberta", garrafas fechadas e selo de reposição. Clicar abre a bebida no Painel (modo Dono).
- Dono: "Vender dose", "+ Entrada de compra" (quantidade, custo total, fornecedor) e "Abrir nova garrafa" (só com a aberta vazia).
- "Lista de compras" agrupada por fornecedor (D34), em texto para WhatsApp.
- Insumos em lista simples.

### 4.5 Relatórios (Dono)
- **KPIs:** Faturamento · Margem bruta · Taxas de pagamento (com cartão em destaque e detalhamento por forma) · Margem após taxas · Doses equivalentes · Garrafas consumidas. Cada um com "Como chegamos a este número?".
- **Ranking de itens vendidos** (drinks, doses, garrafas, combos), com margem por item, sem rateio. Top 3 e bottom 3 destacados.
- **Mix de pagamento:** % e R$ por forma antes dos cancelamentos, com estornos e valores líquidos em separado. Taxas originais, devolvidas e líquidas por forma, reconciliadas com o KPI.
- **Combos:** vendas, margem e desconto concedido.
- **Cancelamentos:** valores estornados no período, vinculados às vendas originais, e custo consumido em vendas canceladas em linha separada. Explicar que o resultado usa movimentos datados e pode ter valores negativos quando cancela vendas de períodos anteriores.
- **Por balcão** (se houver 2): faturamento e margem lado a lado.
- **Dinheiro parado** e **comparativo drink × dose**.
- "Copiar resumo do período".

### 4.6 Vazamento (Dono)
Card principal (D19), com as datas das contagens e a indicação "Estoque compartilhado da adega". Somente o período filtra as diferenças; mudar de balcão não muda esses valores. Se não houver contagem no período, mostra o estado vazio. A tabela por item tem teórico, contado, falta/sobra (ml, doses, R$ receita, R$ custo) e motivo. Ainda: "Fazer contagem agora" (um item por vez; para destilados, quantidade de garrafas fechadas + ml na aberta, com slider de nível; pode pular, sem gerar ajuste para o item pulado; revisão antes de confirmar), simulador de dose excessiva (D31) e o texto de apoio "Padronizar a dose com o dosador ajuda a reduzir diferenças. Investigue também registros, fichas técnicas e contagens."

O fluxo também inclui insumos e unidades: quantidade em un/kg, teórico, contado, falta/sobra e custo, sem doses ou receita potencial. Mostrar destilados e insumos em grupos distintos; o custo faltante total da adega soma os dois, enquanto a estimativa principal em doses permanece exclusiva dos destilados. Um item pulado aparece como "Sem contagem nesta contagem" em qualquer grupo.

### 4.7 Ajustes (Dono)
- Nome, logo (dataURL ≤ 256 px), cor primária, com contraste automático (texto preto/branco sobre a primária; ajuste de luminosidade para usos de texto se não passar AA).
- Perfil, dose, nº de balcões, taxas por forma de pagamento, PIN.
- **Cadastros** (D24/D45): destilados e insumos com quantidade e custo do estoque inicial junto do cadastro; drinks (editor de ficha, que mostra ao vivo custo, margem e margem%, ou "Informe o custo" quando faltar); combos (editor com "preço separado" × preço do combo, desconto ou acréscimo); fornecedores. Identificar o saldo inicial como estoque já existente, não como compra.
- Começar do zero, exportar/importar, restaurar demo (modal próprio informando substituição de cadastros e testes do perfil atual, oferecendo exportação e com "também apagar personalização" desmarcado), gerador de link (D30), card de cadastro assistido (D40). Mostrar data de geração dos dados fictícios e explicar que a restauração atualiza a demo; reabrir o app não altera os testes.

## 5. Dados de demonstração

- Data-base persistida. Na primeira criação ou em restauração confirmada, gerar 12 meses até o instante da geração, com PRNG de semente fixa (mulberry32), saldo inicial, compras (com fornecedor), vendas (com balcão e pagamento) e contagens coerentes. Guardar a data-base e `geradoAte`; aberturas posteriores não completam o histórico automaticamente (D49). O estoque nunca fica negativo.
- Mix de pagamento realista: Pix ~50%, Cartão ~35%, Dinheiro ~15%. Balcão 1 ~65% / Balcão 2 ~35% (Bairro).
- Sazonalidade: pico sexta e sábado e em dezembro/janeiro. O mês atual tem vendas somente até o instante atual. Gerar também vendas de madrugada e agrupá-las pelo dia operacional da D42, mantendo os horários reais.
- **Bairro:** ~10 destilados, 5 drinks (copão de vodka, copão de gin, caipirinha, whisky com energético, batida), combos ("3 Copões de Vodka", "Kit Whisky: garrafa + 4 energéticos + 2 kg de gelo", "Kit Gin: garrafa + 4 tônicas + gelo"), insumos, cerveja. 3 fornecedores fictícios. R$ 25–60 mil/mês.
- **Premium:** ~14 destilados, 5 drinks autorais, combos ("Degustação 3 whiskies", "Garrafa + tônicas premium"). 3 fornecedores fictícios. R$ 60–150 mil/mês. 1 balcão.
- Nomes genéricos, **nenhuma marca real**. Cada bebida com uma `corRotulo` própria e distinguível.
- Cenários garantidos no momento da geração/restauração: uma bebida claramente campeã e uma claramente pior no período padrão (Mês atual, desde que já haja vendas); ≥ 1 item abaixo do mínimo; ≥ 2 de dinheiro parado; contagens semanais com falta de 3–7% concentrada em 2–3 destilados; ≥ 1 sobra; a última contagem com 1 item "sem contagem". No início do mês, sem contagem no período, usar o estado vazio previsto em vez de inventar contagem futura ou trocar o período automaticamente. Os cenários descrevem dados demonstrativos, não garantias após uso manual ou passagem do tempo.

## 6. Direção de arte

**Referências:** jackdaniels.com/pt-br e johnniewalker.com/pt-br. Consulte os sites se tiver acesso à rede. O que tirar deles:

- **Linguagem de "linha de produtos":** garrafas lado a lado como navegação, cada uma com a sua cor de identidade; selecionar uma leva a um "palco" onde a garrafa é a protagonista, com o nome em tipografia de destaque e as informações organizadas em blocos.
- **Atmosfera:** fundo preto/grafite profundo, muito respiro, contraste alto, luz dirigida na garrafa (gradiente radial suave atrás dela), textura sutil de grão/papel.
- **Tipografia:** serifada de destaque, clássica e editorial, para os títulos e o nome das bebidas (ex.: Playfair Display, Cormorant ou similar); rótulos em CAIXA-ALTA com espaçamento largo; sans-serif limpa e com números tabulares para os dados (ex.: Inter, Manrope).
- **Detalhes:** filetes finos, bordas discretas, cor de destaque usada com parcimônia (dourado/âmbar no Premium; o vibrante do perfil Bairro; ou a cor personalizada).

**Atualização D50:** usar fotografias reais dos produtos e seus nomes, conforme pedido do usuário. Registrar as fontes; manter a interface original do AdegaControl. Produtos cadastrados pelo Dono sem foto conhecida usam uma ilustração SVG genérica. As fotos não representam o nível de líquido do estoque, que continua indicado pelos números e barra de nível.

Geral: WCAG AA, números legíveis a distância, sem rolagem horizontal em 360 px, microinterações discretas, `prefers-reduced-motion`.

## 7. Critérios de aceite

1. `file://` e GitHub Pages sem erro no console. Offline, o layout funciona e os gráficos viram tabelas.
2. Uma comanda com 1 "Kit Ballantine’s" + 2 "Copão de Smirnoff" paga no Cartão baixa todos os componentes, aplica a taxa de cartão, registra o balcão e atualiza estoque, contador do dia e Painel. Desfazer volta tudo, inclusive uma garrafa aberta.
3. A baixa atravessa garrafas sem perder a sobra. A falta de qualquer componente bloqueia a comanda inteira. Garrafa fechada só com fechada disponível.
4. Período e balcão alteram os resultados de vendas no Painel e nos Relatórios, com datas operacionais visíveis. Vazamento, inclusive cards do Painel, muda apenas com o período; mudar de balcão preserva seus valores e a indicação de estoque compartilhado. Faturamento e volume do Anual ≥ Semestre ≥ Trimestre ≥ Mês para os dados de demonstração sem cancelamentos. Estoque e contador do dia não mudam com os filtros.
5. Σ margem por item vendido = KPI de margem bruta, e Σ bebidas (rateio D37) + Σ insumos = KPI, com tolerância de arredondamento.
6. Custo médio: 500 ml a R$ 0,04/ml + 1.000 ml por R$ 60 = R$ 0,05333/ml.
7. Uma contagem confirmada usa fechadas + ml na aberta para destilados e un/kg para insumos, gerando ajuste por item; uma recontagem imediata dá diferença zero. Sobra não é perda. Item pulado aparece como "Sem contagem nesta contagem", sem ajuste nem mudança da referência. Mudar custo, preço ou dose depois não muda a valoração histórica da diferença. Insumos entram no custo faltante total, mas não na estimativa em doses.
8. Mudar preço, ficha ou combo não altera as vendas anteriores. Inativar um item com histórico o preserva nos relatórios.
9. Painel: clicar numa bebida no carrossel, num card de destaque ou no Estoque abre o dash dela; `#bebida=ID` restaura a seleção; o carrossel funciona por touch, setas e teclado; os selos de mais/menos vendida batem com o ranking.
10. O editor de drink/combo mostra custo e margem ao vivo e bloqueia a ficha vazia ou o preço 0.
11. Personalização (inclusive via link) aplica na hora e sobrevive ao recarregar; trocar de perfil a preserva; "Começar do zero" gera um perfil vazio utilizável.
12. O modo Balcão não mostra custo, margem, taxas, vazamento, compras nem abertura manual.
13. Restaurar respeita a D25; Exportar → Restaurar → Importar volta ao mesmo estado.
14. 360, 768 e 1440 px OK.
15. Sem promessa de integração ou sensor; marcas e fotos reais com fontes registradas conforme D50; valores e receitas identificados como demonstrativos.
16. Depois dos 5 segundos de "Desfazer", apenas o Dono pode cancelar uma venda, com motivo obrigatório. Venda original, snapshot e cancelamento permanecem no histórico; uma segunda tentativa é bloqueada. Repor somente componentes disponíveis escolhidos pelo Dono; componentes consumidos mantêm suas baixas e aparecem pelo custo em linha separada. Com compra ou venda posterior, não restaurar o estoque antigo; com contagem posterior, conferir o saldo físico sem duplicar reposição já incorporada. Validar também cancelamento de uma venda do mês anterior, preservando os números históricos e datando o estorno no período atual. Taxas seguem D47.
17. Uma venda às 02:00 e outra às 05:59 pertencem ao dia operacional anterior; às 06:00, ao novo dia. Contador, resumo e filtros concordam, inclusive na virada do mês e do ano, e o histórico preserva o horário real.
18. No primeiro acesso em modo Dono, o roteiro opcional tem as três etapas da D43; pode ser fechado e retomado, sem bloquear navegação nem criar movimentos automaticamente. Recarregar preserva seu fechamento; o modo Balcão não revela margem pelo roteiro.
19. Começar do zero e cadastrar uma garrafa de 1.000 ml, com duas fechadas + 500 ml abertos e custo de R$ 60 por garrafa, gera saldo inicial de 2.500 ml e R$ 150, sem registrar compra nem faturamento. Insumos seguem sua unidade. Custo em branco não é zero; quantidade posterior não pode ser editada diretamente.
20. Com uma única garrafa fechada e a aberta vazia, uma comanda que exige essa garrafa fechada + uma dose do mesmo produto é bloqueada integralmente, inclusive quando um dos itens está dentro de combo.
21. O balcão de registro nunca é "Todos"; mudar o filtro de relatórios não altera o balcão usado na venda. Alterar preços avulsos não recalcula o desconto/acréscimo de combos já vendidos.
22. Venda não servida → contagem incorpora a sobra → cancelamento: o estoque não aumenta novamente, e a quantidade recuperada deixa de contar como consumo na sugestão de compra. Produto com estoque zero não é dinheiro parado; produto recém-cadastrado sem 30 dias de histórico não recebe esse selo por divisão por zero.
23. Venda de R$ 100 com taxa original de 3,5%: cancelar mantendo a taxa não gera uma segunda despesa; ao considerar venda e cancelamento juntos, permanecem R$ 3,50 de taxa. Confirmar devolução credita R$ 3,50 na data operacional do cancelamento, mesmo que a taxa configurada depois seja 5%. Conferir também venda no mês anterior e período contendo só cancelamentos, sem percentuais de mix inválidos.
24. Bebida com margem de R$ 300 e 30% fica acima de outra com R$ 100 e 80% no carrossel e no card "Maior margem". Resumo, cards e ranking usam a mesma fonte e os estornos datados; percentual não inverte a ordem.
25. Avançar a data por semanas e reabrir mantém exatamente os movimentos e testes, sem novas vendas fictícias. Abrir e cancelar o modal "Restaurar demo" não muda dados. Confirmar gera histórico atualizado coerente, com catálogo e saldos correspondentes, preserva nome/logo/cor/PIN com o checkbox desmarcado e não altera o outro perfil. Exportar antes e importar depois restaura o estado e as datas exportados.

## 8. Não fazer

Backend, login real, pagamento real, integração; `alert/confirm/prompt` nativos; texto em inglês na UI; funcionalidades fora do briefing (ideias vão em "Sugestões" no README).

## 9. Ordem de construção

1. Motor (movimentos, saldos, custo médio, baixa, comanda atômica, desfazer, rateio, conciliação) + testes rápidos no console para os aceites 2, 3, 5, 6, 7 e 8.
2. Gerador de dados do Bairro.
3. Balcão (comanda + pagamento + histórico e cancelamento exclusivo do Dono) e Estoque.
4. **Painel com hero + carrossel** (a peça principal da demo; caprichar) e roteiro opcional de primeiro acesso.
5. Contagem e Vazamento (+ simulador).
6. Relatórios.
7. Ajustes: cadastros, personalização, modos, balcões, taxas, persistência, link, exportar/importar, restaurar, começar do zero.
8. Premium.
9. Verificação dos aceites (3 larguras, `file://`, offline) e README com o roteiro: personalizar → vender um Kit no cartão → garrafa baixa → Painel: clicar na mais vendida e na pior → taxas da maquininha → vazamento + simulador → banner do plano.

## 10. Ao terminar

Responda com o que foi feito, quais aceites você verificou e como, e qualquer desvio com o motivo.

## 11. Changelog v4

- D41/D44: cancelamento posterior exclusivo do Dono, com motivo obrigatório, histórico preservado, estorno datado e reposição apenas dos componentes disponíveis. Prevenida a duplicação após contagens; consumo em vendas canceladas fica identificado separadamente.
- D42: virada fixa do dia operacional às 6h, aplicada aos indicadores, resumos, filtros e dados de demonstração, sem perder o horário real dos movimentos.
- D43: Painel com roteiro opcional de três passos no primeiro acesso, dispensável e retomável.
- D45: quantidade e custo do estoque preexistente no cadastro, com saldo inicial separado de compras e custo ausente distinto de zero.
- D46: contagem de insumos e unidades, com faltas/sobras pelo custo e sem mistura com a estimativa em doses.
- D47: taxa de venda cancelada mantida por padrão; devolução somente quando informada pelo Dono, pelo valor original e sem duplicar despesa.
- D48: destaque e ordenação de margem pelo total em reais, com percentual complementar e critérios consistentes nos cards, ranking e resumo.
- D49: preservação dos testes ao reabrir e atualização dos dados fictícios apenas por restauração confirmada, mantendo personalização por padrão.
- Corrigida a contradição entre D39 e os filtros: diferenças de estoque pertencem à adega inteira e não são atribuídas a balcões.
- Explicitadas contagem de fechadas + ml abertos, preservação dos itens pulados e valoração histórica pelo snapshot da contagem.
- Revisão auxiliar do Claude Opus 5.5, solicitada com esforço máximo, concluída e registrada em `REVISAO-CLAUDE-REFINAMENTO.md`. Incorporadas a separação entre filtro e balcão de registro, a reserva de garrafas antes da validação de ml e a preservação de preços avulsos dos combos. As sugestões não aprovadas não alteram as decisões do dono.
- Esclarecidos o rateio excepcional com custos explicitamente zero, as unidades da sugestão de compra e a preservação de embalagens/unidades com histórico.
- Atualizadas as telas, o README previsto, a ordem de construção e os critérios de aceite correspondentes, agora 25. Refinamento encerrado: v4 pronta para construção em 24/09/2026.
