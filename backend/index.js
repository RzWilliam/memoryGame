import express from 'express';
import http from 'http';
import ip from 'ip';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.use(cors());

app.get('/', (req, res) => {
    res.json('ip address: http://' + ip.address() + ':' + PORT);
});

const TECHNOLOGIES = ['php', 'socket', 'vue', 'css', 'js', 'python', 'svelte', 'ts', 'symfony', 'ruby', 'bun', 'laravel', 'tailwind', 'scss', 'node'];
const MAX_PLAYERS_PER_ROOM = 2;

const rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        socket.broadcast.emit('user disconnected');
        // Handle user disconnection
    });

    socket.on('join', (room, username) => {
        if (!rooms[room]) {
            rooms[room] = {
                players: [],
                cards: [],
                matchedCards: [],
                selectedCards: [],
                currentPlayer: 0,
                pairCounts: {}
            };
        }

        if (rooms[room].players.length < MAX_PLAYERS_PER_ROOM) {
            rooms[room].players.push({ id: socket.id, username });
            rooms[room].pairCounts[socket.id] = 0;
            socket.join(room);
            io.to(room).emit('join', room, username, rooms[room].players);

            if (rooms[room].players.length === MAX_PLAYERS_PER_ROOM) {
                startGame(room);
            }
        } else {
            socket.emit('roomFull');
        }
    });

    socket.on('leave', (room) => {
        socket.leave(room);
        io.to(room).emit('leave', room);
    });

    socket.on('selectCard', (room, cardName, cardIndex) => {
        handleCardSelection(room, cardName ,cardIndex, socket.id);
    });

    function startGame(room) {
        const shuffledCards = [...TECHNOLOGIES, ...TECHNOLOGIES].sort(() => 0.5 - Math.random());
        rooms[room].cards = shuffledCards;
        io.to(room).emit('startGame', shuffledCards, rooms[room].players[0].username);
    }

    function handleCardSelection(room, cardName, cardIndex, playerId) {
        const roomData = rooms[room];
        if (roomData.players[roomData.currentPlayer].id === playerId && !roomData.matchedCards.includes(cardIndex)) {
            io.to(room).emit('cardSelected', cardName, cardIndex, playerId);

            const selectedCards = roomData.selectedCards || [];
            selectedCards.push(cardIndex);

            if (selectedCards.length === 2) {
                const [firstCardIndex, secondCardIndex] = selectedCards;
                if (roomData.cards[firstCardIndex] === roomData.cards[secondCardIndex]) {
                    roomData.matchedCards.push(firstCardIndex, secondCardIndex);
                    roomData.pairCounts[playerId] += 1;
                    io.to(room).emit('matchFound', firstCardIndex, secondCardIndex);
                    io.to(room).emit('updatePairCount', playerId, roomData.pairCounts[playerId]);

                    // Check if the game is over
                    if (roomData.matchedCards.length === roomData.cards.length) {
                        endGame(room);
                    }
                } else {
                    io.to(room).emit('noMatch', firstCardIndex, secondCardIndex);
                    roomData.currentPlayer = (roomData.currentPlayer + 1) % MAX_PLAYERS_PER_ROOM;
                }
                roomData.selectedCards = [];
                io.to(room).emit('turnChange', roomData.players[roomData.currentPlayer].username);
            } else {
                roomData.selectedCards = selectedCards;
            }
        }
    }

    function endGame(room) {
        const roomData = rooms[room];
        const player1 = roomData.players[0];
        const player2 = roomData.players[1];
        const player1Pairs = roomData.pairCounts[player1.id];
        const player2Pairs = roomData.pairCounts[player2.id];

        let winner = '';
        if (player1Pairs > player2Pairs) {
            winner = player1.username;
        } else if (player2Pairs > player1Pairs) {
            winner = player2.username;
        } else {
            winner = 'It\'s a tie!';
        }

        io.to(room).emit('gameOver', winner, player1Pairs, player2Pairs);
    }
});

server.listen(PORT, () => {
    console.log('Server ip : http://' + ip.address() + ":" + PORT);
});
