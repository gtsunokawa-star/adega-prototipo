# AdegaControl

Protótipo interativo para demonstrar vendas, estoque, margem e diferenças de contagem de uma adega. Os perfis **Adega de Bairro** e **Adega Premium** usam o mesmo motor de cálculo, com catálogos e históricos independentes. O catálogo usa marcas e fotos reais solicitadas pelo usuário. Preços, receitas, fornecedores e movimentos são demonstrativos; não são cotações nem receitas oficiais dos fabricantes.

## Abrir

Abra **`index.html`** no navegador. O arquivo reúne a interface, os estilos e o código necessários para usar o protótipo; não é preciso instalar dependências, executar um build ou iniciar um servidor. Ele pode ser aberto diretamente pelo explorador de arquivos (`file://`).

Para disponibilizá-lo futuramente em uma hospedagem estática, como GitHub Pages, use o mesmo `index.html` como página de entrada. A aplicação também funciona por um endereço HTTPS. Este projeto não realiza publicação automática.

No primeiro acesso, o perfil Bairro abre no Painel em modo Dono, com um roteiro opcional: **registrar uma venda → conferir a margem → verificar o estoque**. Feche o roteiro para explorar livremente ou retome-o por **Ver roteiro**, em Ajustes. O roteiro não cria operações sozinho.

## Personalizar para a adega

Em **Ajustes**, informe o nome, escolha a cor e, se desejar, carregue uma logo PNG, JPG ou WebP. A logo é reduzida para até 256 px. Salve a identidade para aplicá-la à demonstração.

O botão **Gerar link personalizado** inclui nome, cor e perfil. Exemplo de caminho:

```text
index.html?adega=Adega%20da%20Esquina&cor=%23d4a017&perfil=bairro
```

Use `perfil=premium` para abrir o outro cenário. O caractere `#` da cor aparece como `%23` no endereço. O link transporta esses três parâmetros; logo, cadastros e movimentos acompanham o arquivo de exportação. Para compartilhar pela internet, o `index.html` precisa estar hospedado em um endereço acessível ao destinatário.

A identidade personalizada acompanha a troca de perfil. Os dados operacionais de Bairro e Premium permanecem separados.

## Dono e Balcão

- **Dono:** acesso ao Painel, vendas, estoque, relatórios, contagem, compras e ajustes.
- **Balcão:** registra vendas e consulta o estoque. Não apresenta custos, margens, taxas, compras, vazamento ou abertura manual de garrafas.

O modo Balcão permanece ativo ao recarregar. O PIN inicial para retornar ao modo Dono é **1234**. Ele pode ser alterado em Ajustes. Esse PIN organiza a demonstração no aparelho: não é autenticação segura nem substitui contas de usuário e permissões de um sistema de produção.

O perfil Bairro começa com dois balcões e o Premium com um. Em ambos, o estoque é único. **Vendendo no** escolhe o balcão da próxima venda; o filtro **Todos os balcões / Balcão 1 / Balcão 2** muda apenas os relatórios.

## Registrar e corrigir uma venda

1. Abra **Balcão** e confira o balcão de registro.
2. Toque nos drinks, doses, garrafas, combos ou unidades para montar a comanda. Ajuste as quantidades com `+` e `−`.
3. Escolha **Pix**, **Dinheiro** ou **Cartão**. Esse toque finaliza a venda.
4. Confira o retorno na tela e, se foi um engano imediato, use **Desfazer** em até cinco segundos.

A comanda inteira é conferida antes da baixa. Quando necessário, a próxima garrafa é aberta automaticamente. Uma garrafa para levar exige uma unidade fechada disponível; a mesma garrafa não pode ser reservada para levar e também usada nas doses da comanda.

Após cinco segundos, somente o Dono pode cancelar pelo **Histórico de vendas**. Informe o motivo e, para cada componente, apenas a quantidade que continua disponível e pode voltar ao estoque. Um drink já servido não volta a ser ingredientes. Garrafa só retorna como fechada quando ainda estiver lacrada.

Para recuperar destilados, o fluxo solicita a conferência do saldo físico atual; insumos também exigem conferência se houve contagem após a venda. Isso evita reposição duplicada e resolve a distribuição entre garrafas lacradas e líquido aberto. Compras e vendas posteriores continuam preservadas. A venda original permanece no histórico e não pode ser cancelada duas vezes.

No cancelamento, confirme se a taxa de pagamento foi devolvida. **O padrão é considerar que não foi devolvida:** permanece a cobrança original, sem uma segunda despesa. Quando houver devolução confirmada, o crédito usa o valor original da taxa e a data do cancelamento, mesmo que o percentual configurado tenha mudado.

Cancelamentos registram o estorno no dia em que ocorrem, sem reescrever os resultados do mês anterior. Componentes consumidos continuam baixados, e seu custo aparece separadamente em **Custo consumido em vendas canceladas**. A aplicação apenas registra essas informações; não devolve dinheiro nem aciona uma maquininha.

## Entender os resultados

