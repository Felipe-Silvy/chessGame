// PEGA OS ELEMENTOS QUE FORMAM O TABULEIRO E TRANSFORMA EM UMA MATRIZ
// ESTE SERÁ O TABULEIRO EM QUE OCORRERÁ AS MUDANÇAS
const squaresHTML = document.getElementsByClassName("square");
const squares = Array.from(squaresHTML);

let tabuleiroDOM = [];
for (let i = 0; i < 8; i++) {
  const row = [];
  for (let j = 0; j < 8; j++) {
    row.push(squares[i * 8 + j]);
  }
  tabuleiroDOM.push(row);
}

// Cria o tabuleiro onde vamos armazenar o estado das coisas
let tabuleiroLogico = criarTabuleiroLogico();

// Cria o tabuleiro onde vamos testar as coisas
let tabuleiroTestes = copiaTabuleiro(tabuleiroLogico);

// Define onde os reis estão, assim fica mais fácil de procurar por cheques
let posicoesReis = {
  branco: { linha: 7, coluna: 4 },
  preto: { linha: 0, coluna: 4 },
};

// Permite mudar a cor do tabuleiro
const cores = [
  ["azulE", "azulC"],
  ["marromE", "marromC"],
  ["verdeE", "verdeC"],
  ["cinzaE", "cinzaC"],
];
const buttons = document.querySelectorAll(".dropdown-item");
const blackSquares = document.querySelectorAll(".square.black");
const whiteSquares = document.querySelectorAll(".square.white");
buttons.forEach((element, index) => {
  element.addEventListener("click", () => {
    blackSquares.forEach((elemento) => {
      for (const cor of cores) {
        elemento.classList.remove(cor[0]);
      }
      elemento.classList.add(cores[index][0]);
    });
    whiteSquares.forEach((elemento) => {
      for (const cor of cores) {
        elemento.classList.remove(cor[1]);
      }
      elemento.classList.add(cores[index][1]);
    });
  });
});

// Define o tempo que os jogadores ainda possuem
let segundos = localStorage.getItem("tempo");
const timerBranco = document.getElementById("timer1");
const timerPreto = document.getElementById("timer2");
let min, seg, minStr, segStr;
calculaTempoDOM(segundos);
timerBranco.textContent = `${minStr}:${segStr}`;
timerPreto.textContent = `${minStr}:${segStr}`;
let tempos = {
  branco: segundos,
  preto: segundos,
};
let intervaloCronometro = null;

// Define o resto das variaveis utilizadas
const botaoIniciar = document.getElementById("iniciar");
const botaoReiniciar = document.getElementById("reiniciar");

// Define as váriaveis para controle das peças capturadas
const capturadasBrancas = document.getElementById("capturadas1");
const capturadasPretas = document.getElementById("capturadas2");
let capturadas = {
  branco: [0],
  preto: [0],
};
let valorCapturadas = {
  branco: 0,
  preto: 0,
};
const valorIcone = {
  "♟︎": 1,
  "♞": 3,
  "♝": 3,
  "♜": 5,
  "♛": 9,
};

// Define as váriaveis dos sons
const somMovimento = new Audio("assets/movimento.wav");
const somCaptura = new Audio("assets/captura.wav");

let temSelecionada = false;
let indexSelecionada = [];
let listenersSelecionada = [];
let listenersJogadas = [];
let turnoAtual = "branco";
let turnoOposto;
let jogadasPossiveis = [];
let jogadasOponente = [];
let temCheque;
let enPassantDisponivel;
let contagemTurno = 0;
let fimPartida = false;
let casaMediaP, casaMediaG;
let roqueG = null;
let roqueP = null;

botaoIniciar.addEventListener("click", comecaTurno, { once: true }); // Ao clicar em Iniciar o resto é acionado, só funciona uma vez
botaoReiniciar.addEventListener("click", () => {
  location.reload();
});

function comecaTurno() {
  // Se a partida não tiver terminado, chama as funções que controlam o jogo
  if (!fimPartida) {
    contagemTurno++;
    let direcao = turnoAtual === "branco" ? -1 : 1;
    botaoIniciar.classList.add("disabled");

    limpaTabuleiroDOM();
    cronometro();
    verificaPossiveis(
      tabuleiroLogico,
      jogadasPossiveis,
      direcao,
      turnoAtual,
      false
    );
    validaPossiveis();
    permiteSelecionar();
  }
}

