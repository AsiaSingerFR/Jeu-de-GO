document.addEventListener('DOMContentLoaded', () => {
    const screens = document.querySelectorAll('.screen');
    const mainMenu = document.getElementById('main-menu');
    const difficultyMenu = document.getElementById('difficulty-menu');
    const gameScreen = document.getElementById('game-screen');
    const rulesScreen = document.getElementById('rules-screen');
    const donateScreen = document.getElementById('donate-screen');

    const playBtn = document.getElementById('play-btn');
    const rulesBtn = document.getElementById('rules-btn');
    const donateBtn = document.getElementById('donate-btn');
    const backToMainBtns = document.querySelectorAll('.back-to-main');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');

    const boardElement = document.getElementById('board');
    const turnElement = document.getElementById('turn');
    const blackCapturesElement = document.getElementById('black-captures');
    const whiteCapturesElement = document.getElementById('white-captures');
    const passBtn = document.getElementById('pass-btn');

    let boardSize;
    let board;
    let currentPlayer = 'black';
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let currentDifficulty = 'easy'; // Default difficulty
    let passedTurns = 0;

    function showScreen(screen) {
        screens.forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    playBtn.addEventListener('click', () => showScreen(difficultyMenu));
    rulesBtn.addEventListener('click', () => showScreen(rulesScreen));
    donateBtn.addEventListener('click', () => showScreen(donateScreen));

    backToMainBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen(mainMenu);
            // Reset game state when returning to main menu
            board = [];
            currentPlayer = 'black';
            blackCaptures = 0;
            whiteCaptures = 0;
            passedTurns = 0;
        });
    });

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentDifficulty = btn.dataset.difficulty;
            startGame();
        });
    });

    passBtn.addEventListener('click', () => {
        passedTurns++;
        if (passedTurns >= 2) {
            endGame();
        } else {
            switchPlayer();
            if (currentDifficulty !== 'two-players' && currentPlayer === 'white') {
                setTimeout(() => {
                    if (currentDifficulty === 'easy') {
                        aiTurnEasy();
                    } else if (currentDifficulty === 'medium') {
                        aiTurnMedium();
                    } else if (currentDifficulty === 'hard') {
                        aiTurnHard();
                    }
                }, 500);
            }
        }
    });

    function startGame() {
        console.log(`Starting game with difficulty: ${currentDifficulty}`);
        showScreen(gameScreen);

        if (currentDifficulty === 'easy') {
            boardSize = 9;
        } else if (currentDifficulty === 'medium') {
            boardSize = 13;
        } else {
            boardSize = 19;
        }

        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
        currentPlayer = 'black';
        blackCaptures = 0;
        whiteCaptures = 0;
        passedTurns = 0;

        turnElement.textContent = 'Noir';
        blackCapturesElement.textContent = '0';
        whiteCapturesElement.textContent = '0';

        createBoard();
    }

    function createBoard() {
        boardElement.innerHTML = '';
        const intersectionSize = 30; // px
        boardElement.style.gridTemplateColumns = `repeat(${boardSize}, ${intersectionSize}px)`;
        boardElement.style.gridTemplateRows = `repeat(${boardSize}, ${intersectionSize}px)`;
        boardElement.style.width = `${boardSize * intersectionSize}px`;
        boardElement.style.height = `${boardSize * intersectionSize}px`;

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const intersection = document.createElement('div');
                intersection.classList.add('intersection');
                intersection.dataset.row = i;
                intersection.dataset.col = j;
                intersection.style.width = `${intersectionSize}px`;
                intersection.style.height = `${intersectionSize}px`;
                intersection.addEventListener('click', handleIntersectionClick);
                boardElement.appendChild(intersection);
            }
        }
    }

    function handleIntersectionClick(event) {
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);

        if (board[row][col] === null) {
            placeStone(row, col);
            passedTurns = 0; // Reset passed turns on a valid move
            if (currentDifficulty !== 'two-players' && currentPlayer === 'white') { // AI's turn
                setTimeout(() => {
                    if (currentDifficulty === 'easy') {
                        aiTurnEasy();
                    } else if (currentDifficulty === 'medium') {
                        aiTurnMedium();
                    } else if (currentDifficulty === 'hard') {
                        aiTurnHard();
                    }
                }, 500);
            }
        }
    }

    function endGame() {
        const score = calculateScore();
        let message = "Partie terminée !\n";
        message += `Score Noir: ${score.black} points\n`;
        message += `Score Blanc: ${score.white} points\n`;

        if (score.black > score.white) {
            message += "Le joueur Noir gagne !";
        } else if (score.white > score.black) {
            message += "Le joueur Blanc gagne !";
        } else {
            message += "Égalité !";
        }
        alert(message);
        showScreen(mainMenu);
    }

    function calculateScore() {
        let blackTerritory = 0;
        let whiteTerritory = 0;
        const komi = 6.5; // Komi for White

        const visitedTerritory = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === null && !visitedTerritory[r][c]) {
                    const territoryGroup = getTerritoryGroup(r, c, visitedTerritory);
                    if (territoryGroup.owner === 'black') {
                        blackTerritory += territoryGroup.size;
                    } else if (territoryGroup.owner === 'white') {
                        whiteTerritory += territoryGroup.size;
                    }
                }
            }
        }

        return {
            black: blackTerritory + blackCaptures,
            white: whiteTerritory + whiteCaptures + komi
        };
    }

    function getTerritoryGroup(startRow, startCol, visitedTerritory) {
        const queue = [{ row: startRow, col: startCol }];
        const territory = [];
        let owner = null; // null, 'black', 'white', or 'contested'
        const visited = new Set();

        visited.add(`${startRow},${startCol}`);
        territory.push({ row: startRow, col: startCol });
        visitedTerritory[startRow][startCol] = true;

        while (queue.length > 0) {
            const { row, col } = queue.shift();

            const neighbors = getNeighbors(row, col);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (visited.has(neighborKey)) {
                    continue;
                }
                visited.add(neighborKey);

                if (board[neighbor.row][neighbor.col] === null) {
                    queue.push(neighbor);
                    territory.push({ row: neighbor.row, col: neighbor.col });
                    visitedTerritory[neighbor.row][neighbor.col] = true;
                } else {
                    // Neighbor is a stone
                    if (owner === null) {
                        owner = board[neighbor.row][neighbor.col];
                    } else if (owner !== board[neighbor.row][neighbor.col]) {
                        owner = 'contested'; // Territory is surrounded by both colors
                    }
                }
            }
        }

        return { size: territory.length, owner: owner === 'contested' ? null : owner };
    }

    function aiTurnEasy() {
        const emptyIntersections = [];
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                if (board[i][j] === null) {
                    emptyIntersections.push({ row: i, col: j });
                }
            }
        }

        if (emptyIntersections.length > 0) {
            const randomIndex = Math.floor(Math.random() * emptyIntersections.length);
            const { row, col } = emptyIntersections[randomIndex];
            placeStone(row, col);
        }
    }

    function aiTurnMedium() {
        const opponent = currentPlayer === 'black' ? 'white' : 'black';
        const emptyIntersections = [];
        const captureMoves = [];

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === null) {
                    emptyIntersections.push({ row: r, col: c });

                    // Simulate placing a stone to check for captures
                    const tempBoard = getBoardCopy(board);
                    tempBoard[r][c] = currentPlayer;

                    const neighbors = getNeighbors(r, c);
                    for (const neighbor of neighbors) {
                        if (tempBoard[neighbor.row][neighbor.col] === opponent) {
                            const group = getGroupFromSimulatedBoard(tempBoard, neighbor.row, neighbor.col);
                            if (group.liberties === 0) {
                                captureMoves.push({ row: r, col: c });
                                break; // Found a capture, no need to check other neighbors for this spot
                            }
                        }
                    }
                }
            }
        }

        if (captureMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * captureMoves.length);
            const { row, col } = captureMoves[randomIndex];
            placeStone(row, col);
        } else if (emptyIntersections.length > 0) {
            const randomIndex = Math.floor(Math.random() * emptyIntersections.length);
            const { row, col } = emptyIntersections[randomIndex];
            placeStone(row, col);
        }
    }

    function aiTurnHard() {
        const opponent = currentPlayer === 'black' ? 'white' : 'black';
        const emptyIntersections = [];
        const captureMoves = [];
        const bestMoves = []; // To store moves that maximize liberties for own groups

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === null) {
                    emptyIntersections.push({ row: r, col: c });

                    // Simulate placing a stone to check for captures
                    const tempBoard = getBoardCopy(board);
                    tempBoard[r][c] = currentPlayer;

                    let capturesFound = false;
                    const neighbors = getNeighbors(r, c);
                    for (const neighbor of neighbors) {
                        if (tempBoard[neighbor.row][neighbor.col] === opponent) {
                            const group = getGroupFromSimulatedBoard(tempBoard, neighbor.row, neighbor.col);
                            if (group.liberties === 0) {
                                captureMoves.push({ row: r, col: c });
                                capturesFound = true;
                                break;
                            }
                        }
                    }

                    // If no captures, evaluate for maximizing own liberties
                    if (!capturesFound) {
                        const ownGroup = getGroupFromSimulatedBoard(tempBoard, r, c);
                        if (ownGroup.liberties > 0) { // Avoid suicide moves
                            bestMoves.push({ row: r, col: c, liberties: ownGroup.liberties });
                        }
                    }
                }
            }
        }

        if (captureMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * captureMoves.length);
            const { row, col } = captureMoves[randomIndex];
            placeStone(row, col);
        } else if (bestMoves.length > 0) {
            // Sort by liberties in descending order and pick one of the best
            bestMoves.sort((a, b) => b.liberties - a.liberties);
            const maxLiberties = bestMoves[0].liberties;
            const topMoves = bestMoves.filter(move => move.liberties === maxLiberties);
            const randomIndex = Math.floor(Math.random() * topMoves.length);
            const { row, col } = topMoves[randomIndex];
            placeStone(row, col);
        } else if (emptyIntersections.length > 0) {
            const randomIndex = Math.floor(Math.random() * emptyIntersections.length);
            const { row, col } = emptyIntersections[randomIndex];
            placeStone(row, col);
        }
    }

    function placeStone(row, col) {
        if (board[row][col] !== null) {
            return;
        }

        board[row][col] = currentPlayer;

        const opponent = currentPlayer === 'black' ? 'white' : 'black';
        let capturedStones = 0;

        const neighbors = getNeighbors(row, col);
        for (const neighbor of neighbors) {
            if (board[neighbor.row][neighbor.col] === opponent) {
                const group = getGroup(neighbor.row, neighbor.col);
                if (group.liberties === 0) {
                    capturedStones += group.stones.length;
                    removeGroup(group);
                }
            }
        }

        const ownGroup = getGroup(row, col);
        if (ownGroup.liberties === 0 && capturedStones === 0) {
            board[row][col] = null;
            console.log("Suicide move is not allowed.");
            return;
        }

        const stone = document.createElement('div');
        stone.classList.add('stone', currentPlayer);
        const intersection = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
        intersection.appendChild(stone);

        if (currentPlayer === 'black') {
            blackCaptures += capturedStones;
            blackCapturesElement.textContent = blackCaptures;
        } else {
            whiteCaptures += capturedStones;
            whiteCapturesElement.textContent = whiteCaptures;
        }

        passedTurns = 0; // Reset passed turns on a valid move
        switchPlayer();
    }

    function removeGroup(group) {
        for (const stone of group.stones) {
            board[stone.row][stone.col] = null;
            const intersection = document.querySelector(`[data-row='${stone.row}'][data-col='${stone.col}']`);
            intersection.innerHTML = '';
        }
    }

    function getNeighbors(row, col) {
        const neighbors = [];
        if (row > 0) neighbors.push({ row: row - 1, col });
        if (row < boardSize - 1) neighbors.push({ row: row + 1, col });
        if (col > 0) neighbors.push({ row, col: col - 1 });
        if (col < boardSize - 1) neighbors.push({ row, col: col + 1 });
        return neighbors;
    }

    function getGroup(startRow, startCol) {
        const color = board[startRow][startCol];
        if (color === null) {
            return { stones: [], liberties: 0 };
        }

        const stones = [];
        const liberties = new Set();
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        visited.add(`${startRow},${startCol}`);

        while (queue.length > 0) {
            const { row, col } = queue.shift();
            stones.push({ row, col });

            const neighbors = getNeighbors(row, col);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (visited.has(neighborKey)) {
                    continue;
                }
                visited.add(neighborKey);

                const neighborColor = board[neighbor.row][neighbor.col];
                if (neighborColor === null) {
                    liberties.add(neighborKey);
                } else if (neighborColor === color) {
                    queue.push(neighbor);
                }
            }
        }

        return { stones, liberties: liberties.size };
    }

    function getBoardCopy(originalBoard) {
        return originalBoard.map(row => [...row]);
    }

    function getGroupFromSimulatedBoard(currentBoardState, startRow, startCol) {
        const color = currentBoardState[startRow][startCol];
        if (color === null) {
            return { stones: [], liberties: 0 };
        }

        const stones = [];
        const liberties = new Set();
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        visited.add(`${startRow},${startCol}`);

        while (queue.length > 0) {
            const { row, col } = queue.shift();
            stones.push({ row, col });

            const neighbors = getNeighbors(row, col);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (visited.has(neighborKey)) {
                    continue;
                }
                visited.add(neighborKey);

                const neighborColor = currentBoardState[neighbor.row][neighbor.col];
                if (neighborColor === null) {
                    liberties.add(neighborKey);
                } else if (neighborColor === color) {
                    queue.push(neighbor);
                }
            }
        }

        return { stones, liberties: liberties.size };
    }

    function switchPlayer() {
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        turnElement.textContent = currentPlayer === 'black' ? 'Noir' : 'Blanc';
    }
});