O **dia operacional vai das 6h às 6h**, usando o horário local do aparelho. Uma venda às 2h ou 5h59 pertence ao dia operacional anterior; às 6h, começa o novo dia. O histórico mantém o horário real do registro. Essa regra também vale nas viradas de mês e ano.

**Mês atual** começa no dia 1 às 6h do mês operacional e termina no instante atual. Trimestre, Semestre e Anual usam os últimos 3, 6 e 12 meses corridos. As datas aparecem junto aos filtros.

- **Margem bruta:** receita menos o custo pago aos fornecedores pelos componentes vendidos.
- **Margem após taxas:** margem bruta menos as taxas líquidas de pagamento. Os padrões são Pix 0%, Dinheiro 0% e Cartão 3,5%, ajustáveis em Ajustes.
- **Maior margem:** maior margem bruta total em reais no período. A porcentagem é complementar e não define a ordem.
- **Resultado por item:** considera o drink, dose, garrafa, combo ou unidade vendido, sem rateio.
- **Resultado por bebida:** inclui a participação em drinks e combos, distribuída proporcionalmente ao custo dos componentes na venda.

Essas margens não incluem aluguel, salários e outras despesas da adega. Os botões **Como chegamos a este número?** explicam os cálculos. Preços, fichas e custos posteriores não recalculam as vendas antigas.

No Painel, selecione uma garrafa ou um destaque para consultar a bebida. O endereço registra a seleção, por exemplo `#bebida=vodka-clara`. O carrossel permite deslizar, usar as setas ou navegar pelo teclado. **Copiar resumo** prepara um texto do dia ou período para colar onde desejar; não envia mensagens automaticamente.

## Estoque, compras e cadastros próprios

Para testar os dados da sua adega, escolha **Começar do zero** em Ajustes. Confira a confirmação antes de substituir os dados operacionais do perfil atual. A outra demonstração continua independente. Exporte uma cópia antes se quiser conservar seus testes.

Em **Cadastros**, cadastre fornecedores, destilados e insumos, depois monte as fichas dos drinks e os combos. Para o estoque que já existe, informe quantidade e custo no cadastro do produto:

- **Destilado:** volume da garrafa, custo por garrafa, quantidade fechada e ml na aberta. Exemplo: duas garrafas de 1.000 ml e 500 ml abertos, ao custo de R$ 60 por garrafa, formam saldo inicial de 2.500 ml e R$ 150.
- **Insumo ou unidade:** unidade de controle (`un` ou `kg`), quantidade e custo por unidade ou kg.

Esse registro é **saldo inicial**, separado de compras, e não gera faturamento. Custo em branco não equivale a custo zero. Depois do cadastro, altere o saldo por compra ou contagem; editar o produto não substitui o estoque existente.

Drinks precisam de pelo menos um componente e preço maior que zero. O editor mostra custo e margem conforme a ficha. Combos agrupam itens vendáveis e mostram a diferença entre o preço separado e o preço fechado. Se um cadastro já tem histórico, a exclusão o inativa para preservar os registros anteriores.

Em **Estoque**, use **Entrada de compra** para informar quantidade, custo total pago e fornecedor. O custo médio é ponderado pelo saldo existente. A abertura manual de uma garrafa fica disponível ao Dono quando a aberta estiver vazia.

A **Lista de compras** agrupa sugestões por fornecedor, considerando o consumo físico médio dos últimos 30 dias e a cobertura de 14 dias. O alerta de mínimo pode aparecer mesmo quando esse cálculo não sugere uma compra. **Dinheiro parado** considera estoque positivo, histórico observado e ausência de consumo há pelo menos 30 dias ou cobertura acima de 90 dias; produtos recém-cadastrados e saldo zero não recebem o selo por falta de histórico.

## Fazer uma contagem

Em **Vazamento**, abra **Fazer contagem agora**. Confira cada produto: garrafas fechadas e ml na aberta para destilados; quantidade na unidade cadastrada para cerveja, energético, gelo e demais insumos. É possível pular um item. Revise antes de confirmar.

A contagem compara o saldo teórico com o físico, registra a diferença e passa a ser a nova referência. Falta e sobra aparecem separadas. **Sem contagem** não significa perda zero, e um item pulado não recebe ajuste.

O destaque **em doses que deixaram de ser vendidas (estimativa)** considera apenas destilados, pela medida e pelo preço da dose registrados na contagem. O **custo do estoque faltante** também inclui insumos. Sobras não são abatidas das faltas. As diferenças pertencem ao estoque compartilhado da adega: o período altera a consulta, mas o filtro de balcão não altera o vazamento.

O simulador de dose excessiva mostra hipóteses ajustáveis. Ele não mede a dose servida nem promete economia. Padronização, registros, fichas e contagens precisam ser avaliados juntos.

## Preservar, transportar e restaurar dados

Os dados ficam no navegador deste aparelho, separados por perfil. O aplicativo reduz o espaço ocupado pelo histórico automaticamente nos navegadores compatíveis. Essa compressão interna não muda o uso: **Exportar JSON** sempre entrega um arquivo JSON para guardar e importar depois.