function verificaPossiveis(tabuleiro, array, direcao, turno, ignorarRoque) {
  tabuleiro.forEach((linha, y) => {
    linha.forEach((elemento, x) => {
      let peca = elemento ? elemento.tipo : null;
      if (peca && elemento.cor === turno) {
        switch (peca) {
          case "rei":
            array.push(...jogadasRei(y, x, tabuleiro, turno, ignorarRoque));
            break;
          case "dama":
            array.push(...jogadasTorre(y, x, tabuleiro, turno));
            array.push(...jogadasBispo(y, x, tabuleiro, turno));
            break;
          case "cavalo":
            array.push(...jogadasCavalo(y, x, tabuleiro, turno));
            break;
          case "bispo":
            array.push(...jogadasBispo(y, x, tabuleiro, turno));
            break;
          case "torre":
            array.push(...jogadasTorre(y, x, tabuleiro, turno));
            break;
          case "peao":
            array.push(...jogadasPeao(y, x, direcao, tabuleiro, turno));
            break;
        }
      }
    });
  });
}

function validaPossiveis() {
  jogadasPossiveis = jogadasPossiveis.filter((element) => {
    return !ehCheque(
      element.origem.y,
      element.origem.x,
      element.destino.y,
      element.destino.x
    );
  });

  let index = roqueG ? encontraJogada(jogadasPossiveis, roqueG) : -1;
  if (index != -1 && encontraJogada(jogadasPossiveis, casaMediaG) == -1) {
    jogadasPossiveis.splice(index, 1);
  }

  index = roqueP ? encontraJogada(jogadasPossiveis, roqueP) : -1;
  if (index != -1 && encontraJogada(jogadasPossiveis, casaMediaP) == -1) {
    jogadasPossiveis.splice(index, 1);
  }

  let chequeNoTurno = estaEmCheque();

  if (chequeNoTurno) {
    tabuleiroDOM[posicoesReis[turnoAtual].linha][
      posicoesReis[turnoAtual].coluna
    ].classList.add("capturavel");
  }

  if (jogadasPossiveis.length === 0) {
    if (chequeNoTurno) {
      // É xeque-mate
      turnoOposto = turnoAtual === "branco" ? "preto" : "branco";
      acabaPartida(turnoOposto, "mate");
    } else {
      // É empate por afogamento (stalemate)
      acabaPartida("empate", "falta de jogadas");
    }
  } else if (materialInsuficiente()) {
    // É empate por material insuficiente
    acabaPartida("empate", "material insuficiente");
  }
}

function encontraJogada(arrayDeJogadas, jogadaParaEncontrar) {
  for (let i = 0; i < arrayDeJogadas.length; i++) {
    const jogada = arrayDeJogadas[i];
    if (
      jogada.origem.y === jogadaParaEncontrar.origem.y &&
      jogada.origem.x === jogadaParaEncontrar.origem.x &&
      jogada.destino.y === jogadaParaEncontrar.destino.y &&
      jogada.destino.x === jogadaParaEncontrar.destino.x
    ) {
      return i; // Retorna o índice correto e sai da função imediatamente.
    }
  }
  return -1; // Retorna -1 se o loop terminar sem encontrar a jogada.
}

function materialInsuficiente() {
  let pecasEmJogo = [];

  // Percorre o tabuleiro para encontrar peças não-rei
  for (let linha of tabuleiroLogico) {
    for (let peca of linha) {
      if (!peca || peca.tipo === "rei") continue;

      pecasEmJogo.push(peca);

      // Se houver mais de 2 peças, já não é material insuficiente
      if (pecasEmJogo.length > 2) return false;
    }
  }

  if (pecasEmJogo.length === 0) return true;

  if (pecasEmJogo.length === 1) {
    let tipo = pecasEmJogo[0].tipo;
    // Rei contra cavalo ou bispo → empate
    return tipo === "cavalo" || tipo === "bispo";
  }

  if (pecasEmJogo.length === 2) {
    const [p1, p2] = pecasEmJogo;
    // Bispo x bispo no mesmo tipo de casa (ambos claros ou ambos escuros) → empate
    // peca.casas representa a cor do quadrado onde o bispo está
    return p1.tipo === "bispo" && p2.tipo === "bispo" && p1.casas === p2.casas;
  }

  return false;
}

