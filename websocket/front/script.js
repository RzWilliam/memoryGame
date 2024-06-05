const socket = io('http://localhost:3000');
let room = '';
let username = '';
let opponent = '';
let currentPlayer = '';
let cards = [];

const roomArea = document.querySelector('#room');
const playersArea = document.querySelector('#players');
const turnArea = document.querySelector('#turn');
const gameArea = document.querySelector('.game');
const cardsContainer = document.querySelector('.cards');
const player1PairsArea = document.querySelector('#player1Pairs');
const player2PairsArea = document.querySelector('#player2Pairs');
let usernameInput = document.querySelector('#usernameInput');
let roomInput = document.querySelector('#roomInput');

document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    room = roomInput.value;
    username = usernameInput.value;
    socket.emit('join', room, username);
    document.querySelector('.connect').remove();
    gameArea.style.display = 'block';
});

socket.on('join', (room, username, players) => {
    roomArea.innerText = `Room: ${room}`;
    if (players.length === 1) {
        playersArea.innerText = `${username} VS Waiting for more players`;
    } else if (players.length === 2) {
        opponent = players.find(player => player.username !== username).username;
        playersArea.innerText = `${username} VS ${opponent}`;
        player1PairsArea.innerText = '0';
        player2PairsArea.innerText = '0';
    }
});

socket.on('roomFull', () => {
    alert('The room is full. Please join another room.');
});

socket.on('startGame', (receivedCards, firstPlayer) => {
    cards = receivedCards;
    displayCards(cards);
    currentPlayer = firstPlayer;
    updateTurnIndicator();
});

socket.on('turnChange', (nextPlayer) => {
    currentPlayer = nextPlayer;
    updateTurnIndicator();
});

socket.on('cardSelected', (cardIndex, playerId) => {
    revealCard(cardIndex);
});

socket.on('matchFound', (firstCardIndex, secondCardIndex) => {
    markMatched(firstCardIndex, secondCardIndex);
});

socket.on('updatePairCount', (playerId, count) => {
    if (playerId === socket.id) {
        player1PairsArea.innerText = count;
    } else {
        player2PairsArea.innerText = count;
    }
});

socket.on('noMatch', (firstCardIndex, secondCardIndex) => {
    setTimeout(() => {
        hideCard(firstCardIndex);
        hideCard(secondCardIndex);
    }, 1000); // Hide cards after 1 second if they do not match
});

socket.on('gameOver', (winner, player1Pairs, player2Pairs) => {
    alert(`Game Over! Winner: ${winner} - Pairs: ${player1Pairs} vs ${player2Pairs}`);
});

function displayCards(cards) {
    cardsContainer.innerHTML = '';
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.classList.add('back');
        cardElement.dataset.index = index;
        cardElement.innerHTML = `
            <img src='./logo/${card}.png'/>
        `
        cardElement.addEventListener('click', () => selectCard(index));
        cardsContainer.appendChild(cardElement);
    });
}

function revealCard(cardIndex) {
    const cardElement = document.querySelector(`.card[data-index='${cardIndex}']`);
    cardElement.classList.remove('back')
    cardElement.classList.add('front')
}

function hideCard(cardIndex) {
    const cardElement = document.querySelector(`.card[data-index='${cardIndex}']`);
    cardElement.classList.add('back')
    cardElement.classList.remove('front')
}

function markMatched(firstCardIndex, secondCardIndex) {
    const firstCardElement = document.querySelector(`.card[data-index='${firstCardIndex}']`);
    const secondCardElement = document.querySelector(`.card[data-index='${secondCardIndex}']`);
    firstCardElement.classList.add('matched');
    secondCardElement.classList.add('matched');
}

function selectCard(cardIndex) {
    if (username === currentPlayer) {
        socket.emit('selectCard', room, cardIndex);
    }
}

function updateTurnIndicator() {
    turnArea.innerText = `Current Turn: ${currentPlayer}`;
}
