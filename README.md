# SantoSelfie

Totem interativo para tirar uma foto com um santo, guardar a lembrança com uma moldura SantoSelfie e Crescer, imprimir ou compartilhar pelo celular usando um QR Code.

## Como abrir

No Windows, dê dois cliques em `Iniciar-SantoSelfie.bat`. Ele inicia um servidor Python local e abre `http://localhost:8000` no navegador. Mantenha a janela do terminal aberta enquanto usa o totem; feche-a para desligar o servidor.

O acesso por `localhost` permite ao navegador solicitar a câmera. Para testar o QR Code e o envio ao Cloudinary localmente, é necessário usar o ambiente de desenvolvimento da Vercel com as variáveis de ambiente configuradas. O servidor Python do atalho serve apenas arquivos estáticos e não executa a função de API.

A tela do painel de personagem usa proporção vertical 9:16 e está identificada como 1080 × 1920. A resolução disponível depende da TV e das configurações de vídeo do computador conectado.

## Tecnologias e serviços

| Ferramenta | Uso no projeto |
| --- | --- |
| HTML, CSS e JavaScript | Interface do totem, painel e página para baixar/compartilhar a foto. O projeto não usa um framework de frontend nem um processo de build. |
| Google Flow | Geração dos vídeos dos santos. Os vídeos recebidos são mantidos em MP4 na pasta `videos-santos/`. |
| FFmpeg (via `imageio-ffmpeg`) | Recorte de fundo verde e conversão dos vídeos para WebM VP9 com transparência, formato usado pelo navegador. É uma etapa de preparação dos arquivos, não roda no site. |
| Vercel | Hospedagem do site e execução da função de API em `api/sign-photo.js`. |
| Cloudinary | Armazenamento das fotos para que possam ser acessadas depois pelo QR Code. |
| `assets/qrcode.min.js` | Geração do QR Code no navegador. |
| Câmera do navegador (`getUserMedia`) | Captura a pessoa ao vivo. A permissão de câmera funciona em HTTPS ou em `localhost`. |
| Canvas do navegador | Combina o quadro da câmera com o vídeo transparente do santo e desenha a moldura final. |
| Impressora Canon G3110 | Impressão da foto pelo recurso de impressão do navegador. O botão atual chama `window.print()` e abre a tela de impressão do navegador. |

### Remoção do fundo dos vídeos

O fluxo atual para os vídeos novos com fundo verde uniforme usa o filtro `chromakey` do FFmpeg. O recorte transforma o verde em transparência e grava um arquivo `.webm` com VP9. O site carrega o `.webm`; o MP4 original é preservado para futuras edições.

Exemplo para um vídeo 2D em chroma verde:

```powershell
# Instale uma vez se o pacote ainda não estiver disponível:
py -m pip install imageio-ffmpeg

$ffmpeg = py -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
& $ffmpeg -i .\videos-santos\maria.mp4 -vf "format=rgba,chromakey=0x0ee525:0.18:0.05,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 30 -b:v 0 -an .\videos-santos\maria.webm
```

A cor do chroma e a tolerância precisam ser ajustadas ao vídeo. Para os cinco desenhos recentes, o fundo é verde vivo e uniforme. O vídeo 3D de São Pio X tem um verde mais escuro e variável; nele foi usada uma tolerância menor (`0.02`) para preservar o rosto e as roupas. Uma tolerância alta pode apagar partes verdes ou claras do personagem. Faça uma prévia do vídeo recortado antes de substituir o arquivo usado pelo site.

O projeto já testou o `rvm-web` para remoção de fundo, mas ele não é chamado pelo site nem faz parte do processo atual de publicação. Para os clipes com chroma verde uniforme, o método usado aqui é FFmpeg. Se um novo vídeo vier com cenário, sombras fortes ou sem fundo verde uniforme, o recorte por chroma pode deixar bordas ou remover partes do personagem; nesse caso será necessário preparar uma máscara com uma ferramenta de matting, como RVM, e conferir o resultado quadro a quadro.

### Personagens disponíveis

As opções e os nomes dos arquivos de vídeo estão em `index.html`, na lista `saints` e no mapa `videoFiles`.