function ehCheque(y, x, ny, nx) {
  // Cria uma cópia do tabuleiro para simular o movimento sem alterar o estado real
  let tabuleiroTestes = copiaTabuleiro(tabuleiroLogico);

  // Determina a cor do adversário
  let turnoOposto = turnoAtual === "branco" ? "preto" : "branco";

  // Pega as coordenadas atuais do rei do jogador que está movendo
  let reiX = posicoesReis[turnoAtual].coluna;
  let reiY = posicoesReis[turnoAtual].linha;

  // Pega a peça que vai se mover
  let peca = tabuleiroTestes[y][x];

  // Se a peça movida for o rei, atualiza a posição do rei para a nova casa
  if (peca && peca.tipo === "rei") {
    reiX = nx;
    reiY = ny;
  }

  // Executa o movimento na cópia do tabuleiro
  tabuleiroTestes[ny][nx] = peca;
  tabuleiroTestes[y][x] = null;

  // Verifica se, após o movimento, o rei do jogador atual está em cheque
  return verificaCheque(tabuleiroTestes, reiX, reiY, turnoOposto);
}

function estaEmCheque() {
  // Determina a cor do adversário
  let turnoOposto = turnoAtual === "branco" ? "preto" : "branco";

  // Pega as coordenadas do rei do jogador atual
  let reiX = posicoesReis[turnoAtual].coluna;
  let reiY = posicoesReis[turnoAtual].linha;

  // Verifica se o rei está em cheque no estado atual do tabuleiro
  return verificaCheque(tabuleiroLogico, reiX, reiY, turnoOposto);
}

function verificaCheque(tabuleiro, reiX, reiY, turnoOposto) {
  // Direção usada para movimentos de peões (branco para cima, preto para baixo)
  let direcao = turnoOposto === "branco" ? -1 : 1;

  // Lista de todas as jogadas possíveis do adversário
  let jogadasOponente = [];

  // Gera as jogadas possíveis do adversário no tabuleiro informado
  // O parâmetro `true` provavelmente indica que a verificação é apenas para ameaça (sem mover realmente as peças)
  verificaPossiveis(tabuleiro, jogadasOponente, direcao, turnoOposto, true);

  // Retorna true se alguma jogada adversária capturar a posição do rei
  return jogadasOponente.some(
    (j) => j.destino.y === reiY && j.destino.x === reiX
  );
}

function permiteSelecionar() {
  // Percorre todas as linhas do tabuleiro no DOM
  tabuleiroDOM.forEach((linha, i) => {
    listenersSelecionada[i] = []; // Prepara array para armazenar os listeners

    linha.forEach((element, j) => {
      // Cria função que chama efeitoSelecao com a célula e sua posição
      const wrapper = () => efeitoSelecao(element, i, j);

      listenersSelecionada[i][j] = wrapper; // Guarda para possível remoção
      element.addEventListener("click", wrapper); // Adiciona evento de clique
    });
  });
}

function efeitoSelecao(element, i, j) {
  // Remove marcações de jogadas anteriores
  limpaJogadas();

  // Caso já haja uma peça selecionada, remove o destaque dela
  if (temSelecionada) {
    tabuleiroDOM[indexSelecionada[0]][indexSelecionada[1]].removeAttribute(
      "id"
    );
  }

  // Se a célula clicada contém uma peça da vez atual
  if (element.classList.contains(turnoAtual)) {
    element.id = "selecionado"; // Destaca a peça
    temSelecionada = true; // Marca que há seleção ativa
    indexSelecionada = [i, j]; // Salva coordenadas da seleção
    mostraJogadas(i, j); // Mostra jogadas possíveis para essa peça
  } else {
    temSelecionada = false; // Nenhuma peça válida foi selecionada
  }
}

function mostraJogadas(i, j) {
  // Para cada jogada possível...
  for (const jogada of jogadasPossiveis) {
    // ... verifica se a jogada tem origem na posição (i,j)
    if (jogada.origem.x === j && jogada.origem.y === i) {
      // Pega a célula DOM do destino da jogada
      let celulaDestino = tabuleiroDOM[jogada.destino.y][jogada.destino.x];

      // Se a célula está vazia, coloca um ponto para indicar possibilidade de movimento
      if (celulaDestino.textContent == "") {
        celulaDestino.textContent = "•";
      } else {
        // Se não está vazia, significa que a peça ali pode ser capturada, então adiciona a classe "capturavel"
        celulaDestino.classList.add("capturavel");
      }

      // Pega o listener salvo para essa célula para removê-lo antes de adicionar outro
      const wrapper = listenersSelecionada[jogada.destino.y][jogada.destino.x];
      if (wrapper) celulaDestino.removeEventListener("click", wrapper);

      // Salva a célula e jogada para adicionar listener depois
      listenersJogadas.push({ celulaDestino, jogada });
    }
  }

  // Para cada destino possível, adiciona um listener para confirmar a jogada
  listenersJogadas.forEach((element, index) => {
    // Cria a função que confirma a jogada com os dados já fechados em closure
    const wrapper = () => confirmaJogada(element);

    // Adiciona o listener na célula do destino
    element.celulaDestino.addEventListener("click", wrapper);

    // Salva essa função para poder remover futuramente se precisar
    element.wrapper = wrapper;
  });
}

