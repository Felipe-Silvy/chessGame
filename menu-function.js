document.getElementById("jogar").addEventListener("click", () => {
  const tempoSelecionado = document.querySelector(
    'input[name="tempo"]:checked'
  );
  if (tempoSelecionado) {
    localStorage.setItem("tempo", `${tempoSelecionado.value}`);
    window.location.href = "game.html";
    console.log(tempo);
    // Aqui você poderia iniciar o jogo de xadrez real usando JavaScript
  } else {
    alert("Escolha um tempo para iniciar o jogo.");
  }
});
