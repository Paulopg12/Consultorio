# Consultorio The Ladies

Reconstrução estática das páginas:

- `/pages/consultorio`
- `/pages/consultorio-1`

O fluxo usa HTML, CSS e JavaScript puro, com persistência em `localStorage` para simular o comportamento original do consultório.
As perguntas do questionário de emagrecimento foram extraídas do fluxo atual `?type=wl` e adaptadas para a identidade visual The Ladies, sem reaproveitar a identidade visual do consultório antigo.

## Rodar localmente

```bash
python3 tools/dev-server.py
```

Abra `http://localhost:4173/pages/consultorio`.