| Personagem | Arquivo WebM usado pelo totem |
| --- | --- |
| Santo Antônio de Pádua | `santo-antonio-de-padua.webm` |
| Santa Dulce dos Pobres | `santa-dulce-dos-pobres.webm` |
| São Padre Pio | `padrepio.webm` |
| Santa Rita de Cássia | `ritadecassia.webm` |
| São Carlo Acutis | `sao-carlo-acutis.webm` |
| São João Paulo II | `sao-joao-paulo-ii.webm` |
| Maria (Desenho) | `maria.webm` |
| Menino Jesus (Desenho) | `menino-jesus.webm` |
| São José (Desenho) | `sao-jose.webm` |
| São Pio X (Desenho) | `sao-pio-x.webm` |
| São Miguel Arcanjo (Desenho) | `sao-miguel-arcanjo.webm` |
| São Pio X | `sao-pio-x-3d.webm` |

Para adicionar ou substituir um vídeo, coloque o MP4 em `videos-santos/`, gere o WebM transparente com o recorte adequado e atualize o nome e o caminho em `saints` e `videoFiles` no `index.html`. Os nomes dos vídeos no mapa precisam corresponder aos arquivos `.webm`.

## Telas do totem

1. **Início:** apresenta a experiência e leva à escolha do santo.
2. **Escolha:** lista os personagens. As opções de desenho estão marcadas com `(Desenho)`.
3. **Foto:** mostra a câmera e o vídeo do santo; depois da animação, inicia a contagem e captura a imagem.
4. **Lembrança:** exibe a foto em moldura, com ações de QR Code, impressão e nova foto.

O vídeo transparente é sobreposto à câmera tanto na prévia quanto na imagem final. A moldura inclui a marca SantoSelfie, a marca Crescer e o nome escolhido.

## Painel de posição

Abra `http://localhost:8000/painel.html` (ou `/painel.html` no endereço publicado) para selecionar um personagem, ajustar o tamanho e movê-lo para os lados, para cima ou para baixo. O botão **Rolar vídeo** reproduz a animação na prévia.

Os valores são salvos automaticamente no `localStorage` do navegador e compartilhados entre o painel e o totem pela mesma origem. Portanto, abra os dois pelo mesmo endereço e no mesmo navegador. Os ajustes feitos no `localhost` são separados dos ajustes feitos no domínio Vercel e não são compartilhados com outros dispositivos.

## Foto, QR Code e Cloudinary

Quando a pessoa pede o QR Code, o navegador chama `POST /api/sign-photo`. A função em `api/sign-photo.js` cria uma assinatura curta usando as variáveis de ambiente do Cloudinary. O navegador usa essa assinatura para enviar a foto. O QR Code abre `foto.html`, que carrega a imagem do Cloudinary e oferece baixar ou compartilhar.

Configure estas variáveis no painel da Vercel, sem colocar os valores no HTML ou no Git:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

`CLOUDINARY_API_SECRET` deve ficar somente no ambiente de servidor da Vercel. A API aceita requisições POST do domínio do SantoSelfie e de `localhost` para desenvolvimento.

## Impressão

O botão **Imprimir foto** chama `window.print()`. O navegador apresenta a tela de impressão; a página web não consegue enviar silenciosamente o trabalho direto à Canon G3110 sem configuração adicional do navegador ou um serviço local de impressão. Papel A4 pode ser usado para os testes atuais; o corte ou tamanho físico final depende das opções do driver da impressora.

## Arquivos principais

- `index.html` — interface, lista de personagens, câmera, contagem, composição da foto, moldura, QR Code e botão de impressão.
- `painel.html` — painel para ajustar a posição dos personagens.
- `foto.html` — página aberta pelo QR Code para baixar ou compartilhar a foto.
- `api/sign-photo.js` — assinatura do envio de fotos ao Cloudinary na Vercel.
- `videos-santos/` — MP4s originais e WebMs transparentes usados pelo totem.
- `assets/bg.svg` — fundo do site.
- `assets/logo.png` — logo Crescer usada no cabeçalho e na moldura da foto.
- `assets/qrcode.min.js` — biblioteca local para desenhar o QR Code.
- `Iniciar-SantoSelfie.bat` — inicia o servidor local no Windows.
