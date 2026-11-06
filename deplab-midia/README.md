# dep.rural · Instagram @deplabsoft

Pasta das artes do Instagram do **dep.rural** (um produto dep.lab). Este repositório é **público**: aqui só entram artes que vão ser postadas, roteiros e ferramentas. Nunca coloque arquivo de cliente, nota fiscal, planilha ou dado pessoal.

## Como funciona
1. Cada post tem uma pasta em `posts/AAAA-MM-DD-tema/` com o `roteiro.json` e as mídias (`slide-01.png`… ou `reel.mp4`).
2. As mídias são geradas com as ferramentas desta pasta:
   - Carrossel (1080×1350): `node ferramentas/carrossel.js roteiro.json pasta-de-saida`
   - Reel (1080×1920, 30 fps, com trilha própria): `node ferramentas/video.js roteiro.json saida.mp4`
   - Prévia do Reel, um quadro por cena: `node ferramentas/video.js roteiro.json saida.mp4 --quadros`
   - Story (1080x1920): roteiro com `"formato":"story"` e 1 slide; `node ferramentas/carrossel.js roteiro.json pasta` gera `story-01.png`.
   - Post leve (imagem única 1080x1350): roteiro com 1 slide; sai `slide-01.png`, sem a numeração.
   - Os tipos de slide e de cena estão descritos no começo de cada script.
3. A Metricool (marca 7767590, fuso America/Sao_Paulo) puxa a mídia pelo link público:
   `https://raw.githubusercontent.com/euclidssonalexandre-creator/Elei-es/main/deplab-midia/posts/<pasta>/<arquivo>`
4. Todo post agendado entra em `historico.md`.

## Identidade
- Fundo `#131316`, cartões `#1e1e24`, bordas `#34333a`, texto `#f2efec`, texto secundário `#a8a29e`, laranja `#ff6b2c`.
- Títulos em Archivo 800, texto em Inter, etiquetas e marca em JetBrains Mono (arquivos em `ferramentas/fontes`, licença OFL).
- Marca escrita `dep.rural`, com o ponto em laranja, e assinatura "um produto dep.lab".
- Palavras em destaque no roteiro: `*assim*` (ficam laranja).

## Fatos que podem ser usados (não inventar nada além disto)
- O Livro Caixa da Atividade Rural hoje é digitado à mão no programa da Receita, nota por nota: data, conta, histórico e valor. O programa não importa nota.
- O dep.rural funciona em 4 passos: gravar a cópia de segurança no programa da Receita → arrastar a cópia, os XMLs das notas e os PDFs da folha e dos honorários → conferir (o sistema sugere conta e histórico; a pessoa resolve só o que ele não soube) → restaurar a cópia pronta no programa.
- Não troca de sistema: o livro e a declaração continuam no programa da Receita.
- O que ele lê: XML de compra (sugere a conta pelo que o produtor já lançou e monta o histórico); XML de venda (um lançamento por item, com a quantidade de animais e a GTA); holerites em PDF (valor líquido por empregado, no mês em que foi pago); DARF do INSS e guia do FGTS (total da guia, na data do vencimento); planilha de honorários (uma linha por pagamento, na data paga).
- Compra de bezerros e outros animais e venda de gado trazem a quantidade no histórico.
- Uso pessoal: marca bebida, cosmético e afins; na dúvida, mostra o item e pergunta. Dá para marcar a nota inteira como pessoal com um clique.
- Memória por produtor: o que foi classificado uma vez já vem pronto no mês seguinte.
- Não altera o que já foi lançado nos meses anteriores; antes de salvar, confere sozinho que nenhum lançamento antigo, cadastro ou conta do plano mudou.
- Nota já lançada, cancelada, devolução ou de outro ano fica de fora sozinha.
- Teste com dados reais de um produtor: a cópia restaurou no programa da Receita sem erro, e os lançamentos antigos saíram idênticos, na mesma ordem.
- O sistema sugere, a pessoa decide: sempre há conferência humana.
- Limites (não prometer o contrário): ainda não baixa XML da SEFAZ sozinho; não faz LCDPR, CT-e, NFS-e, férias, 13º nem rescisão.
- Regra contábil já usada nos posts: o livro caixa da atividade rural segue o regime de caixa (vale a data do pagamento); a folha de um mês é paga no mês seguinte; o salário entra pelo líquido, porque o INSS descontado do empregado sai na guia.

## O que nunca fazer
- Inventar números (horas economizadas, quantidade de clientes, preço), depoimentos ou clientes.
- Citar escritório, cliente ou produtor real, ou nomes de concorrentes.
- Afirmar regra fiscal nova sem conferir em fonte oficial (gov.br, Receita Federal) na mesma semana.
- Prometer recurso que está na lista de limites.

## Padrão das legendas
Português do Brasil, frases curtas, gancho na primeira linha, lista com os pontos do post, fechamento com **Comenta "RURAL"** 🟠 e as hashtags `#livrocaixa #produtorrural #contabilidaderural #contador #agronegocio #irpf #deprural` (troque uma ou duas pelo tema do post).