function limpaJogadas() {
  // Para cada jogada que tem listener ativo...
  for (const element of listenersJogadas) {
    // Se a célula destino mostra o marcador de movimento ("•"), remove-o
    if (element.celulaDestino.textContent === "•") {
      element.celulaDestino.textContent = "";
    }

    // Remove a classe que indica que a peça ali pode ser capturada
    element.celulaDestino.classList.remove("capturavel");

    // Remove o listener de clique associado a essa jogada
    element.celulaDestino.removeEventListener("click", element.wrapper);
  }

  // Limpa a lista de jogadas com listeners ativos para evitar vazamento de memória
  listenersJogadas = [];
}

function limpaTabuleiroDOM() {
  // Percorre todo o tabuleiro visual para limpar classes e listeners
  tabuleiroDOM.forEach((linha, i) => {
    linha.forEach((element, j) => {
      // Remove a indicação visual de peça capturável
      element.classList.remove("capturavel");

      // Pega o listener salvo para essa célula (se existir)
      const wrapper = listenersSelecionada[i]?.[j];

      if (wrapper) {
        // Remove o listener para evitar múltiplos listeners no futuro
        element.removeEventListener("click", wrapper);

        // Opcional: limpa a referência para liberar memória
        listenersSelecionada[i][j] = null;
      }
    });
  });

  // Reseta a matriz de listeners selecionados
  listenersSelecionada = [];

  // Limpa arrays e variáveis de controle relacionadas às jogadas e estado do jogo
  jogadasPossiveis = [];
  jogadasOponente = [];
  casaMediaP = {};
  casaMediaG = {};
  roqueG = null;
  roqueP = null;
  temSelecionada = false;

  // Limpa também as jogadas com listeners ativos (para garantir limpeza completa)
  limpaJogadas();
}

function confirmaJogada(element) {
  let promocaoNecessaria = false;
  let index = listenersJogadas.indexOf(element);
  turnoOposto = turnoAtual === "branco" ? "preto" : "branco";
  if (index !== -1) {
    // Remove o event listener
    element.celulaDestino.removeEventListener("click", element.wrapper);

    // Remove do array
    listenersJogadas.splice(index, 1);
  }

  // Mudando no tabuleiro DOM
  let cordY = element.jogada.origem.y;
  let cordX = element.jogada.origem.x;

  let cordDestinoY = element.jogada.destino.y;
  let cordDestinoX = element.jogada.destino.x;

  // Remove os efeitos da peça que vai ser jogada
  let celulaOrigem = tabuleiroDOM[cordY][cordX];
  celulaOrigem.classList.remove(`${turnoAtual}`);
  celulaOrigem.removeAttribute("id");

  let peca = celulaOrigem.textContent;

  // Prepara a casa de destino
  element.celulaDestino.classList.add(`${turnoAtual}`);
  element.celulaDestino.classList.remove(`${turnoOposto}`);
  element.celulaDestino.classList.remove("capturavel");

  element.celulaDestino.textContent = peca;
  celulaOrigem.textContent = "";

  // Mudando no tabuleiro Lógico
  let pecaLogica = tabuleiroLogico[cordY][cordX];
  let tipo = pecaLogica.tipo;
  switch (tipo) {
    case "rei":
      posicoesReis[turnoAtual].linha = cordDestinoY;
      posicoesReis[turnoAtual].coluna = cordDestinoX;

      // --- Lógica para o Roque: Movimento da Torre ---
      // Se o rei se moveu duas casas na horizontal, é um roque
      if (Math.abs(cordDestinoX - cordX) === 2) {
        let torreOrigemX, torreDestinoX;

        // Verifica se é roque pequeno (rei para a direita)
        if (cordDestinoX > cordX) {
          torreOrigemX = 7;
          torreDestinoX = 5;
        } else {
          // Caso contrário, é roque grande (rei para a esquerda)
          torreOrigemX = 0;
          torreDestinoX = 3;
        }

        // Mover a torre no tabuleiro Lógico
        let pecaTorre = tabuleiroLogico[cordY][torreOrigemX];
        tabuleiroLogico[cordY][torreDestinoX] = pecaTorre;
        tabuleiroLogico[cordY][torreOrigemX] = null;
        pecaTorre.movido = true; // Marcar a torre como movida

        // Mover a torre no tabuleiro DOM
        let celulaTorreOrigem = tabuleiroDOM[cordY][torreOrigemX];
        let celulaTorreDestino = tabuleiroDOM[cordY][torreDestinoX];
        celulaTorreDestino.textContent = celulaTorreOrigem.textContent;
        celulaTorreOrigem.textContent = "";

        celulaTorreDestino.classList.add(`${turnoAtual}`);
        celulaTorreOrigem.classList.remove(`${turnoAtual}`);
      }
    // sem break proposital, pois rei também deve ser marcado como movido
    case "torre":
      pecaLogica.movido = true;
      break;
    case "peao":
      const linhaFinal = turnoAtual === "branco" ? 0 : 7;
      if (cordDestinoY === linhaFinal) {
        promocaoNecessaria = true;
        promovePeao(
          pecaLogica,
          element,
          cordY,
          cordX,
          cordDestinoY,
          cordDestinoX,
          turnoOposto
        );
      } else if (Math.abs(cordDestinoY - cordY) == 2) {
        enPassantDisponivel = {
          x: cordDestinoX,
          y: (cordY + cordDestinoY) / 2,
          turno: contagemTurno + 1,
          origemX: cordDestinoX,
          origemY: cordDestinoY,
        };
      } else if (
        enPassantDisponivel &&
        contagemTurno === enPassantDisponivel.turno &&
        cordDestinoY === enPassantDisponivel.y &&
        cordDestinoX === enPassantDisponivel.x
      )
        jogaEnPassant(turnoOposto);
      break;
  }

  if (!promocaoNecessaria) {
    encerraTurno(
      pecaLogica,
      cordY,
      cordX,
      cordDestinoY,
      cordDestinoX,
      turnoOposto
    );
  }
}

