# Busca Letras

App web para buscar letras por nome da musica ou cantor usando a API publica do LRCLIB.

## Como abrir

Voce pode dar dois cliques em `iniciar-app.bat`.

Ou iniciar pelo terminal:

```powershell
npm start
```

Depois acesse:

```text
http://localhost:4173
```

As letras aparecem quando estao disponiveis na fonte consultada. Algumas musicas podem nao existir na base publica.

## Link publico permanente

O link temporario `trycloudflare.com` nao pode ser transformado em permanente. Para ter um link fixo, publique o app em um provedor de hospedagem.

Opcao recomendada: Render.

1. Crie uma conta em `https://render.com`.
2. Envie esta pasta para um repositorio no GitHub.
3. No Render, escolha `New` > `Blueprint`.
4. Selecione o repositorio deste app.
5. O Render vai ler `render.yaml`, iniciar o app com `npm start` e gerar uma URL fixa.

Opcao alternativa: Railway/Heroku-like.

Este projeto tambem inclui `Procfile`, entao provedores que aceitam esse padrao conseguem iniciar o app com `web: npm start`.
