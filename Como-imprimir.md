# Como imprimir no totem

O botão **Imprimir foto** manda a polaroid direto para a Canon. A tela preta do Edge não abre. Estas configurações são feitas uma vez.

## 1. Comprar o papel

Compre **papel fotográfico brilhante 10×15 cm para jato de tinta**.

O nome mais seguro para esta Canon é **Canon Glossy Photo Paper GP-501 10×15 cm**. Fujifilm, Kodak ou Chamex fotográfico brilhante 10×15 também servem.

Papel Zink, filme de Instax e papel sulfite não servem nesta impressora.

## 2. Colocar o papel na Canon

1. Ligue a impressora.
2. Abra a bandeja de trás.
3. Coloque o 10×15 com o lado brilhante para cima.
4. Encoste as guias laterais no papel.

A bandeja da frente continua com o papel comum. A foto 10×15 entra só pela bandeja de trás.

## 3. Deixar a Canon como impressora padrão

1. Abra **Configurações**.
2. Vá em **Bluetooth e dispositivos** e depois **Impressoras e scanners**.
3. Desligue **Permitir que o Windows gerencie minha impressora padrão**.
4. Clique na Canon. O nome pode ser **Canon G3010 series** ou **Canon G3110 series**.
5. Clique em **Definir como padrão**.

## 4. Gravar o papel, a borda e a qualidade

1. Na mesma tela da Canon, clique em **Preferências de impressão**.
2. Deixe estas opções:
   - Tamanho do papel: **10x15 cm** ou **4x6 pol.**
   - Origem: **bandeja traseira**
   - Orientação: **retrato**
   - Margem: **sem borda** (borderless)
   - Tipo de mídia: **papel fotográfico brilhante**
   - Qualidade: **alta**
3. Clique em **Aplicar** e depois em **OK**.

Se a janela da Canon estiver em inglês, os nomes são **Page Size**, **Rear Tray**, **Portrait**, **Borderless**, **Glossy Photo Paper** e **High**.

Essa gravação vale para todos os cliques do totem. O servidor usa o que ficou salvo aqui e não abre a tela para escolher de novo.

## 5. Abrir o totem

1. Feche qualquer janela antiga do servidor.
2. Dê dois cliques em `Iniciar-SantoSelfie.bat`.
3. Deixe a janela preta aberta durante o evento.
4. Confira estas linhas na janela:

```
SantoSelfie em http://localhost:8000
Impressora: Canon G3010 series
Papel padrao desta impressora: 10x15cm
```

O nome da Canon pode ser G3010 ou G3110. O papel padrão precisa ser 10×15, não A4.

Se a janela mostrar outra impressora, abra o arquivo `.env` e acrescente uma linha com o nome exato que aparece em Impressoras e scanners:

```
PRINTER_NAME=Canon G3010 series
```

Salve, feche a janela preta e abra o atalho de novo.

## 6. Provar uma foto

1. No totem, tire uma foto até chegar na tela **Ficou especial.**
2. Toque em **Imprimir foto**.
3. A tela preta de impressão do Edge fica fechada.
4. O texto embaixo do botão muda para **Imprimindo em Canon...**
5. A Canon puxa uma folha 10×15.

## Se algo sair diferente

- A janela preta fecha sozinha: a porta 8000 ainda está ocupada. Feche a janela antiga do servidor e abra o atalho outra vez.
- Aparece a tela preta do Edge: o totem foi aberto por outro servidor. Feche tudo e use só o `Iniciar-SantoSelfie.bat`.
- A folha sai A4: volte ao passo 4 e grave o tamanho **10x15 cm**.
- A foto sai com uma faixa branca nas bordas: no passo 4, marque **sem borda**.
- A cor sai apagada: no passo 4, escolha papel fotográfico brilhante e qualidade alta. Confira se o lado brilhante ficou para cima.
- O texto na tela da foto diz que a impressora não foi encontrada: confira o nome no passo 5 e a linha `PRINTER_NAME` do `.env`.