function encerraTurno(
  pecaLogica,
  cordY,
  cordX,
  cordDestinoY,
  cordDestinoX,
  turnoOposto
) {
  // Remove a peça da posição origem no tabuleiro lógico (tabuleiro de dados)
  tabuleiroLogico[cordY][cordX] = null;

  // Guarda a peça que estava na posição de destino (se houver), ou undefined
  let capturada = tabuleiroLogico[cordDestinoY][cordDestinoX];

  // Move a peça para a posição de destino no tabuleiro lógico
  tabuleiroLogico[cordDestinoY][cordDestinoX] = pecaLogica;

  // Atualiza a interface das peças capturadas, passando o ícone da peça capturada (se existir)
  atualizaCapturadas(capturada?.icone);

  // Toca som de captura se houve peça capturada, senão toca som de movimento normal
  if (capturada) {
    somCaptura.play();
  } else {
    somMovimento.play();
  }

  // Alterna o turno para o adversário
  turnoAtual = turnoOposto;

  // Inicia as ações necessárias para o começo do próximo turno
  comecaTurno();
}

function atualizaCapturadas(capturada) {
  // Zera o valor total das peças capturadas para cada cor
  valorCapturadas.branco = 0;
  valorCapturadas.preto = 0;

  // Percorre todo o tabuleiro lógico para calcular o valor das peças restantes (exceto o rei)
  tabuleiroLogico.forEach((linha) => {
    linha.forEach((element) => {
      if (element && element.tipo != "rei") {
        // Soma o valor da peça baseado no seu ícone para a cor correspondente
        valorCapturadas[element.cor] += valorIcone[element.icone];
      }
    });
  });

  // Calcula a diferença de valor entre o jogador atual e o oponente
  valor = valorCapturadas[turnoAtual] - valorCapturadas[turnoOposto];
  valorOponente = -valor;

  // Formata o texto para mostrar o valor com sinal positivo ou negativo
  let texto = valor > 0 ? `+${valor}` : `${valor}`;
  let textoOponente =
    valorOponente > 0 ? `+${valorOponente}` : `${valorOponente}`;

  // Atualiza a primeira posição dos arrays de capturadas para mostrar a diferença de valor
  capturadas[turnoAtual][0] = texto;
  capturadas[turnoOposto][0] = textoOponente;

  // Se houve uma peça capturada nessa jogada, adiciona seu ícone ao array correspondente
  if (capturada) capturadas[turnoAtual].push(capturada);

  // Atualiza o texto no DOM mostrando as peças capturadas de cada lado
  capturadasBrancas.textContent = capturadas.branco.join(" ");
  capturadasPretas.textContent = capturadas.preto.join(" ");
}

