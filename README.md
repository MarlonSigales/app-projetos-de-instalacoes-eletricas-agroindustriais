# Software de Apoio a Projetos de Instalações Elétricas Agroindustriais

Laboratório de Instrumentação Agrícola · Engenharia Agrícola · CEng/UFPel

Ferramentas web usadas na disciplina de Projeto de Instalações Elétricas Agroindustriais. Rodam no navegador; o PHP é opcional e só ativa recursos de servidor.

| Módulo | O que faz | Documentação |
|---|---|---|
| **Projeto elétrico agroindustrial** (`index.html`) | Roteiro completo pela NBR 5410: cargas, condutores, proteção, quadros, luminotécnico, SPDA (NBR 5419), subestação (NBR 14039), materiais, orçamento e projeto em PDF | [LEIA-ME.txt](LEIA-ME.txt) |
| **Sistema fotovoltaico off-grid** (`offgrid/`) | Dimensionamento pelo pior caso com CRESESB/SunData, águas do telhado, baterias, vida útil, picos de partida, CCA, BMS, controlador, inversor, transferência, proteções, cabos, barramentos, unifilar, custos; análise de sistema existente; JSON e PDF | [offgrid/README.md](offgrid/README.md) |

Todos os campos têm **balões de ajuda** (ícone **?**) explicando como preencher.

## Como rodar

```bash
php -S localhost:8000
```

- Projeto elétrico: `http://localhost:8000`
- Off-grid: `http://localhost:8000/offgrid/index.html`

Sem PHP, abra os `index.html` direto no navegador. Nesse caso não funcionam os projetos salvos no servidor do app principal nem a busca automática no CRESESB do off-grid; em lugar deles, use exportar/importar JSON e a consulta manual ao SunData.

## Responsáveis

Marlon Soares Sigales, Ádamo de Souza Araújo e Ricardo Scherer Pohndorf. Uso conforme [LICENSE](LICENSE).
