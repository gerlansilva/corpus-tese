# Corpus de Educação Estatística

Site estático para consulta pública do corpus de análise da tese, organizado em duas áreas: **Celi Espasandin Lopes** e **Carmen Batanero**. Nesta versão, o conjunto da Celi contém 54 registros e 54 documentos; a área da Batanero está preparada, mas ainda vazia.

## Conteúdo do projeto

- `index.html` — página principal;
- `styles.css` — identidade visual e layout responsivo;
- `app.js` — busca, filtros, paginação, visualizações e exportação CSV;
- `data/celi.js` e `data/celi.json` — corpus da Celi;
- `data/batanero.js` — estrutura vazia para o próximo conjunto;
- `data/drive-files.json` — referências dos 54 PDFs no Google Drive;
- `_headers` — cabeçalhos de segurança e cache para Cloudflare Pages.

O site não usa framework, banco de dados ou etapa de compilação. Todos os dados são carregados no navegador.

## Publicar com GitHub e Cloudflare Pages

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta para a raiz do repositório.
2. No Cloudflare Dashboard, abra **Workers & Pages → Create → Pages → Connect to Git**.
3. Escolha o repositório e use estas configurações:
   - **Framework preset:** None;
   - **Build command:** `exit 0`;
   - **Build output directory:** `.` (a raiz do repositório).
4. Clique em **Save and Deploy**.

Também é possível ativar o GitHub Pages em **Settings → Pages → Deploy from a branch**, usando a branch `main` e a pasta `/ (root)`.

## Atualizar os dados

O arquivo `data/celi.json` mantém a versão legível e completa do conjunto; `data/celi.js` é a versão carregada pelo site. Ao substituir os registros, mantenha as duas versões sincronizadas. A interface calcula automaticamente totais, período, citações, cobertura dos metadados e frequências de palavras-chave.

## Metadados

O conjunto fornecido possui 54 campos. Nesta versão, 35 campos têm pelo menos um valor e 19 estão vazios em todos os registros. A interface permite alternar entre **Com dados**, **Todos os campos** e **Sem dados**, exibindo a cobertura de cada campo.

## Uso local

O site pode ser aberto diretamente pelo arquivo `index.html`. Para reproduzir o ambiente de hospedagem, execute na pasta:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.