function jogaEnPassant(turnoOposto) {
  // Obtém as coordenadas da posição original do peão que será capturado via en passant
  let y = enPassantDisponivel.origemY;
  let x = enPassantDisponivel.origemX;

  // Pega a célula correspondente no tabuleiro DOM
  casaPeao = tabuleiroDOM[y][x];

  // Remove visualmente o peão capturado (esvazia texto e remove a classe da cor oposta)
  casaPeao.textContent = "";
  casaPeao.classList.remove(`${turnoOposto}`);

  // Remove a peça do tabuleiro lógico, indicando que foi capturada
  tabuleiroLogico[y][x] = null;

  // Atualiza a exibição das peças capturadas, adicionando o peão capturado (ícone "♟︎")
  atualizaCapturadas("♟︎");
}

function promovePeao(
  pecaLogica,
  element,
  cordY,
  cordX,
  cordDestinoY,
  cordDestinoX,
  turnoOposto
) {
  // Seleciona o modal de promoção e o container dos botões de escolha
  const modalPromocao = document.getElementById("modal-promocao");
  const buttonContainer = document.querySelector("#buttonContainer");
  const promotionButtons = buttonContainer.querySelectorAll("button");

  // Exibe o modal para o usuário escolher a peça de promoção
  modalPromocao.style.display = "flex";

  // Adiciona um listener para cada botão de promoção
  promotionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Obtém o símbolo da peça selecionada no botão clicado
      const selectedPiece = button.textContent;

      // Atualiza o ícone da peça lógica e o conteúdo da célula destino no DOM
      pecaLogica.icone = selectedPiece;
      element.celulaDestino.textContent = selectedPiece;

      // Atualiza o tipo da peça lógica conforme a escolha do usuário
      switch (selectedPiece) {
        case "♛":
          pecaLogica.tipo = "dama";
          break;
        case "♞":
          pecaLogica.tipo = "cavalo";
          break;
        case "♜":
          pecaLogica.tipo = "torre";
          break;
        case "♝":
          pecaLogica.tipo = "bispo";
          break;
      }

      // Esconde o modal após a escolha
      modalPromocao.style.display = "none";

      // Encerra o turno, atualizando o estado do jogo após a promoção
      encerraTurno(
        pecaLogica,
        cordY,
        cordX,
        cordDestinoY,
        cordDestinoX,
        turnoOposto
      );
    });
  });
}

// Gera todas as jogadas possíveis para cada peça

function jogadasPeao(y, x, direcao, tabuleiro, turno) {
  let jogadas = [];
  // Verifica o movimento de andar uma casa
  if (estaDentro(y + direcao, x) && casaVazia(y + direcao, x, tabuleiro)) {
    jogadas.push({ origem: { y, x }, destino: { y: y + direcao, x } });
  }

  // Verifica o movimento de andar duas casa
  const linhaInicial = turnoAtual === "branco" ? 6 : 1;
  if (
    estaDentro(y + direcao * 2, x) &&
    y === linhaInicial &&
    casaVazia(y + direcao, x, tabuleiro) &&
    casaVazia(y + direcao * 2, x, tabuleiro)
  ) {
    jogadas.push({ origem: { y, x }, destino: { y: y + direcao * 2, x } });
  }

  // Verifica se é uma casa de captura (diagonal)
  if (
    estaDentro(y + direcao, x - 1) &&
    casaOponente(y + direcao, x - 1, tabuleiro, turno)
  ) {
    jogadas.push({ origem: { y, x }, destino: { y: y + direcao, x: x - 1 } });
  }

  if (
    estaDentro(y + direcao, x + 1) &&
    casaOponente(y + direcao, x + 1, tabuleiro, turno)
  ) {
    jogadas.push({ origem: { y, x }, destino: { y: y + direcao, x: x + 1 } });
  }

  // Verifica EnPassant
  if (
    enPassantDisponivel &&
    enPassantDisponivel.turno === contagemTurno &&
    y + direcao === enPassantDisponivel.y &&
    Math.abs(x - enPassantDisponivel.x) === 1
  ) {
    jogadas.push({
      origem: { y, x },
      destino: { y: enPassantDisponivel.y, x: enPassantDisponivel.x },
    });
  }

  return jogadas;
}

