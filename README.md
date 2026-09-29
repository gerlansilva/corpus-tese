# Corpus de Educação Estatística

Site estático para consulta pública do corpus de análise da tese, organizado em duas áreas: **Celi Espasandin Lopes** e **Carmen Batanero**. Esta versão reúne 201 artigos: 54 da Celi e 147 da Batanero. Todos os registros possuem link individual para o respectivo arquivo no Google Drive.

## Conteúdo do projeto

- `index.html` — página principal;
- `styles.css` — identidade visual e layout responsivo;
- `app.js` — busca, filtros, paginação, visualizações e exportação CSV;
- `data/celi.js` e `data/celi.json` — corpus da Celi;
- `data/batanero.js` e `data/batanero.json` — corpus da Batanero;
- `data/drive-files.json` — referências dos 54 PDFs no Google Drive;
- `_headers` — cabeçalhos de segurança e cache para Cloudflare Pages.

O site não usa framework, banco de dados ou etapa de compilação. Todos os dados são carregados no navegador.

## Publicar com GitHub e Cloudflare Pages

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta para a raiz do repositório.
   - Envie também a pasta `data` completa. O arquivo `data/batanero.js` contém os 147 registros exibidos na segunda aba.
2. No Cloudflare Dashboard, abra **Workers & Pages → Create → Pages → Connect to Git**.
3. Escolha o repositório e use estas configurações:
   - **Framework preset:** None;
   - **Build command:** `exit 0`;
   - **Build output directory:** `.` (a raiz do repositório).
4. Clique em **Save and Deploy**.

Também é possível ativar o GitHub Pages em **Settings → Pages → Deploy from a branch**, usando a branch `main` e a pasta `/ (root)`.

## Atualizar os dados

Os arquivos `data/celi.json` e `data/batanero.json` mantêm as versões legíveis dos conjuntos; os arquivos `.js` correspondentes são carregados pelo site. Ao substituir registros, mantenha as duas versões sincronizadas. A interface calcula automaticamente totais, períodos e filtros de cada coleção.

## Metadados

O conjunto da Celi possui 54 campos, dos quais 35 têm pelo menos um valor. O conjunto da Batanero possui 15 campos presentes: autores, nomes completos, título, ano, periódico, DOI, afiliações, autores com afiliações, resumo, palavras-chave, referências, país, citações, conferência do registro e situação das palavras-chave. Na coleção da Batanero, 74 artigos têm DOI, 145 têm contagem de citações e 149 informam país.

## Uso local

O site pode ser aberto diretamente pelo arquivo `index.html`. Para reproduzir o ambiente de hospedagem, execute na pasta:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.
