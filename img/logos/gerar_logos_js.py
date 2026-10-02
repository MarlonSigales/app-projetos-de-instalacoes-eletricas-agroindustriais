"""Gera js/logos.js com os logotipos desta pasta embutidos em base64.

Assim o PDF usa os logotipos mesmo com o index.html aberto direto do disco (file://),
onde o navegador não deixa ler arquivos por fetch.

Arquivos reconhecidos (PNG, de preferência com fundo transparente):
  lia.png    Laboratório de Instrumentação Agrícola (destaque na contracapa)
  ea.png     Engenharia Agrícola — UFPel
  ceng.png   Centro de Engenharias — UFPel
  ufpel.png  Universidade Federal de Pelotas
Logotipo ausente: o PDF desenha um emblema provisório no lugar.

Uso (na pasta raiz do projeto):  python img/logos/gerar_logos_js.py
"""
import base64
import pathlib

PASTA = pathlib.Path(__file__).resolve().parent
SAIDA = PASTA.parent.parent / "js" / "logos.js"
NOMES = ["lia", "ea", "ceng", "ufpel"]

linhas = []
for n in NOMES:
    f = PASTA / f"{n}.png"
    if f.exists():
        linhas.append(f'  {n}:"{base64.b64encode(f.read_bytes()).decode()}"')
        print(f"{n}.png  {f.stat().st_size / 1024:.0f} kB")
    else:
        linhas.append(f"  {n}:null")
        print(f"{n}.png  (ausente: emblema provisório)")

SAIDA.write_text(
    '"use strict";\n'
    "/* Logotipos da contracapa (PNG em base64). Gerado por img/logos/gerar_logos_js.py — não editar à mão. */\n"
    "const LOGOS={\n" + ",\n".join(linhas) + "\n};\n",
    encoding="utf-8",
    newline="\n",
)
print("gerado:", SAIDA)