function jogadasRei(y, x, tabuleiro, turno, ignorarRoque) {
  let jogadas = [];
  const movimentos = [
    [-1, -1],
    [-1, 0],
    [-1, +1],
    [+1, -1],
    [+1, 0],
    [+1, +1],
    [0, -1],
    [0, +1],
  ];

  for (let [dy, dx] of movimentos) {
    const ny = y + dy;
    const nx = x + dx;

    if (
      estaDentro(ny, nx) &&
      (casaVazia(ny, nx, tabuleiro) || casaOponente(ny, nx, tabuleiro, turno))
    ) {
      jogadas.push({
        origem: { y, x },
        destino: { y: ny, x: nx },
      });
    }
  }

  if (!ignorarRoque && !tabuleiro[y][x].movido && !ehCheque(y, x, y, x)) {
    // roque pequeno
    if (
      tabuleiro[y][7] &&
      tabuleiro[y][7].tipo === "torre" &&
      !tabuleiro[y][7].movido &&
      casaVazia(y, 5, tabuleiro) &&
      casaVazia(y, 6, tabuleiro)
    ) {
      jogadas.push({
        origem: { y, x },
        destino: { y, x: 6 },
        roque: "pequeno",
      });
      casaMediaP = { origem: { y, x }, destino: { y, x: 5 } };
      roqueP = {
        origem: { y, x },
        destino: { y, x: 6 },
        roque: "pequeno",
      };
    }

    // roque grande
    if (
      tabuleiro[y][0] &&
      tabuleiro[y][0].tipo === "torre" &&
      !tabuleiro[y][0].movido &&
      casaVazia(y, 1, tabuleiro) &&
      casaVazia(y, 2, tabuleiro) &&
      casaVazia(y, 3, tabuleiro)
    ) {
      jogadas.push({
        origem: { y, x },
        destino: { y, x: 2 },
        roque: "grande",
      });
      casaMediaG = { origem: { y, x }, destino: { y, x: 3 } };
      roqueG = {
        origem: { y, x },
        destino: { y, x: 2 },
        roque: "grande",
      };
    }
  }

  return jogadas;
}

function jogadasCavalo(y, x, tabuleiro, turno) {
  let jogadas = [];
  const movimentos = [
    [-2, -1],
    [-2, +1],
    [-1, -2],
    [-1, +2],
    [+1, -2],
    [+1, +2],
    [+2, -1],
    [+2, +1],
  ];

  for (let [dy, dx] of movimentos) {
    const ny = y + dy;
    const nx = x + dx;

    if (
      estaDentro(ny, nx) &&
      (casaVazia(ny, nx, tabuleiro) || casaOponente(ny, nx, tabuleiro, turno))
    ) {
      jogadas.push({
        origem: { y, x },
        destino: { y: ny, x: nx },
      });
    }
  }

  return jogadas;
}

function jogadasBispo(y, x, tabuleiro, turno) {
  let jogadas = [];
  const movimentos = [
    [-1, -1],
    [-1, +1],
    [+1, -1],
    [+1, +1],
  ];

  let casaBloqueada = false;

  for (let [dy, dx] of movimentos) {
    let ny = y + dy;
    let nx = x + dx;

    while (!casaBloqueada) {
      if (
        estaDentro(ny, nx) &&
        (casaVazia(ny, nx, tabuleiro) || casaOponente(ny, nx, tabuleiro, turno))
      ) {
        if (casaOponente(ny, nx, tabuleiro, turno)) {
          casaBloqueada = true;
        }
        jogadas.push({
          origem: { y, x },
          destino: { y: ny, x: nx },
        });
      } else {
        casaBloqueada = true;
      }
      ny += dy;
      nx += dx;
    }

    casaBloqueada = false;
  }

  return jogadas;
}

function jogadasTorre(y, x, tabuleiro, turno) {
  let jogadas = [];
  const movimentos = [
    [-1, 0],
    [0, +1],
    [0, -1],
    [+1, 0],
  ];

  let casaBloqueada = false;

  for (let [dy, dx] of movimentos) {
    let ny = y + dy;
    let nx = x + dx;

    while (!casaBloqueada) {
      if (
        estaDentro(ny, nx) &&
        (casaVazia(ny, nx, tabuleiro) || casaOponente(ny, nx, tabuleiro, turno))
      ) {
        if (casaOponente(ny, nx, tabuleiro, turno)) {
          casaBloqueada = true;
        }
        jogadas.push({
          origem: { y, x },
          destino: { y: ny, x: nx },
        });
      } else {
        casaBloqueada = true;
      }
      ny += dy;
      nx += dx;
    }

    casaBloqueada = false;
  }

  return jogadas;
}