Use **Ajustes → Exportar JSON** antes de uma restauração ou para continuar em outro aparelho. Em **Importar JSON**, selecione o arquivo e confira a substituição indicada na tela. A importação recupera os dados e datas exportados, sem acrescentar vendas fictícias. Nome, logo e cor acompanham a exportação do aplicativo.

Reabrir a demo preserva os testes exatamente como ficaram. Depois de sete dias operacionais, um aviso pode sugerir sua atualização, mas nenhuma venda fictícia é acrescentada automaticamente. Períodos sem movimento ou sem contagem continuam vazios.

**Restaurar demo** recria catálogo, saldos e 12 meses de movimentos coerentes até o instante da confirmação. O modal informa a substituição dos cadastros e testes do perfil atual e oferece exportação. Por padrão, preserva **nome, logo, cor e PIN**, com **também apagar personalização** desmarcado. Marque essa opção somente se também quiser retornar à identidade e ao PIN iniciais. O outro perfil não é alterado. Abrir o modal e voltar não restaura nada.

A limpeza dos dados do navegador, a troca de navegador ou de aparelho não transporta o histórico. Guarde exportações se precisar conservar os testes. Se aparecer uma mensagem de falha ao salvar, exporte antes de fechar a página.

## Roteiro comercial de 3 minutos

| Tempo | Demonstração |
|---|---|
| 0:00–0:25 | Em Ajustes, coloque o nome e a cor da adega. Use o perfil Bairro e apresente o Painel. |
| 0:25–0:55 | No Balcão, registre **1 Kit Ballantine’s + 2 Copões de Smirnoff**, no Cartão, observando o balcão selecionado. |
| 0:55–1:15 | Abra Estoque e confira as baixas da garrafa, do líquido e dos insumos usados. |
| 1:15–1:45 | Volte ao Painel. Selecione **Mais vendida** e **Menos vendida**; mostre volume, participação em drinks/combos e margem. Compare **Maior margem em R$**. |
| 1:45–2:10 | Em Relatórios, mostre a margem bruta, a taxa de cartão e a margem após taxas. Explique que isso ainda não é o lucro líquido da adega. |
| 2:10–2:40 | Em Vazamento, apresente a estimativa em doses e o custo faltante. Ajuste uma hipótese no simulador, sem prometer uma redução garantida. |
| 2:40–3:00 | Volte ao Painel e apresente: **Plano Parceiro: suporte mensal + 1 dosador giratório profissional por balcão (fidelidade de 12 meses)**. |

Se o mês acabou de começar e ainda não houver contagem no período, explique o estado vazio e selecione outro período explicitamente para demonstrar o histórico. Não faça uma contagem fictícia para preencher o card.

## Limites do protótipo

- Sem backend, sincronização entre aparelhos, contas de usuário ou autenticação de produção.
- Sem cobrança, pagamento real, devolução financeira ou integração com maquininha. A forma de pagamento e a devolução de taxa são informadas manualmente.
- Sem sensor ou dosador eletrônico. O dosador citado é físico; abertura e baixa automáticas se referem apenas ao registro de estoque no aplicativo.
- Marcas e fotos reais; preços, receitas e operação demonstrativos. As 14 fotos são incorporadas ao HTML e funcionam offline. As fontes estão em [CRÉDITOS-IMAGENS.md](CRÉDITOS-IMAGENS.md). Cadastros próprios sem foto usam SVG genérico.
- O código principal está no arquivo local. Chart.js e fontes são carregados pela internet; sem acesso a esses recursos, os gráficos têm alternativa em tabela e a tipografia usa fontes do sistema.
- Armazenamento limitado ao navegador. O protótipo não oferece garantia de backup nem substitui um sistema fiscal, contábil ou de gestão em produção.

## Sugestões para uma etapa futura

Estas possibilidades não fazem parte da entrega atual:

- Avaliar integração com adquirentes que disponibilizem API, após definir permissões, conciliação e limites do serviço.
- Projetar backend, autenticação e sincronização caso a demonstração evolua para operação real em vários aparelhos.
- Tratar a implantação com a identidade definitiva de cada adega e o cadastro assistido como trabalhos separados do protótipo.

## Para desenvolvimento e verificação

O arquivo distribuído é `index.html`. Os arquivos em `src/` mantêm motor, dados de demonstração, apresentação e interface separados para facilitar manutenção. Depois de alterar essas fontes, um desenvolvedor pode reconstruir o HTML com Node.js:

```text
node verificacao/build.cjs
```

Isso é uma etapa de manutenção; quem abre o `index.html` pronto não precisa executá-la.

Os testes do motor e do gerador podem ser executados com:

```text
node --test verificacao/engine.test.cjs verificacao/demo.test.cjs
```

Na execução registrada em 25/09/2026, os **28 testes passaram**: 22 do motor e 6 do gerador. Eles verificam cálculos, estoque, estornos, datas operacionais, importação e coerência dos dados fictícios.

O acompanhamento dos 25 critérios do briefing está em [verificacao/ACEITES.md](verificacao/ACEITES.md). Esse registro distingue os testes do motor, os fluxos no navegador, a inspeção visual e a publicação.
