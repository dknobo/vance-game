// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Clear old localStorage entries to start fresh
    localStorage.removeItem('jdVanceHighScores');
    console.log("Cleared old localStorage entries");

    // Firebase configuration (replace with your config from Firebase Console)
    const firebaseConfig = {
        apiKey: "AIzaSyByOhobKcdjMyF8UdmSegjYJAtBlZsa_H8",
        authDomain: "vance-game.firebaseapp.com",
        projectId: "vance-game",
        storageBucket: "vance-game.firebasestorage.app",
        messagingSenderId: "67440715642",
        appId: "1:67440715642:web:143e2321e29b993f4a98c3"
    };

    // Initialize Firebase
    let db;
    let useFirebase = false;
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase initialized successfully");

        // Test Firebase connection by fetching a collection
        db.collection("highscores").get().then(() => {
            console.log("Firebase connection test successful");
            useFirebase = true;
        }).catch((error) => {
            console.error("Firebase connection test failed:", error);
            useFirebase = false;
        });
    } catch (e) {
        console.error("Failed to initialize Firebase:", e);
        useFirebase = false;
    }

    const gameBoard = document.getElementById('game-board');
    const message = document.getElementById('message');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const streakDisplay = document.getElementById('streak');
    const restartButton = document.getElementById('restart');
    const winScreen = document.getElementById('win-screen');
    const winImage = document.getElementById('win-image');
    const finalScoreDisplay = document.getElementById('final-score');
    const highScoresDisplay = document.getElementById('high-scores');
    const scoreDisplayElement = document.getElementById('score-display');
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let canClick = true;
    let clicks = 0;
    let seconds = 0;
    let timerInterval = null;
    let streak = 0;
    let streakBonus = 0;
    let missCount = 0;
    let currentScore = 0;
    let cardFiles = [];

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const sillyCaptions = [
        "JD Vance: Senator or Multiverse Meme Lord?",
        "Another day, another couch meme!",
        "Face swap level: Expert JD!",
        "Vance-ing through the memeiverse!",
        "JD Vance: The Meme That Keeps on Giving!",
        "Swap it like it’s hot!",
        "Meme-ory match perfection!",
        "JD’s face, everywhere but the Senate!",
        "Couch guy strikes again!",
        "Vance-tastic meme overload!"
    ];

    function playSound(frequency, duration, type = 'sine') {
        const oscillator1 = audioCtx.createOscillator();
        const oscillator2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator1.type = type;
        oscillator2.type = 'sawtooth';
        oscillator1.frequency.value = frequency;
        oscillator2.frequency.value = frequency * 0.5;
        gainNode.gain.value = 0.1;
        oscillator1.start();
        oscillator2.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator1.stop(audioCtx.currentTime + duration);
        oscillator2.stop(audioCtx.currentTime + duration);
    }

    function playBeepSound() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => playSound(300, 0.2, 'square'), i * 250);
        }
    }

    function createParticles(card1, card2, streakLevel) {
        const rect1 = card1.getBoundingClientRect();
        const rect2 = card2.getBoundingClientRect();
        const gameBoardRect = gameBoard.getBoundingClientRect();
        
        const origins = [
            { x: rect1.left + rect1.width / 2 - gameBoardRect.left, y: rect1.top + rect1.height / 2 - gameBoardRect.top },
            { x: rect2.left + rect2.width / 2 - gameBoardRect.left, y: rect2.top + rect2.height / 2 - gameBoardRect.top }
        ];

        const particleCount = 100 + (streakLevel - 1) * 50;
        const particleSize = Math.min(16 + (streakLevel - 1) * 2, 30);

        origins.forEach(origin => {
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                if (i % 2 === 0) particle.classList.add('orange');
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * 800 + 50;
                const xMove = Math.cos(angle) * distance;
                const yMove = Math.sin(angle) * distance;
                particle.style.setProperty('--x', `${xMove}px`);
                particle.style.setProperty('--y', `${yMove}px`);
                particle.style.left = `${origin.x}px`;
                particle.style.top = `${origin.y}px`;
                particle.style.width = `${particleSize}px`;
                particle.style.height = `${particleSize}px`;
                gameBoard.appendChild(particle);
                setTimeout(() => particle.remove(), 1200);
            }
        });
    }

    function animatePoints(points, card) {
        const rect = card.getBoundingClientRect();
        const gameBoardRect = gameBoard.getBoundingClientRect();
        const pointElement = document.createElement('div');
        pointElement.classList.add('score-point');
        pointElement.textContent = `+${points}`;
        pointElement.style.left = `${rect.left + rect.width / 2 - gameBoardRect.left}px`;
        pointElement.style.top = `${rect.top + rect.height / 2 - gameBoardRect.top}px`;
        gameBoard.appendChild(pointElement);

        pointElement.addEventListener('animationend', () => {
            currentScore += points;
            scoreDisplayElement.textContent = `Score: ${currentScore}`;
            scoreDisplayElement.classList.add('plus');
            setTimeout(() => scoreDisplayElement.classList.remove('plus'), 300);
            pointElement.remove();
        });
    }

    function swapUnmatchedCards() {
        const unmatchedCards = Array.from(gameBoard.children).filter(card => !card.classList.contains('matched'));
        if (unmatchedCards.length < 2) return;

        const index1 = Math.floor(Math.random() * unmatchedCards.length);
        let index2 = Math.floor(Math.random() * unmatchedCards.length);
        while (index2 === index1) {
            index2 = Math.floor(Math.random() * unmatchedCards.length);
        }
        const card1 = unmatchedCards[index1];
        const card2 = unmatchedCards[index2];

        const pos1 = { x: card1.offsetLeft, y: card1.offsetTop };
        const pos2 = { x: card2.offsetLeft, y: card2.offsetTop };
        const dx1 = pos2.x - pos1.x;
        const dy1 = pos2.y - pos1.y;
        const dx2 = pos1.x - pos2.x;
        const dy2 = pos1.y - pos2.y;

        card1.classList.add('flipped');
        card2.classList.add('flipped');

        card1.classList.add('swapping');
        card2.classList.add('swapping');
        card1.style.left = `${pos1.x}px`;
        card1.style.top = `${pos1.y}px`;
        card2.style.left = `${pos2.x}px`;
        card2.style.top = `${pos2.y}px`;
        card1.style.setProperty('--dx', `${dx1}px`);
        card1.style.setProperty('--dy', `${dy1}px`);
        card2.style.setProperty('--dx', `${dx2}px`);
        card2.style.setProperty('--dy', `${dy2}px`);
        playBeepSound();

        setTimeout(() => {
            const tempImage = card1.dataset.image;
            const tempFrontSrc = card1.querySelector('.front').src;
            const tempBackSrc = card1.querySelector('.back').src;

            card1.dataset.image = card2.dataset.image;
            card1.querySelector('.front').src = card2.querySelector('.front').src;
            card1.querySelector('.back').src = card2.querySelector('.back').src;

            card2.dataset.image = tempImage;
            card2.querySelector('.front').src = tempFrontSrc;
            card2.querySelector('.back').src = tempBackSrc;

            card1.classList.remove('flipped', 'swapping');
            card2.classList.remove('flipped', 'swapping');
            card1.style.removeProperty('left');
            card1.style.removeProperty('top');
            card2.style.removeProperty('left');
            card2.style.removeProperty('top');
            card1.style.removeProperty('--dx');
            card1.style.removeProperty('--dy');
            card2.style.removeProperty('--dx');
            card2.style.removeProperty('--dy');
            canClick = true;
        }, 800);
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            seconds++;
            timerDisplay.textContent = `Time: ${seconds} s`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function calculateStreakBonus(streak) {
        if (streak < 2) return 0;
        return 1000 * Math.pow(3, streak - 2);
    }

    function calculateScore() {
        const matchPoints = 500 * matchedPairs;
        const streakPoints = calculateStreakBonus(streak);
        const clickPenalty = clicks * 10;
        const timePenalty = seconds * 2;
        return Math.max(0, matchPoints + streakPoints - clickPenalty - timePenalty);
    }

    function showStreakBonus() {
        if (streak >= 2) {
            const bonus = calculateStreakBonus(streak);
            streakDisplay.textContent = `Streak: ${streak} (+${bonus})`;
            streakDisplay.style.animation = 'streakPulse 2s forwards';
            setTimeout(() => {
                streakDisplay.style.animation = '';
                streakDisplay.textContent = '';
            }, 2000);
        }
    }

    async function saveHighScore(name, score) {
        if (useFirebase) {
            try {
                await addDoc(collection(db, "highscores"), {
                    name: name,
                    score: score,
                    timestamp: Date.now()
                });
            } catch (e) {
                console.error("Error saving high score to Firestore: ", e);
                saveHighScoreLocal(name, score);
            }
        } else {
            saveHighScoreLocal(name, score);
        }
    }

    function saveHighScoreLocal(name, score) {
        const highScores = JSON.parse(localStorage.getItem('jdVanceHighScores')) || [];
        highScores.push({ name, score });
        highScores.sort((a, b) => b.score - a.score);
        highScores.splice(5);
        localStorage.setItem('jdVanceHighScores', JSON.stringify(highScores));
        loadHighScoresLocal(highScores);
    }

    async function loadHighScores() {
        if (useFirebase) {
            try {
                const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(5));
                const querySnapshot = await getDocs(q);
                let scoresHTML = '<strong>High Scores:</strong><br>';
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    scoresHTML += `${data.name}: ${data.score}<br>`;
                });
                highScoresDisplay.innerHTML = scoresHTML;
            } catch (e) {
                console.error("Error loading high scores from Firestore: ", e);
                loadHighScoresLocal();
            }
        } else {
            loadHighScoresLocal();
        }
    }

    function loadHighScoresLocal() {
        const highScores = JSON.parse(localStorage.getItem('jdVanceHighScores')) || [];
        let scoresHTML = '<strong>High Scores (Local):</strong><br>';
        highScores.forEach((entry) => {
            scoresHTML += `${entry.name}: ${entry.score}<br>`;
        });
        highScoresDisplay.innerHTML = scoresHTML;
    }

    function updateHighScores(score) {
        const name = prompt("Enter your name for the leaderboard:");
        if (name) {
            saveHighScore(name, score).then(() => {
                loadHighScores();
            });
        } else {
            // Default name if user cancels prompt
            saveHighScore("Player", score).then(() => {
                loadHighScores();
            });
        }
    }

    function initGame() {
        cards = [];
        flippedCards = [];
        matchedPairs = 0;
        canClick = true;
        clicks = 0;
        seconds = 0;
        streak = 0;
        streakBonus = 0;
        missCount = 0;
        currentScore = 0;
        cardFiles = [];
        gameBoard.innerHTML = '';
        message.textContent = '';
        timerDisplay.textContent = 'Time: 0 s';
        scoreDisplay.textContent = 'Pairs matched: 0 out of 9';
        scoreDisplayElement.textContent = 'Score: 0';
        streakDisplay.textContent = '';
        winScreen.style.display = 'none';
        stopTimer();
        startTimer();

        for (let i = 1; i <= 9; i++) {
            const fileName = `Vance00${i}.png`;
            cardFiles.push(fileName);
            cards.push(fileName);
            cards.push(fileName);
        }

        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }

        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.dataset.image = card;
            cardElement.dataset.index = index;

            const backImg = document.createElement('img');
            backImg.src = 'back.png';
            backImg.alt = 'Card back';
            backImg.classList.add('back');

            const frontImg = document.createElement('img');
            frontImg.src = card;
            frontImg.alt = 'JD Vance meme';
            frontImg.classList.add('front');

            cardElement.appendChild(backImg);
            cardElement.appendChild(frontImg);

            cardElement.addEventListener('click', flipCard);
            gameBoard.appendChild(cardElement);
        });

        loadHighScores();
    }

    function flipCard(event) {
        if (!canClick || flippedCards.length >= 2 || this.classList.contains('matched')) return;

        if (flippedCards.length === 1 && flippedCards[0] === this) return;

        this.classList.add('flipped');
        flippedCards.push(this);
        clicks++;
        playSound(400, 0.4);

        if (flippedCards.length === 2) {
            canClick = false;
            checkMatch();
        }
    }

    function checkMatch() {
        const [card1, card2] = flippedCards;
        if (card1.dataset.image === card2.dataset.image && card1 !== card2) {
            matchedPairs++;
            streak++;
            streakBonus = calculateStreakBonus(streak);
            card1.classList.add('matched');
            card2.classList.add('matched');
            scoreDisplay.textContent = `Pairs matched: ${matchedPairs} out of 9`;
            const randomCaption = sillyCaptions[Math.floor(Math.random() * sillyCaptions.length)];
            message.textContent = randomCaption;
            message.style.animation = 'fadeInOut 2s forwards';
            const matchSoundFreq = 600 + (streak - 1) * 150;
            const matchSoundDuration = Math.min(0.4 + (streak - 1) * 0.1, 0.8);
            playSound(matchSoundFreq, matchSoundDuration, 'square');

            const totalPoints = 500 + streakBonus;
            const halfPoints = Math.floor(totalPoints / 2);
            createParticles(card1, card2, streak);
            animatePoints(halfPoints, card1);
            animatePoints(totalPoints - halfPoints, card2);
            showStreakBonus();

            setTimeout(() => {
                message.textContent = '';
                message.style.animation = '';
            }, 2000);

            flippedCards = [];
            canClick = true;

            if (matchedPairs === 9) {
                canClick = false;
                stopTimer();
                setTimeout(() => {
                    const score = calculateScore();
                    const randomIndex = Math.floor(Math.random() * cardFiles.length);
                    winImage.src = cardFiles[randomIndex];
                    finalScoreDisplay.textContent = `Your Score: ${score}`;
                    updateHighScores(score);
                    winScreen.style.display = 'block';
                    playSound(800, 0.5, 'sawtooth');
                }, 500);
            }
        } else {
            missCount++;
            streak = 0;
            streakBonus = 0;

            setTimeout(() => {
                flippedCards.forEach(card => {
                    card.classList.remove('flipped');
                    card.classList.add('shake');
                });
                playSound(200, 0.4, 'triangle');
                setTimeout(() => {
                    flippedCards.forEach(card => card.classList.remove('shake'));
                    flippedCards = [];
                    canClick = true;

                    if (missCount % 4 === 0) {
                        canClick = false;
                        swapUnmatchedCards();
                    }
                }, 500);
            }, 750);
        }
    }

    restartButton.addEventListener('click', () => {
        playSound(500, 0.2);
        initGame();
    });

    document.addEventListener('keydown', (event) => {
        if (winScreen.style.display === 'block' && event.key.toLowerCase() === 's') {
            playSound(500, 0.2);
            initGame();
        }
    });

    initGame();
});