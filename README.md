# Corpus de Educação Estatística

Site estático para consulta pública do corpus de análise da tese, organizado em duas áreas: **Celi Espasandin Lopes** e **Carmen Batanero**. Esta versão reúne 200 artigos: 53 da Celi e 147 da Batanero. Todos os registros possuem link individual para o respectivo arquivo no Google Drive.

## Conteúdo do projeto

- `index.html` — página principal;
- `styles.css` — identidade visual e layout responsivo;
- `app.js` — busca, filtros, paginação, visualizações e exportação CSV;
- `data/celi.js` e `data/celi.json` — corpus da Celi;
- `data/batanero.js` e `data/batanero.json` — corpus da Batanero;
- `data/drive-files.json` — referências dos 53 PDFs da Celi no Google Drive;
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

O conjunto da Celi reúne **1.358 referências padronizadas** e o da Batanero, **4.139**, todas preparadas para leitura no VOSviewer. Na coleção da Celi, os 53 registros têm resumo, palavras-chave, citações e link do Drive; 43 têm DOI. Na coleção da Batanero, os 147 registros têm resumo, palavras-chave e link do Drive; 76 têm DOI, 141 têm contagem de citações e 146 informam o país do primeiro autor.

## Uso local

O site pode ser aberto diretamente pelo arquivo `index.html`. Para reproduzir o ambiente de hospedagem, execute na pasta:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.