// Verifica se é uma casa dentro dos limites do tabuleiro
function estaDentro(y, x) {
  return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

// Verifica se é uma casa vazia no tabuleiro
function casaVazia(ny, nx, tabuleiro) {
  return !tabuleiro[ny][nx];
}

// Verifica se há uma peça do oponente nessa casa
function casaOponente(ny, nx, tabuleiro, turno) {
  return tabuleiro[ny][nx] && tabuleiro[ny][nx].cor !== turno;
}

// Função assíncrona que decrementa o tempo do jogador do turno
function cronometro() {
  if (intervaloCronometro) {
    clearInterval(intervaloCronometro); // Para o cronômetro anterior, se houver
  }

  intervaloCronometro = setInterval(() => {
    if (!fimPartida) {
      calculaTempoDOM(--tempos[turnoAtual]);
      atualizaTempoDOM();
    }

    if (tempos[turnoAtual] === 0) {
      clearInterval(intervaloCronometro);
      acabaPartida(turnoOposto, "tempo");
    }
  }, 1000);
}

// Avisa como o jogo acabou e por qual motivo
function acabaPartida(vencedor, motivo) {
  const modalFimDeJogo = document.getElementById("modal-fim-de-jogo");
  const mensagemFimDeJogo = document.getElementById("mensagem-fim-de-jogo");
  const botaoFechar = document.getElementById("fechar");
  fimPartida = true;

  let mensagem;
  if (vencedor == "empate") {
    mensagem = `O jogo empatou por ${motivo}`;
  } else {
    let vencedorTxt = vencedor === "branco" ? "Brancas" : "Pretas";
    mensagem = `As ${vencedorTxt} venceram por ${motivo}`;
  }

  mensagemFimDeJogo.textContent = mensagem;
  modalFimDeJogo.style.display = "flex";

  botaoFechar.addEventListener("click", () => {
    modalFimDeJogo.style.display = "none";
  });
}

// Arruma o tempo em strings padrões e atualiza na tela
function calculaTempoDOM(tempo) {
  min = Math.floor(tempo / 60);
  seg = tempo % 60;

  // Agora transforma em string com 2 dígitos
  minStr = String(min).padStart(2, "0");
  segStr = String(seg).padStart(2, "0");
}

function atualizaTempoDOM() {
  switch (turnoAtual) {
    case "branco":
      timerBranco.textContent = `${minStr}:${segStr}`;
      break;
    case "preto":
      timerPreto.textContent = `${minStr}:${segStr}`;
      break;
  }
}

// Cria o tabuleiro onde o jogo acontece (não a parte visual)
function criarTabuleiroLogico() {
  const linhaPeoesPretos = Array(8).fill({
    tipo: "peao",
    cor: "preto",
    enPassant: false,
    icone: "♟︎",
  });
  const linhaPeoesBrancos = Array(8).fill({
    tipo: "peao",
    cor: "branco",
    enPassant: false,
    icone: "♟︎",
  });

  return [
    [
      { tipo: "torre", cor: "preto", movido: false, icone: "♜" },
      { tipo: "cavalo", cor: "preto", icone: "♞" },
      { tipo: "bispo", cor: "preto", icone: "♝", casas: "white" },
      { tipo: "dama", cor: "preto", icone: "♛" },
      { tipo: "rei", cor: "preto", movido: false, icone: "♚" },
      { tipo: "bispo", cor: "preto", icone: "♝", casas: "black" },
      { tipo: "cavalo", cor: "preto", icone: "♞" },
      { tipo: "torre", cor: "preto", movido: false, icone: "♜" },
    ],
    linhaPeoesPretos.map((p) => ({ ...p })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    linhaPeoesBrancos.map((p) => ({ ...p })),
    [
      { tipo: "torre", cor: "branco", movido: false, icone: "♜" },
      { tipo: "cavalo", cor: "branco", icone: "♞" },
      { tipo: "bispo", cor: "branco", icone: "♝", casas: "black" },
      { tipo: "dama", cor: "branco", icone: "♛" },
      { tipo: "rei", cor: "branco", movido: false, icone: "♚" },
      { tipo: "bispo", cor: "branco", icone: "♝", casas: "white" },
      { tipo: "cavalo", cor: "branco", icone: "♞" },
      { tipo: "torre", cor: "branco", movido: false, icone: "♜" },
    ],
  ];
}

// Copia um tabuleiro para outro, utilizado para atualizar sempre o tabuleiro de testes
function copiaTabuleiro(tabuleiroOrig) {
  return tabuleiroOrig.map((row) =>
    row.map((cell) => {
      if (cell === null) return null;
      return { ...cell }; // copia rasa do objeto
    })
  );
}
