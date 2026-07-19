const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./db');

const app = express(); 


app.use(session({
    secret: 'king_predictions_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // افتراضي: يوم واحد
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/person', (req, res) => {

    db.query(
        'SELECT * FROM person',
        (err, result) => {

            if (err) {
                return res.send(err);
            }

            res.json(result);
        }
    );

});


app.post('/register', async (req, res) => {

    const { username, email, password } = req.body;

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            `INSERT INTO person
            (Username, Email, Upassword)
            VALUES (?, ?, ?)`,
            [username, email, hashedPassword],
            (err, result) => {

                if (err) {
                    return res.send(err);
                }

                res.redirect('/login.html?registered=1');
            }
        );

    } catch (error) {

        res.send(error);

    }

});

app.post('/login', (req, res) => {

    const { email, password } = req.body;

    db.query(
        'SELECT * FROM person WHERE Email = ?',
        [email],
        async (err, result) => {

            if (err) {
                return res.send(err);
            }
            if (result.length === 0) {
                return res.redirect('/login.html?error=1');
            }

            const user = result[0];
            console.log(user);
console.log('password from form:', password);
console.log('password from db:', user.Upassword);

            const isMatch = await bcrypt.compare(password, user.Upassword);
            console.log('isMatch:', isMatch);

            if (isMatch) {
    req.session.user = {
        id: user.Uid,
        username: user.Username,
        email: user.email,
        points: user.tota_point,
        role: user.role
    };

    if (req.body.remember) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    } else {
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
    }

    if (req.session.user.role === 'admin') {
        res.redirect('/admin');
    } else {
        res.redirect('/dashboard');
    }

} else {

    res.redirect('/login.html?error=1');

}

        }
    );

});

app.get('/dashboard', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    res.sendFile(__dirname + '/public/dashboard.html');

});

app.get('/predict', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    res.sendFile(__dirname + '/public/predict.html');
});

app.get('/predict.html', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    res.sendFile(__dirname + '/public/predict.html');
});

app.get('/logout', (req, res) => {

    req.session.destroy(() => {
        res.redirect('/login.html');
    });

});

app.get('/profile', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">

        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta charset="UTF-8">
            <title>الملف الشخصي</title>
            <link rel="stylesheet" href="/style.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        </head>

        <body>

    <div class="navbar">
        <div class="logo">
            <i class="bi bi-award-fill"></i>
            ملك التوقعات
        </div>
        <div class="nav-links">
            <a href="/dashboard"><i class="bi bi-house-fill"></i> الرئيسية</a>
            <a href="/leaderboard"><i class="bi bi-trophy-fill"></i> المتصدرون</a>
            <a href="/predict"><i class="bi bi-lightning-charge-fill"></i> التوقعات</a>
            <a href="/private-leagues">الدوريات الخاصة 🔐</a>
            <a href="/logout"><i class="bi bi-box-arrow-right"></i> تسجيل الخروج</a>
        </div>
    </div>

    <section class="profile-card">
        <div class="profile-header">
            <div class="profile-avatar">
                <i class="bi bi-person-fill"></i>
            </div>
            <h1 id="profileUsername">...</h1>
            <p id="profileEmail">...</p>
        </div>
        <div class="profile-stats">
            <div class="profile-stat-box">
                <span>🏆 النقاط الكلية</span>
                <strong id="totalPoints">0</strong>
            </div>
            <div class="profile-stat-box">
                <span>📊 عدد التوقعات</span>
                <strong id="totalPredictions">0</strong>
            </div>
            <div class="profile-stat-box">
                <span>🎯 نسبة النجاح</span>
                <strong id="successRate">0%</strong>
            </div>
            <div class="profile-stat-box">
                <span>🥇 أفضل ترتيب</span>
                <strong id="currentRank">-</strong>
            </div>
        </div>
    </section>

    <section class="profile-predictions-section">
        <h2>
            <i class="bi bi-lightning-charge-fill"></i>
            سجل توقعاتي
        </h2>
        <div id="profilePredictionsList">
            <div class="pred-empty">
                <i class="bi bi-hourglass-split" style="font-size:32px; display:block; margin-bottom:10px; color:#d4af37;"></i>
                جاري تحميل التوقعات...
            </div>
        </div>
    </section>

    <script>

    // ── بيانات الملف الشخصي ──────────────────────────────────────────────────
    fetch('/api/profile-summary')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            document.getElementById('profileUsername').innerText = data.username;
            document.getElementById('profileEmail').innerText = data.email;
            document.getElementById('totalPoints').innerText = data.totalPoints;
            document.getElementById('totalPredictions').innerText = data.totalPredictions;
            document.getElementById('successRate').innerText = data.successRate + '%';
            document.getElementById('currentRank').innerText = data.best_rank;
        });

    // ── خريطة الأعلام ────────────────────────────────────────────────────────
    var profileTeamFlags = {
        'السعودية':'sa','قطر':'qa','الإمارات':'ae',
        'المغرب':'ma','تونس':'tn','الجزائر':'dz','مصر':'eg',
        'البرازيل':'br','الأرجنتين':'ar','أوروغواي':'uy','كولومبيا':'co',
        'الاكوادور':'ec','باراغواي':'py','التشيك':'cz','جنوب أفريقيا':'za',
        'البوسنة والهرسك':'ba','هايتي':'ht','اسكتلندا':'gb-sct','كوراساو':'cw',
        'السويد':'se','الرأس الأخضر':'cv','النرويج':'no','النمسا':'at',
        'الكونغو الديمقراطية':'cd','فرنسا':'fr','اسبانيا':'es','البرتغال':'pt',
        'انجلترا':'gb-eng','المانيا':'de','إيطاليا':'it','هولندا':'nl','بلجيكا':'be',
        'سويسرا':'ch','كرواتيا':'hr','الدنمارك':'dk','صربيا':'rs','بولندا':'pl',
        'أوكرانيا':'ua','تركيا':'tr','الولايات المتحدة':'us','المكسيك':'mx',
        'كندا':'ca','كوستاريكا':'cr','بنما':'pa','اليابان':'jp','كوريا الجنوبية':'kr',
        'استراليا':'au','ايران':'ir','العراق':'iq','أوزبكستان':'uz','الأردن':'jo',
        'السنغال':'sn','نيجيريا':'ng','الكاميرون':'cm','غانا':'gh',
        'ساحل العاج':'ci','مالي':'ml','نيوزيلندا':'nz'
    };

    function profileGetFlag(teamName) {
        var code = profileTeamFlags[teamName];
        if (!code) {
            return '<div class="pred-team-flag-placeholder">🛡️</div>';
        }
        return '<img src="https://flagcdn.com/w80/' + code + '.png" alt="' + teamName + '" class="pred-team-flag" loading="lazy">';
    }

    function buildPredCard(p) {
        var isPending = p.home_score === null || p.away_score === null;

        var resultClass = 'result-pending';
        var pointsBadgeClass = '';
        if (!isPending) {
            if (p.points >= 3) {
                resultClass = 'result-exact';
                pointsBadgeClass = 'points-high';
            } else if (p.points >= 1) {
                resultClass = 'result-correct';
            } else {
                resultClass = 'result-wrong';
                pointsBadgeClass = 'points-zero';
            }
        }

        var actualScore = isPending ? '? - ?' : (p.home_score + ' - ' + p.away_score);
        var yourGuess   = p.predicted_home_score + ' - ' + p.predicted_away_score;
        var roundLabel  = p.round_name || 'بدون جولة';

        var goldenBadge = p.is_golden      ? '<span class="gold-badge">⭐ ذهبية</span>'   : '';
        var horseBadge  = p.used_loser_card ? '<span class="horse-badge">🐎 أسود</span>' : '';

        var pointsSection = isPending
            ? '<span class="pred-status-pending">⏳ بانتظار النتيجة</span>'
            : '<span class="pred-points-badge ' + pointsBadgeClass + '">+' + p.points + ' نقطة</span>';

        return (
            '<div class="pred-history-card ' + resultClass + '">' +

                '<div class="pred-match-header">' +
                    '<span class="pred-round-label">' + roundLabel + '</span>' +
                    '<div class="pred-badges">' + goldenBadge + horseBadge + '</div>' +
                '</div>' +

                '<div class="pred-teams-row">' +

                    '<div class="pred-team">' +
                        profileGetFlag(p.home_team) +
                        '<span class="pred-team-name">' + p.home_team + '</span>' +
                    '</div>' +

                    '<div class="pred-vs-col">' +
                        '<span class="pred-score-result">' + actualScore + '</span>' +
                        '<span class="pred-score-label">النتيجة</span>' +
                    '</div>' +

                    '<div class="pred-team">' +
                        profileGetFlag(p.away_team) +
                        '<span class="pred-team-name">' + p.away_team + '</span>' +
                    '</div>' +

                '</div>' +

                '<div class="pred-footer">' +
                    '<span class="pred-your-guess">توقعك: <strong>' + yourGuess + '</strong></span>' +
                    pointsSection +
                '</div>' +

            '</div>'
        );
    }

    // ── جلب التوقعات ─────────────────────────────────────────────────────────
    fetch('/api/my-all-predictions')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var box = document.getElementById('profilePredictionsList');

            if (!data || data.length === 0) {
                box.innerHTML =
                    '<div class="pred-empty">' +
                        '<i class="bi bi-emoji-neutral" style="font-size:36px; display:block; margin-bottom:10px;"></i>' +
                        'لا توجد توقعات بعد.<br>' +
                        '<a href="/predict" style="color:#d4af37; margin-top:8px; display:inline-block;">ابدأ التوقع الآن ←</a>' +
                    '</div>';
                return;
            }

            var sorted = data.slice().sort(function(a, b) {
                if (a.match_date && b.match_date) {
                    return new Date(b.match_date) - new Date(a.match_date);
                }
                return 0;
            });

            var html = '';
            for (var i = 0; i < sorted.length; i++) {
                html += buildPredCard(sorted[i]);
            }
            box.innerHTML = html;
        })
        .catch(function() {
            document.getElementById('profilePredictionsList').innerHTML =
                '<div class="pred-empty">تعذّر تحميل التوقعات.</div>';
        });

    </script>

</body>
        </html>
    `);

});

function isAdmin(req, res, next) {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    const role = String(req.session.user.role).trim().toLowerCase();

    if (role !== 'admin') {
        return res.send('غير مصرح لك بدخول صفحة الأدمن. رتبتك الحالية: ' + req.session.user.role);
    }

    next();
}
app.get('/admin', isAdmin, (req, res) => {
    res.sendFile(__dirname + '/views/admin.html');
});


app.get('/api/tournaments', (req, res) => {

    db.query(
        'SELECT * FROM tournaments',
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(result);

        }
    );

});


app.get('/api/me', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            error: 'Not logged in'
        });
    }

    res.json(req.session.user);

});

function getUserId(req) {
    return req.session.userId || req.session.Uid || req.session.user?.Uid || req.session.user?.id;
}

app.get('/api/matches/:tournamentId', (req, res) => {

    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const tournamentId = req.params.tournamentId;

    db.query(
        `SELECT 
            matches.Mid,
            matches.tournament_id,
            matches.home_team,
            matches.away_team,
            matches.match_date,
            matches.home_score,
            matches.away_score,
            matches.round_id,
            matches.is_golden,
            matches.is_diamond,
            matches.underdog_team,
            matches.home_win_percent,
            matches.away_win_percent,
            rounds.round_name,
            predictions.predicted_home_score,
            predictions.predicted_away_score,
            predictions.points,
            predictions.used_loser_card
        FROM matches
        LEFT JOIN rounds ON matches.round_id = rounds.Rid
        LEFT JOIN predictions
            ON predictions.match_id = matches.Mid
            AND predictions.user_id = ?
        WHERE matches.tournament_id = ?
        ORDER BY matches.match_date ASC`,
        [userId, tournamentId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);
        }
    );

});
app.post('/api/predictions', (req, res) => {

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'لازم تسجل دخول' });

    const { match_id, predicted_home_score, predicted_away_score, used_loser_card } = req.body;

    const wantsLoserCard = used_loser_card === true || used_loser_card === 1 || used_loser_card === '1';

    db.query(
        `SELECT
    match_date,
    home_team,
    away_team,
    underdog_team,
    is_golden,
    is_diamond,
    CASE
        WHEN match_date <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')
        THEN 1
        ELSE 0
    END AS is_started
FROM matches
WHERE Mid = ?`,
        [match_id],
        (err, matchResult) => {
            if (err) return res.status(500).json({ error: err.message });
            if (matchResult.length === 0) return res.status(404).json({ error: 'المباراة غير موجودة' });

            const match = matchResult[0];

            if (wantsLoserCard && (match.is_golden == 1 || match.is_diamond == 1)) {
            return res.status(400).json({
            error: '🐎 لا يمكن استخدام بطاقة الحصان الأسود في المباراة الذهبية أو الألماسية'
           });
         }

            if (match.is_started == 1) {
                return res.status(400).json({ error: '❌ انتهى وقت التوقع لهذه المباراة' });
            }

            if (wantsLoserCard) {
                const predictedHome = Number(predicted_home_score);
                const predictedAway = Number(predicted_away_score);

                let predictedWinner = '';
                if (predictedHome > predictedAway)      predictedWinner = match.home_team;
                else if (predictedAway > predictedHome) predictedWinner = match.away_team;
                else                                    predictedWinner = 'draw';

                if (predictedWinner !== match.underdog_team) {
                    return res.status(400).json({ error: '🐎 بطاقة الحصان الأسود تُستخدم فقط إذا توقعت فوز الفريق غير المرشح' });
                }

                // ✅ تحقق من الحد المسموح (مرتين لكل بطولة)
                db.query(
                    `SELECT COUNT(*) AS loser_card_count
                     FROM predictions p
                     JOIN matches m ON p.match_id = m.Mid
                     WHERE p.user_id = ?
                     AND m.tournament_id = (SELECT tournament_id FROM matches WHERE Mid = ?)
                     AND p.used_loser_card = 1
                     AND p.match_id != ?`,
                    [userId, match_id, match_id],
                    (err, countResult) => {
                        if (err) return res.status(500).json({ error: err.message });

                        const count = countResult[0].loser_card_count;

                        if (count >= 2) {
                            return res.status(400).json({ error: '🐎 استنفذت الحد المسموح به (مرتان لكل بطولة)' });
                        }

                        savePrediction();
                    }
                );
            } else {
                savePrediction();
            }

            function savePrediction() {
                db.query(
                    `SELECT * FROM predictions WHERE user_id = ? AND match_id = ?`,
                    [userId, match_id],
                    (err2, existingPrediction) => {
                        if (err2) return res.status(500).json({ error: err2.message });

                        if (existingPrediction.length > 0) {
                            db.query(
                                `UPDATE predictions SET predicted_home_score = ?, predicted_away_score = ?, used_loser_card = ?
                                 WHERE user_id = ? AND match_id = ?`,
                                [predicted_home_score, predicted_away_score, wantsLoserCard ? 1 : 0, userId, match_id],
                                (err3) => {
                                    if (err3) return res.status(500).json({ error: err3.message });
                                    res.json({ message: '✅ تم تحديث التوقع' });
                                }
                            );
                        } else {
                            db.query(
                                `INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score, used_loser_card, points)
                                 VALUES (?, ?, ?, ?, ?, 0)`,
                                [userId, match_id, predicted_home_score, predicted_away_score, wantsLoserCard ? 1 : 0],
                                (err4) => {
                                    if (err4) return res.status(500).json({ error: err4.message });
                                    res.json({ message: '✅ تم حفظ التوقع' });
                                }
                            );
                        }
                    }
                );
            }
        }
    );
});

function calculateMatchPoints(matchId, res) {

    db.query(
        `SELECT * FROM matches WHERE Mid = ?`,
        [matchId],
        (err, matchResult) => {

            if (err) return res.send(err);
            if (matchResult.length === 0) return res.send('المباراة غير موجودة');

            const match = matchResult[0];

            db.query(
                `SELECT * FROM predictions WHERE match_id = ?`,
                [matchId],
                (err, predictions) => {

                    if (err) return res.send(err);

                    predictions.forEach(prediction => {

                        let points = 0;

                        const predictedHome = Number(prediction.predicted_home_score);
                        const predictedAway = Number(prediction.predicted_away_score);
                        const actualHome    = Number(match.home_score);
                        const actualAway    = Number(match.away_score);

                        const exactScore = predictedHome === actualHome && predictedAway === actualAway;

                        const predictedWinner =
                            predictedHome > predictedAway ? match.home_team :
                            predictedAway > predictedHome ? match.away_team : 'draw';

                        const actualWinner =
                            actualHome > actualAway ? match.home_team :
                            actualAway > actualHome ? match.away_team : 'draw';

                        if (exactScore) {
                            points = 3;
                        } else if (predictedWinner === actualWinner) {
                            points = 1;
                        }

                        // المباراة الذهبية ×2
                        if (match.is_golden == 1) {
                           points *= 2;
                       }

                        // المباراة الألماسية ×3
                        if (match.is_diamond == 1) {
                           points *= 3;
                        }

                        if (
                            prediction.used_loser_card == 1 &&
                            actualWinner === match.underdog_team &&
                            predictedWinner === actualWinner
                        ) {
                            points = exactScore ? 10 : 3;
                        }

                        db.query(
                            `UPDATE predictions SET points = ? WHERE Pid = ?`,
                            [points, prediction.Pid]
                        );

                    });

                    updateUsersTotalPoints(res);
                }
            );
        }
    );
}


function updateUsersTotalPoints(res) {

    db.query(
        `UPDATE person
SET tota_point =
(
    SELECT COALESCE(SUM(points), 0)
    FROM predictions
    WHERE predictions.user_id = person.Uid
)
+
(
    SELECT COALESCE(
        SUM(champion_points + top_scorer_points),
        0
    )
    FROM tournament_predictions
    WHERE tournament_predictions.user_id = person.Uid
)`,
        (err) => {

            if (err) {
                return res.send(err);
            }

            db.query(
`UPDATE person
SET tota_point =
(
    SELECT COALESCE(SUM(points), 0)
    FROM predictions
    WHERE predictions.user_id = person.Uid
)
+
(
    SELECT COALESCE(
        SUM(champion_points + top_scorer_points),
        0
    )
    FROM tournament_predictions
    WHERE tournament_predictions.user_id = person.Uid
)`,
(err) => {

                    if (err) {
                        return res.send(err);
                    }

                    res.redirect('/admin');

                }
            );

        }
    );

}

app.get('/api/dashboard-summary', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const userId = req.session.user.id;

    db.query(
        `SELECT Uid, Username, tota_point, role
         FROM person
         ORDER BY tota_point DESC`,
        (err, users) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const rank =
                users.findIndex(user => user.Uid === userId) + 1;

            const currentUser =
                users.find(user => user.Uid === userId);

            db.query(
                `SELECT COUNT(*) AS usedCards
                 FROM predictions
                 WHERE user_id = ?
                 AND used_loser_card = 1`,
                [userId],
                (err, cardResult) => {

                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    db.query(
                        `SELECT COUNT(*) AS roundWins
                         FROM round_winners
                         WHERE user_id = ?`,
                        [userId],
                        (err, roundResult) => {

                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }

                            db.query(
    `SELECT Rid
 FROM rounds
 WHERE CURDATE() BETWEEN start_date AND end_date
 ORDER BY Rid DESC
 LIMIT 1`,
    (err, roundData) => {

        let weeklyRank = 'قريبًا';

        if (!err && roundData.length > 0) {

            const currentRound = roundData[0].Rid;

            db.query(
                `SELECT p.user_id,
                        SUM(IFNULL(p.points,0)) AS round_points
                 FROM predictions p
                 JOIN matches m ON p.match_id = m.Mid
                 JOIN rounds r ON m.round_id = r.Rid
                 WHERE r.Rid = ?
                 GROUP BY p.user_id
                 ORDER BY round_points DESC`,
                [currentRound],
                (err, weeklyUsers) => {

                    if (!err && weeklyUsers.length > 0) {

                        const userRank =
                            weeklyUsers.findIndex(
                                u => u.user_id === userId
                            ) + 1;

                        if (userRank > 0) {
                            weeklyRank = userRank;
                        }
                    }

                    res.json({
                        username: currentUser.Username,
                        points: currentUser.tota_point,
                        overallRank: rank,
                        weeklyRank,
                        horseCards: cardResult[0].usedCards,
                        roundWins: roundResult[0].roundWins
                    });

                }
            );

        } else {

            res.json({
                username: currentUser.Username,
                points: currentUser.tota_point,
                overallRank: rank,
                weeklyRank,
                horseCards: cardResult[0].usedCards,
                roundWins: roundResult[0].roundWins
            });

        }
    }
);

                        }
                    );

                }
            );

        }
    );

});

// ─── 1. إضافة بطولة ───
app.post('/admin/add-tournament', isAdmin, (req, res) => {
    const { name, start_date, end_date } = req.body;

    db.query(
        `INSERT INTO tournaments (Tname, start_date, end_date) VALUES (?, ?, ?)`,
        [name, start_date, end_date],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/admin');
        }
    );
});

// ─── 2. تحديد بطل وهداف البطولة ───
const CHAMPION_POINTS = 15;
const TOP_SCORER_POINTS = 10;

app.post('/admin/finalize-tournament', isAdmin, (req, res) => {
    const { tournament_id, champion_winner, top_scorer_winner } = req.body;

    db.query(
        `UPDATE tournaments SET champion_winner = ?, top_scorer_winner = ? WHERE id = ?`,
        [champion_winner, top_scorer_winner, tournament_id],
        (err) => {
            if (err) return res.status(500).send(err.message);

            calculateTournamentPoints(tournament_id, champion_winner, top_scorer_winner, res);
        }
    );
});

// ─── دالة مشتركة: تحتسب نقاط توقعات البطل والهداف لكل مستخدم توقع بهذي البطولة ───
// تُستخدم من /admin/finalize-tournament ومن /api/set-tournament-winners
function calculateTournamentPoints(tournamentId, championWinner, topScorerWinner, res) {

    db.query(
        `SELECT * FROM tournament_predictions WHERE tournament_id = ?`,
        [tournamentId],
        (err, predictions) => {

            if (err) return res.status(500).json({ error: err.message });

            if (predictions.length === 0) {
                return updateUsersTotalPoints(res);
            }

            let finished = 0;

            predictions.forEach(pred => {

                const championPoints = pred.champion_prediction === championWinner ? CHAMPION_POINTS : 0;
                const topScorerPoints = pred.top_scorer_prediction === topScorerWinner ? TOP_SCORER_POINTS : 0;
                const totalPoints = championPoints + topScorerPoints;

                db.query(
                    `UPDATE tournament_predictions
                     SET champion_points = ?, top_scorer_points = ?, points = ?
                     WHERE id = ?`,
                    [championPoints, topScorerPoints, totalPoints, pred.id],
                    (err2) => {
                        if (err2) return res.status(500).json({ error: err2.message });

                        finished++;

                        // نتأكد إن كل التوقعات اتحدثت قبل ما نحدث نقاط المستخدمين الإجمالية
                        if (finished === predictions.length) {
                            updateUsersTotalPoints(res);
                        }
                    }
                );
            });
        }
    );
}

// ─── 3. إضافة جولة ───
app.post('/admin/add-round', isAdmin, (req, res) => {
    const { tournament_id, round_name, start_date, end_date } = req.body;

    db.query(
        `INSERT INTO rounds (tournament_id, round_name, start_date, end_date) VALUES (?, ?, ?, ?)`,
        [tournament_id, round_name, start_date, end_date],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/admin');
        }
    );
});

// ─── 4. إضافة مباراة ───
app.post('/admin/add-match', isAdmin, (req, res) => {
    const { tournament_id, round_id, home_team, away_team, match_date, home_win_percent, away_win_percent, is_golden, is_diamond, underdog_team } = req.body;

db.query(
    `INSERT INTO matches (tournament_id, round_id, home_team, away_team, match_date, home_win_percent, away_win_percent, is_golden, is_diamond, underdog_team)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tournament_id, round_id, home_team, away_team, match_date, home_win_percent, away_win_percent, is_golden ? 1 : 0, is_diamond ? 1 : 0, underdog_team || null],
    (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/admin');
    }
);
});
// ─── 5. تعديل مباراة ───
app.post('/admin/update-match', isAdmin, (req, res) => {
    const { match_id, round_id, match_date, home_team, away_team, home_win_percent, away_win_percent } = req.body;

    const fields = [];
    const values = [];

    if (round_id)         { fields.push('round_id = ?');         values.push(round_id); }
    if (match_date)       { fields.push('match_date = ?');       values.push(match_date); }
    if (home_team)        { fields.push('home_team = ?');        values.push(home_team); }
    if (away_team)        { fields.push('away_team = ?');        values.push(away_team); }
    if (home_win_percent) { fields.push('home_win_percent = ?'); values.push(home_win_percent); }
    if (away_win_percent) { fields.push('away_win_percent = ?'); values.push(away_win_percent); }

    if (fields.length === 0) return res.redirect('/admin');

    values.push(match_id);

    db.query(
        `UPDATE matches SET ${fields.join(', ')} WHERE Mid = ?`,
        values,
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/admin');
        }
    );
});

// ─── 6. إضافة نتيجة مباراة ───
app.post('/admin/update-result', isAdmin, (req, res) => {
    const { match_id, home_score, away_score } = req.body;

    db.query(
        `UPDATE matches SET home_score = ?, away_score = ? WHERE Mid = ?`,
        [home_score, away_score, match_id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            calculateMatchPoints(match_id, res);
        }
    );
});
// ─── 7. احتساب فائز الجولة ───
app.post('/admin/calculate-round-winner', isAdmin, (req, res) => {
    const { round_id } = req.body;

    calculateRoundWinner(round_id);
    res.redirect('/admin');
});

// ─── 8. حذف توقع ───
app.post('/admin/delete-prediction', isAdmin, (req, res) => {
    const { prediction_id } = req.body;

    db.query(
        `DELETE FROM predictions WHERE Pid = ?`,
        [prediction_id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/admin');
        }
    );
});

// ─── 9. حذف مباراة وتوقعاتها ───
app.post('/admin/delete-match', isAdmin, (req, res) => {
    const { match_id } = req.body;

    db.query(`DELETE FROM predictions WHERE match_id = ?`, [match_id], (err) => {
        if (err) return res.status(500).send(err.message);

        db.query(`DELETE FROM matches WHERE Mid = ?`, [match_id], (err2) => {
            if (err2) return res.status(500).send(err2.message);
            res.redirect('/admin');
        });
    });
});

// ─── 10. حذف بطولة بالكامل ───
app.post('/admin/delete-tournament', isAdmin, (req, res) => {
    const { tournament_id } = req.body;

    // نحذف بالترتيب: توقعات → مباريات → جولات → بطولة
    db.query(
        `DELETE FROM predictions WHERE match_id IN (SELECT Mid FROM matches WHERE tournament_id = ?)`,
        [tournament_id],
        (err) => {
            if (err) return res.status(500).send(err.message);

            db.query(`DELETE FROM matches WHERE tournament_id = ?`, [tournament_id], (err2) => {
                if (err2) return res.status(500).send(err2.message);

                db.query(`DELETE FROM round_winners WHERE round_id IN (SELECT Rid FROM rounds WHERE tournament_id = ?)`, [tournament_id], (err3) => {
                    if (err3) return res.status(500).send(err3.message);

                    db.query(`DELETE FROM rounds WHERE tournament_id = ?`, [tournament_id], (err4) => {
                        if (err4) return res.status(500).send(err4.message);

                        db.query(`DELETE FROM tournament_predictions WHERE tournament_id = ?`, [tournament_id], (err5) => {
                            if (err5) return res.status(500).send(err5.message);

                            db.query(`DELETE FROM tournaments WHERE id = ?`, [tournament_id], (err6) => {
                                if (err6) return res.status(500).send(err6.message);
                                res.redirect('/admin');
                            });
                        });
                    });
                });
            });
        }
    );
});

// ─── 11. حذف نتيجة مباراة فقط ───
app.post('/admin/delete-result', isAdmin, (req, res) => {
    const { match_id } = req.body;

    db.query(
        `UPDATE matches SET home_score = NULL, away_score = NULL WHERE Mid = ?`,
        [match_id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/admin');
        }
    );
});


// ═══════════════════════════════════════════════════════════════
//  أضف هذا الـ route في server.js
//  وأضف رابطه في navbar حق كل الصفحات:
//  <a href="/leaderboard"><i class="bi bi-trophy-fill"></i> المتصدرون</a>
// ═══════════════════════════════════════════════════════════════

app.get('/leaderboard', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    db.query(
        'SELECT Rid, round_name, tournament_id FROM rounds ORDER BY Rid DESC',
        (err, rounds) => {
            if (err) rounds = [];

            db.query(
                'SELECT id, Tname FROM tournaments ORDER BY id DESC',
                (errT, tournaments) => {
                    if (errT) tournaments = [];

                    res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <title>لوحة المتصدرين</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
</head>
<body>

<div class="navbar">
    <div class="logo">
        <i class="bi bi-award-fill"></i>
        ملك التوقعات
    </div>
    <div class="nav-links">
        <a href="/dashboard"><i class="bi bi-house-fill"></i> الرئيسية</a>
        <a href="/predict"><i class="bi bi-lightning-charge-fill"></i> توقع</a>
        <a href="/leaderboard"><i class="bi bi-trophy-fill"></i> المتصدرون</a>
        <a href="/profile"><i class="bi bi-person-circle"></i> الملف الشحصي</a>
    </div>
</div>

<script type="application/json" id="data-rounds">${JSON.stringify(rounds)}</script>
<script type="application/json" id="data-tournaments">${JSON.stringify(tournaments)}</script>

<div class="lb-page">

    <div class="lb-page-title">
        <i class="bi bi-trophy-fill"></i>
        لوحة المتصدرين
    </div>

    <div class="lb-tabs">
        <button class="lb-tab active" id="tabSeason" onclick="switchTab('season')">
            <i class="bi bi-award-fill"></i> الموسم
        </button>
        <button class="lb-tab" id="tabRound" onclick="switchTab('round')">
            <i class="bi bi-calendar-week-fill"></i> الجولة
        </button>
    </div>

    <div class="lb-tournaments" id="tournamentPills"></div>

    <div class="lb-round-selector" id="roundSelector" style="display:none">
        <label><i class="bi bi-calendar3"></i> الجولة:</label>
        <select id="roundSelect" onchange="loadRoundBoard()"></select>
    </div>

    <div class="lb-card">
        <div class="lb-card-header">
            <h3 id="cardTitle">🏆 ترتيب الموسم</h3>
            <span id="cardSub">إجمالي النقاط</span>
        </div>
        <div id="lbList">
            <div class="lb-loading">
                <i class="bi bi-arrow-repeat"></i>
                جاري التحميل...
            </div>
        </div>
    </div>

</div>

<div id="userPredModal" class="info-overlay" onclick="if(event.target===this)closeModal()">
    <div class="user-pred-modal">
        <button class="info-close" onclick="closeModal()">×</button>
        <h2 id="userPredTitle"></h2>
        <div id="userPredContent"></div>
    </div>
</div>

<style>
.lb-row-end { display:flex; align-items:center; gap:10px; }
.lb-eye-btn {
    width:34px; height:34px; border-radius:50%;
    border:1px solid rgba(212,175,55,0.35);
    background:rgba(212,175,55,0.08); color:#d4af37;
    font-size:15px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background 0.2s, transform 0.15s; flex-shrink:0;
}
.lb-eye-btn:hover { background:rgba(212,175,55,0.25); transform:scale(1.1); }
.user-pred-modal {
    width:520px; max-width:94%; max-height:85vh; overflow-y:auto;
    background:#101820; border:1.5px solid rgba(212,175,55,0.5);
    border-radius:22px; padding:28px 22px; position:relative;
}
.user-pred-modal h2 { color:#d4af37; text-align:center; margin:0 0 20px; font-size:18px; }
.user-pred-modal::-webkit-scrollbar { width:5px; }
.user-pred-modal::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.3); border-radius:10px; }
</style>

<script>
var currentUserId = ${req.session.user.id};
var ALL_ROUNDS      = JSON.parse(document.getElementById('data-rounds').textContent);
var ALL_TOURNAMENTS = JSON.parse(document.getElementById('data-tournaments').textContent);
var currentTab      = 'season';
var currentTournament = 0;

function buildTournamentPills() {
    var c = document.getElementById('tournamentPills');
    var h = '<button class="lb-pill active" onclick="selectTournament(0,this)">🌍 الكل</button>';
    ALL_TOURNAMENTS.forEach(function(t) {
        h += '<button class="lb-pill" onclick="selectTournament(' + t.id + ',this)">' + t.Tname + '</button>';
    });
    c.innerHTML = h;
}

function selectTournament(id, el) {
    currentTournament = id;
    document.querySelectorAll('.lb-pill').forEach(function(p) { p.classList.remove('active'); });
    el.classList.add('active');
    populateRoundSelect();
    if (currentTab === 'season') loadSeasonBoard();
    else loadRoundBoard();
}

function populateRoundSelect() {
    var select = document.getElementById('roundSelect');
    var list = currentTournament === 0 ? ALL_ROUNDS : ALL_ROUNDS.filter(function(r) { return r.tournament_id === currentTournament; });
    if (list.length === 0) { select.innerHTML = '<option value="">لا توجد جولات</option>'; return; }
    select.innerHTML = list.map(function(r) { return '<option value="' + r.Rid + '">' + r.round_name + '</option>'; }).join('');
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tabSeason').classList.toggle('active', tab === 'season');
    document.getElementById('tabRound').classList.toggle('active', tab === 'round');
    document.getElementById('roundSelector').style.display = tab === 'round' ? 'flex' : 'none';
    if (tab === 'season') loadSeasonBoard();
    else { populateRoundSelect(); loadRoundBoard(); }
}

function medalOrNum(i) {
    if (i === 0) return { cls: 'rank-1' };
    if (i === 1) return { cls: 'rank-2' };
    if (i === 2) return { cls: 'rank-3' };
    return { cls: '' };
}

function buildRows(data, pointsKey) {
    if (!data || data.length === 0) return '<div class="lb-loading">لا توجد بيانات بعد</div>';
    return data.map(function(user, i) {
        var isMe = Number(user.Uid) === Number(currentUserId);
        var m = medalOrNum(i);
        var rank = '<span class="lb-rank-num">' + (i+1) + '</span>';
        var safeName = user.Username.replace(/'/g, "");
        return '<div class="lb-row ' + m.cls + ' ' + (isMe ? 'my-leaderboard-row' : '') + '">' +
            rank +
            '<span class="lb-name">' + user.Username + '</span>' +
            '<div class="lb-row-end">' +
                '<span class="lb-points">' + (user[pointsKey] || 0) + ' <span class="lb-points-label">نقطة</span></span>' +
                '<button class="lb-eye-btn" onclick="openModal(this.dataset.name)" data-name="' + safeName + '" title="شوف توقعاته"><i class="bi bi-eye-fill"></i></button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function loadSeasonBoard() {
    document.getElementById('cardTitle').textContent = '🏆 ترتيب الموسم';
    document.getElementById('cardSub').textContent   = 'إجمالي النقاط';
    document.getElementById('lbList').innerHTML = '<div class="lb-loading"><i class="bi bi-arrow-repeat"></i> جاري التحميل...</div>';
    fetch('/api/leaderboard/' + currentTournament)
        .then(function(r) { return r.json(); })
        .then(function(d) { document.getElementById('lbList').innerHTML = buildRows(d, 'total_points'); })
        .catch(function() { document.getElementById('lbList').innerHTML = '<div class="lb-loading">تعذّر التحميل</div>'; });
}

function loadRoundBoard() {
    var sel = document.getElementById('roundSelect');
    if (!sel.value) { document.getElementById('lbList').innerHTML = '<div class="lb-loading">اختر جولة</div>'; return; }
    document.getElementById('cardTitle').textContent = '🔥 ' + sel.options[sel.selectedIndex].text;
    document.getElementById('cardSub').textContent   = 'نقاط الجولة';
    document.getElementById('lbList').innerHTML = '<div class="lb-loading"><i class="bi bi-arrow-repeat"></i> جاري التحميل...</div>';
    fetch('/api/round-leaderboard/' + sel.value)
        .then(function(r) { return r.json(); })
        .then(function(d) { document.getElementById('lbList').innerHTML = buildRows(d, 'round_points'); })
        .catch(function() { document.getElementById('lbList').innerHTML = '<div class="lb-loading">تعذّر التحميل</div>'; });
}

var teamFlags = {'السعودية':'sa','قطر':'qa','الإمارات':'ae','المغرب':'ma','تونس':'tn','الجزائر':'dz','مصر':'eg','البرازيل':'br','الأرجنتين':'ar','أوروغواي':'uy','كولومبيا':'co','الاكوادور':'ec','باراغواي':'py','التشيك':'cz','جنوب أفريقيا':'za','البوسنة والهرسك':'ba','هايتي':'ht','اسكتلندا':'gb-sct','كوراساو':'cw','السويد':'se','الرأس الأخضر':'cv','النرويج':'no','النمسا':'at','الكونغو الديمقراطية':'cd','فرنسا':'fr','اسبانيا':'es','البرتغال':'pt','انجلترا':'gb-eng','المانيا':'de','إيطاليا':'it','هولندا':'nl','بلجيكا':'be','سويسرا':'ch','كرواتيا':'hr','الدنمارك':'dk','صربيا':'rs','بولندا':'pl','أوكرانيا':'ua','تركيا':'tr','الولايات المتحدة':'us','المكسيك':'mx','كندا':'ca','كوستاريكا':'cr','بنما':'pa','اليابان':'jp','كوريا الجنوبية':'kr','استراليا':'au','ايران':'ir','العراق':'iq','أوزبكستان':'uz','الأردن':'jo','السنغال':'sn','نيجيريا':'ng','الكاميرون':'cm','غانا':'gh','ساحل العاج':'ci','مالي':'ml','نيوزيلندا':'nz'};

function getFlag(name) {
    var code = teamFlags[name];
    return code ? '<img src="https://flagcdn.com/w80/' + code + '.png" class="pred-team-flag" loading="lazy">' : '<div class="pred-team-flag-placeholder">🛡️</div>';
}

function openModal(el) {
    var username = typeof el === 'string' ? el : el.dataset.name;
    document.getElementById('userPredTitle').textContent = '⚡ توقعات ' + username;
    document.getElementById('userPredContent').innerHTML = '<div class="lb-loading"><i class="bi bi-arrow-repeat"></i> جاري التحميل...</div>';
    document.getElementById('userPredModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    fetch('/api/user-predictions/' + encodeURIComponent(username))
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data || data.length === 0) {
                document.getElementById('userPredContent').innerHTML = '<div class="lb-loading">لا توجد توقعات منتهية بعد</div>';
                return;
            }
            var html = '';
            data.forEach(function(p) {
                var pts = p.points || 0;
               var rc  = pts >= 3 ? 'result-exact' : pts >= 1 ? 'result-correct' : 'result-wrong';
               var pb  = pts >= 3 ? 'points-high' : pts >= 1 ? 'points-mid' : pts === 0 ? 'points-zero' : '';
                html += '<div class="pred-history-card ' + rc + '">' +
                    '<div class="pred-match-header">' +
                        '<span class="pred-round-label">' + (p.round_name || '-') + '</span>' +
                        '<div class="pred-badges">' +
                            (p.is_golden ? '<span class="gold-badge">⭐ ذهبية</span>' : '') +
                            (p.used_loser_card ? '<span class="horse-badge">🐎 أسود</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="pred-teams-row">' +
                        '<div class="pred-team">' + getFlag(p.home_team) + '<span class="pred-team-name">' + p.home_team + '</span></div>' +
                        '<div class="pred-vs-col"><span class="pred-score-result">' + p.home_score + ' – ' + p.away_score + '</span><span class="pred-score-label">النتيجة</span></div>' +
                        '<div class="pred-team">' + getFlag(p.away_team) + '<span class="pred-team-name">' + p.away_team + '</span></div>' +
                    '</div>' +
                    '<div class="pred-footer">' +
                        '<span class="pred-your-guess">توقّع: <strong>' + p.predicted_home_score + ' – ' + p.predicted_away_score + '</strong></span>' +
                        '<span class="pred-points-badge ' + pb + '">+' + pts + ' نقطة</span>' +
                    '</div>' +
                '</div>';
            });
            document.getElementById('userPredContent').innerHTML = html;
        })
        .catch(function() {
            document.getElementById('userPredContent').innerHTML = '<div class="lb-loading">تعذّر التحميل</div>';
        });
}

function closeModal() {
    document.getElementById('userPredModal').style.display = 'none';
    document.body.style.overflow = '';
}

buildTournamentPills();
fetch('/api/current-round')
    .then(function(r) { return r.json(); })
    .then(function(round) {
        if (round && round.Rid) { populateRoundSelect(); document.getElementById('roundSelect').value = round.Rid; }
    });
loadSeasonBoard();
</script>

</body>
</html>`);
                }
            );
        }
    );
});

app.get('/api/my-stats', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const userId = req.session.user.id;

    db.query(
        `SELECT
            COUNT(*) AS total_predictions,
            SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) AS correct_predictions,
            COALESCE(SUM(points), 0) AS total_points,
            SUM(CASE WHEN used_loser_card = 1 THEN 1 ELSE 0 END) AS horse_cards_used
         FROM predictions
         WHERE user_id = ?`,
        [userId],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const stats = result[0];

            const total = stats.total_predictions || 0;
            const correct = stats.correct_predictions || 0;

            const successRate =
                total > 0 ? Math.round((correct / total) * 100) : 0;

            res.json({
                totalPredictions: total,
                correctPredictions: correct,
                totalPoints: stats.total_points || 0,
                successRate: successRate,
                horseCardsUsed: stats.horse_cards_used || 0
            });

        }
    );

});

app.get('/api/my-latest-predictions', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    db.query(
        `SELECT
            predictions.predicted_home_score,
            predictions.predicted_away_score,
            predictions.points,
            predictions.used_loser_card,

            matches.home_team,
            matches.away_team,
            matches.home_score,
            matches.away_score,
            matches.match_date,
            matches.is_golden,

            rounds.round_name

         FROM predictions
         JOIN matches ON predictions.match_id = matches.Mid
         LEFT JOIN rounds ON matches.round_id = rounds.Rid
         WHERE predictions.user_id = ?
         ORDER BY predictions.Pid DESC
         LIMIT 5`,
        [req.session.user.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});


app.post('/api/tournament-prediction', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const {
        tournament_id,
        champion_prediction,
        top_scorer_prediction
    } = req.body;

    db.query(
        `SELECT MIN(match_date) AS firstMatch
         FROM matches
         WHERE tournament_id = ?`,
        [tournament_id],
        (err, matchResult) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (!matchResult[0].firstMatch) {
                return res.status(400).json({
                    error: 'لا توجد مباريات في هذه البطولة'
                });
            }
          
            const firstMatch =
                new Date(matchResult[0].firstMatch);
            
            if (new Date() >= firstMatch) {
                return res.status(400).json({
                    error: '🔒 بدأت البطولة، تم إغلاق توقعات البطل والهداف'
                });
            }
            
            saveTournamentPrediction();

        }
    );

    function saveTournamentPrediction() {

        db.query(
            `SELECT * FROM tournament_predictions
             WHERE user_id = ?
             AND tournament_id = ?`,
            [req.session.user.id, tournament_id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                if (result.length > 0) {

                    db.query(
                        `UPDATE tournament_predictions
                         SET
                            champion_prediction = ?,
                            top_scorer_prediction = ?
                         WHERE user_id = ?
                         AND tournament_id = ?`,
                        [
                            champion_prediction,
                            top_scorer_prediction,
                            req.session.user.id,
                            tournament_id
                        ],
                        (err) => {

                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }

                            res.json({ message: 'تم تحديث توقع البطولة' });

                        }
                    );

                } else {

                    db.query(
                        `INSERT INTO tournament_predictions
                        (
                            user_id,
                            tournament_id,
                            champion_prediction,
                            top_scorer_prediction
                        )
                        VALUES (?, ?, ?, ?)`,
                        [
                            req.session.user.id,
                            tournament_id,
                            champion_prediction,
                            top_scorer_prediction
                        ],
                        (err) => {

                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }

                            res.json({ message: 'تم حفظ توقع البطولة' });

                        }
                    );

                }

            }
        );

    }

}); 

app.get('/api/profile-summary', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const userId = req.session.user.id;

    db.query(
        `SELECT Uid, Username, email, tota_point, role, best_rank
         FROM person
         WHERE Uid = ?`,
        [userId],
        (err, userResult) => {

            if (err) return res.status(500).json({ error: err.message });

            const user = userResult[0];

            db.query(
                `SELECT COUNT(*) AS total_predictions,
                        SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) AS correct_predictions
                 FROM predictions
                 WHERE user_id = ?`,
                [userId],
                (err, statsResult) => {

                    if (err) return res.status(500).json({ error: err.message });

                    const stats = statsResult[0];
                    const total = stats.total_predictions || 0;
                    const correct = stats.correct_predictions || 0;
                    const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;

                    res.json({
                        username: user.Username,
                        email: user.email,
                        role: user.role,
                        totalPoints: user.tota_point,
                        totalPredictions: total,
                        successRate: successRate,
                        best_rank: user.best_rank || null,
                    });

                }
            );

        }
    );

});

app.get('/api/my-tournament-predictions', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    db.query(
        `SELECT
            tournaments.Tname,
            tournament_predictions.champion_prediction,
            tournament_predictions.top_scorer_prediction
         FROM tournament_predictions
         JOIN tournaments
            ON tournament_predictions.tournament_id = tournaments.id
         WHERE tournament_predictions.user_id = ?
         ORDER BY tournament_predictions.id DESC
         LIMIT 3`,
        [req.session.user.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

function normalizeText(text) {

    return text
        .trim()
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .toLowerCase();

}

app.post('/api/set-tournament-winners', isAdmin, (req, res) => {

    const {
        tournament_id,
        champion_winner,
        top_scorer_winner
    } = req.body;

    db.query(
        `UPDATE tournaments
         SET
            champion_winner = ?,
            top_scorer_winner = ?
         WHERE id = ?`,
        [
            champion_winner,
            top_scorer_winner,
            tournament_id
        ],
        (err) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            calculateTournamentPoints(tournament_id, champion_winner, top_scorer_winner, res);
        }
    );

});


app.get('/api/admin/tournaments', isAdmin, (req, res) => {

    db.query(
        `SELECT id, Tname
         FROM tournaments
         ORDER BY id DESC`,
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

app.get('/api/admin/rounds/:tournamentId', isAdmin, (req, res) => {

    db.query(
        `SELECT Rid, round_name
         FROM rounds
         WHERE tournament_id = ?
         ORDER BY Rid ASC`,
        [req.params.tournamentId],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

app.get('/api/admin/matches', isAdmin, (req, res) => {

    db.query(
        `SELECT 
            matches.Mid,
            matches.home_team,
            matches.away_team,
            matches.match_date,
            tournaments.Tname,
            rounds.round_name
         FROM matches
         LEFT JOIN tournaments ON matches.tournament_id = tournaments.id
         LEFT JOIN rounds ON matches.round_id = rounds.Rid
         ORDER BY matches.match_date ASC`,
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});app.get('/api/admin/all-rounds', isAdmin, (req, res) => {

    db.query(
        `SELECT 
            rounds.Rid,
            rounds.round_name,
            tournaments.Tname
         FROM rounds
         JOIN tournaments ON rounds.tournament_id = tournaments.id
         ORDER BY rounds.Rid DESC`,
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

function calculateRoundWinner(roundId) {

    db.query(
        `SELECT 
            person.Uid,
            person.Username,
            COALESCE(SUM(predictions.points), 0) AS round_points
         FROM predictions
         JOIN person ON predictions.user_id = person.Uid
         JOIN matches ON predictions.match_id = matches.Mid
         WHERE matches.round_id = ?
         GROUP BY person.Uid, person.Username
         ORDER BY round_points DESC
         LIMIT 1`,
        [roundId],
        (err, result) => {

            if (err) {
                console.log(err);
                return;
            }

            if (result.length === 0) {
                return;
            }

            const winner = result[0];

            db.query(
                `DELETE FROM round_winners
                 WHERE round_id = ?`,
                [roundId],
                (err) => {

                    if (err) {
                        console.log(err);
                        return;
                    }

                    db.query(
                        `INSERT INTO round_winners
                         (round_id, user_id, points)
                         VALUES (?, ?, ?)`,
                        [
                            roundId,
                            winner.Uid,
                            winner.round_points
                        ]
                    );

                }
            );

        }
    );

}



app.get('/api/round-winners', (req, res) => {

    db.query(
        `SELECT 
            rounds.round_name,
            person.Username,
            round_winners.points
         FROM round_winners
         JOIN rounds ON round_winners.round_id = rounds.Rid
         JOIN person ON round_winners.user_id = person.Uid
         ORDER BY round_winners.id DESC`,
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

app.get('/api/my-all-predictions', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    db.query(
        `SELECT
            predictions.predicted_home_score,
            predictions.predicted_away_score,
            predictions.points,
            predictions.used_loser_card,

            matches.home_team,
            matches.away_team,
            matches.home_score,
            matches.away_score,
            matches.match_date,
            matches.is_golden,

            rounds.round_name

         FROM predictions
         JOIN matches ON predictions.match_id = matches.Mid
         LEFT JOIN rounds ON matches.round_id = rounds.Rid
         WHERE predictions.user_id = ?
         ORDER BY predictions.Pid DESC`,
        [req.session.user.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

app.get('/api/leaderboard/:tournamentId', (req, res) => {

    const tournamentId = req.params.tournamentId;

    // الكل
    if (tournamentId == 0) {

        db.query(
            `SELECT
                p.Uid,
                p.Username,
                COALESCE(SUM(pr.points),0) AS total_points
            FROM person p
            LEFT JOIN predictions pr
                ON pr.user_id = p.Uid
            GROUP BY p.Uid, p.Username
            ORDER BY total_points DESC
            LIMIT 30`,
            (err, result) => {

                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json(result);

            }
        );

    } else {

        db.query(
            `SELECT
                p.Uid,
                p.Username,

                COALESCE(
                    SUM(
                        CASE
                            WHEN m.tournament_id = ?
                            THEN pr.points
                            ELSE 0
                        END
                    ),0
                ) AS total_points

            FROM person p

            LEFT JOIN predictions pr
                ON pr.user_id = p.Uid

            LEFT JOIN matches m
                ON pr.match_id = m.Mid

            GROUP BY p.Uid, p.Username

            ORDER BY total_points DESC

            LIMIT 30`,
            [tournamentId],
            (err, result) => {

                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json(result);

            }
        );

    }

});

app.get('/api/round-leaderboard/:roundId', (req, res) => {

    const roundId = req.params.roundId;

    db.query(
        `SELECT
            p.Uid,
            p.Username,
            COALESCE(
                SUM(
                    CASE
                        WHEN m.round_id = ?
                        THEN pr.points
                        ELSE 0
                    END
                ),0
            ) AS round_points

        FROM person p

        LEFT JOIN predictions pr
            ON pr.user_id = p.Uid

        LEFT JOIN matches m
            ON pr.match_id = m.Mid

        GROUP BY p.Uid, p.Username

        ORDER BY round_points DESC

        LIMIT 30`,
        [roundId],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);

        }
    );

});

app.get('/api/user-predictions/:username', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    db.query(
        `SELECT person.Uid FROM person WHERE person.Username = ?`,
        [req.params.username],
        (err, userResult) => {

            if (err) return res.status(500).json({ error: err.message });
            if (userResult.length === 0) return res.status(404).json({ error: 'مستخدم غير موجود' });

            const userId = userResult[0].Uid;

            db.query(
                `SELECT
                    predictions.predicted_home_score,
                    predictions.predicted_away_score,
                    predictions.points,
                    predictions.used_loser_card,
                    matches.home_team,
                    matches.away_team,
                    matches.home_score,
                    matches.away_score,
                    matches.is_golden,
                    rounds.round_name
                 FROM predictions
                 JOIN matches ON predictions.match_id = matches.Mid
                 LEFT JOIN rounds ON matches.round_id = rounds.Rid
                 WHERE predictions.user_id = ?
                 AND matches.home_score IS NOT NULL
                 AND matches.away_score IS NOT NULL
                 ORDER BY predictions.Pid DESC`,
                [userId],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(result);
                }
            );
        }
    );
});

app.get('/api/latest-round-winner', (req, res) => {

    db.query(`
        SELECT
            rw.round_id,
            p.Username,
            r.round_name
        FROM round_winners rw
        JOIN person p ON rw.user_id = p.Uid
        JOIN rounds r ON rw.round_id = r.Rid
        ORDER BY rw.id DESC
        LIMIT 1
    `, (err, result) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(result[0] || null);

    });

});

//--------------------------الدوريات الخاصة-------------



function getUserId(req) {
    if (req.session.userId) return req.session.userId;
    if (req.session.Uid) return req.session.Uid;
    if (req.session.user && req.session.user.Uid) return req.session.user.Uid;
    if (req.session.user && req.session.user.id) return req.session.user.id;
    return null;
}

function requireLogin(req, res, next) {
    const userId = getUserId(req);

    if (userId) {
        return next();
    }

    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'يجب تسجيل الدخول'
        });
    }

    return res.redirect('/login');
}

app.get('/private-leagues', (req, res) => {
    res.sendFile(__dirname + '/public/private-leagues.html');
});

function generateLeagueCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

app.post('/api/private-leagues/create', requireLogin, (req, res) => {
    console.log('BODY:', JSON.stringify(req.body));
    const { name, icon, max_members, tournaments, features = {} } = req.body;
    const code = generateLeagueCode();
    const userId = getUserId(req);

    if (!name) {
        return res.json({ success: false, message: 'اكتب اسم الدوري' });
    }

    db.query(
        `INSERT INTO private_leagues 
        (name, icon, code, max_members, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [name, icon || '🏆', code, max_members || 20, userId],
        (err, result) => {
            if (err) return res.status(500).json(err);

            const leagueId = result.insertId;

            db.query(
                `INSERT INTO private_league_members 
                (league_id, user_id, role)
                VALUES (?, ?, 'owner')`,
                [leagueId, userId],
                (errMember) => {
                    if (errMember) return res.status(500).json(errMember);

                    if (tournaments && tournaments.length > 0) {
                        const values = tournaments.map(tid => [leagueId, tid]);

                        db.query(
                            `INSERT INTO private_league_tournaments
                            (league_id, tournament_id)
                            VALUES ?`,
                            [values],
                            (errTour) => {
                                if (errTour) return res.status(500).json(errTour);
                                insertLeagueFeatures();
                            }
                        );
                    } else {
                        insertLeagueFeatures();
                    }

                    function insertLeagueFeatures() {
                        db.query(
                            `INSERT INTO private_league_features
                            (
                                league_id,
                                black_horse_enabled, black_horse_limit,
                                golden_match_enabled, golden_match_limit,
                                steal_enabled, steal_limit,
                                shield_enabled, shield_limit,
                                rescue_enabled, rescue_limit
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                leagueId,
                                features.black_horse?.enabled ? 1 : 0,
                                features.black_horse?.limit || 0,
                                features.golden_match?.enabled ? 1 : 0,
                                features.golden_match?.limit || 0,
                                features.steal?.enabled ? 1 : 0,
                                features.steal?.limit || 0,
                                features.shield?.enabled ? 1 : 0,
                                features.shield?.limit || 0,
                                features.rescue?.enabled ? 1 : 0,
                                features.rescue?.limit || 0
                            ],
                            (err2) => {
                                if (err2) return res.status(500).json(err2);

                                res.json({
                                    success: true,
                                    message: 'تم إنشاء الدوري بنجاح',
                                    leagueId,
                                    code
                                });
                            }
                        );
                    }
                }
            );
        }
    );
});

app.post('/api/private-leagues/join', requireLogin, (req, res) => {
    const code = req.body.code?.trim().toUpperCase();
    const userId = getUserId(req);

    if (!code) {
        return res.json({ success: false, message: 'اكتب رمز الدوري' });
    }

    db.query(
        `SELECT * FROM private_leagues WHERE code = ?`,
        [code],
        (err, leagues) => {
            if (err) return res.status(500).json(err);

            if (leagues.length === 0) {
                return res.json({ success: false, message: 'رمز الدوري غير صحيح' });
            }

            const league = leagues[0];

            db.query(
                `SELECT COUNT(*) AS members_count 
                 FROM private_league_members 
                 WHERE league_id = ?`,
                [league.id],
                (err2, countResult) => {
                    if (err2) return res.status(500).json(err2);

                    if (countResult[0].members_count >= league.max_members) {
                        return res.json({ success: false, message: 'الدوري ممتلئ' });
                    }

                    db.query(
                        `INSERT INTO private_league_members
                        (league_id, user_id, role)
                        VALUES (?, ?, 'member')`,
                        [league.id, userId],
                        (err3) => {
                            if (err3) {
                                return res.json({ success: false, message: 'أنت منضم لهذا الدوري مسبقاً' });
                            }

                            res.json({
                                success: true,
                                message: 'تم الانضمام للدوري بنجاح',
                                leagueId: league.id
                            });
                        }
                    );
                }
            );
        }
    );
});

app.get('/api/private-leagues/my', requireLogin, (req, res) => {
    const userId = getUserId(req);

    db.query(
        `SELECT 
            pl.id,
            pl.name,
            pl.icon,
            pl.code,
            pl.max_members,
            pl.created_by,
            pl.created_at,
            plm.role,
            COUNT(plm2.user_id) AS members_count
        FROM private_league_members plm
        JOIN private_leagues pl ON plm.league_id = pl.id
        LEFT JOIN private_league_members plm2 ON pl.id = plm2.league_id
        WHERE plm.user_id = ?
        GROUP BY 
            pl.id, pl.name, pl.icon, pl.code,
            pl.max_members, pl.created_by, pl.created_at, plm.role
        ORDER BY pl.created_at DESC`,
        [userId],
        (err, leagues) => {
            if (err) return res.status(500).json(err);
            res.json(leagues);
        }
    );
});

// ── صفحة تفاصيل الدوري ──
app.get('/private-league.html', (req, res) => {
    res.sendFile(__dirname + '/public/private-league.html');
});

// ── API: تفاصيل الدوري مع my_role و my_uid ──
app.get('/api/private-leagues/:id', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId = getUserId(req);

    db.query(
        `SELECT role FROM private_league_members WHERE league_id = ? AND user_id = ?`,
        [leagueId, userId],
        (err, memberCheck) => {
            if (err) return res.status(500).json(err);
            if (memberCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'لا تملك صلاحية دخول هذا الدوري' });
            }

            const myRole = memberCheck[0].role;

            db.query(`SELECT * FROM private_leagues WHERE id = ?`, [leagueId], (err2, leagueResult) => {
                if (err2) return res.status(500).json(err2);

                db.query(`SELECT * FROM private_league_features WHERE league_id = ?`, [leagueId], (err3, featuresResult) => {
                    if (err3) return res.status(500).json(err3);

                    // ════════════════════════════════════════════════════════
                    //  ✅ معدّل: الترتيب الآن يُحسب من predictions العام مباشرة
                    //  (قراءة فقط) + طبقات إضافية لكل خاصية من private_league_card_usage
                    //  و private_league_golden_match — بدون أي اعتماد على
                    //  private_league_predictions القديم
                    // ════════════════════════════════════════════════════════
                    db.query(
                        `SELECT
                            p.Uid,
                            p.Username,

                            -- ١) مجموع نقاطه الأساسية (predictions العام)، مع طرح أي توقع
                            --    انسرق منه، ومع تطبيق مضاعفة المباراة الذهبية على التوقع الأصلي
                            COALESCE((
                                SELECT SUM(
                                    CASE WHEN gm2.match_id IS NOT NULL THEN base2.points * 2 ELSE base2.points END
                                )
                                FROM predictions base2
                                JOIN matches mb2 ON base2.match_id = mb2.Mid
                                JOIN private_league_tournaments plt2 
                                    ON plt2.tournament_id = mb2.tournament_id AND plt2.league_id = lm.league_id
                                LEFT JOIN private_league_golden_match gm2
                                    ON gm2.league_id = lm.league_id AND gm2.match_id = mb2.Mid
                                WHERE base2.user_id = p.Uid
                                  AND NOT EXISTS (
                                      SELECT 1 FROM private_league_card_usage st2
                                      WHERE st2.league_id = lm.league_id AND st2.card_type = 'steal'
                                        AND st2.target_user_id = p.Uid AND st2.match_id = base2.match_id
                                  )
                            ), 0)

                            -- ٢) النقاط المسروقة من غيره (تضاف كاملة لحساب السارق)
                            + COALESCE((
                                SELECT SUM(victim_pr.points)
                                FROM private_league_card_usage steal_in
                                JOIN predictions victim_pr 
                                    ON victim_pr.user_id = steal_in.target_user_id 
                                    AND victim_pr.match_id = steal_in.match_id
                                WHERE steal_in.league_id = lm.league_id
                                  AND steal_in.user_id = p.Uid
                                  AND steal_in.card_type = 'steal'
                            ), 0)


                            -- ٤) بونص الإنقاذ (1→2 لو نفس فارق الأهداف ونفس الفايز)
                            + COALESCE((
                                SELECT SUM(1)
                                FROM private_league_card_usage rc4
                                JOIN predictions base4 
                                    ON base4.user_id = p.Uid AND base4.match_id = rc4.match_id
                                JOIN matches mb4 ON mb4.Mid = rc4.match_id
                                WHERE rc4.league_id = lm.league_id AND rc4.user_id = p.Uid
                                  AND rc4.card_type = 'rescue'
                                  AND base4.points = 1
                                  AND mb4.home_score IS NOT NULL AND mb4.away_score IS NOT NULL
                                  AND ABS(base4.predicted_home_score - base4.predicted_away_score)
                                      = ABS(mb4.home_score - mb4.away_score)
                            ), 0)

                            AS total_points

                        FROM private_league_members lm
                        JOIN person p ON lm.user_id = p.Uid
                        WHERE lm.league_id = ?
                        ORDER BY total_points DESC`,
                        [leagueId],
                        (err4, leaderboard) => {
                            if (err4) return res.status(500).json(err4);

                            const league = leagueResult[0];
                            league.my_role = myRole;
                            league.my_uid  = userId;

                            // الدروع النشطة في الجولة الحالية
                            db.query(
                                `SELECT pls.user_id FROM private_league_shields pls
                                 WHERE pls.league_id = ?
                                   AND pls.round_id = (
                                       SELECT Rid FROM rounds ORDER BY Rid DESC LIMIT 1
                                   )`,
                                [leagueId],
                                (err5, shields) => {
                                    if (err5) shields = [];

                                    // سجل الأحداث
                                    db.query(
                                        `SELECT 
                                            cu.card_type,
                                            cu.created_at,
                                            actor.Username AS actor_name,
                                            target.Username AS target_name
                                         FROM private_league_card_usage cu
                                         JOIN person actor ON cu.user_id = actor.Uid
                                         LEFT JOIN person target ON cu.target_user_id = target.Uid
                                         WHERE cu.league_id = ?
                                         ORDER BY cu.created_at DESC
                                         LIMIT 50`,
                                        [leagueId],
                                        (err6, events) => {
                                            if (err6) events = [];

                                            res.json({
                                                league,
                                                features:   featuresResult[0] || null,
                                                leaderboard,
                                                shields:    shields || [],
                                                events:     events  || []
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        }
    );
});

// ── API: استخدامات اللاعب الحالي للخصائص ──
app.get('/api/private-leagues/:id/my-usage', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId = getUserId(req);

    db.query(
        `SELECT card_type, COUNT(*) AS used_count
         FROM private_league_card_usage
         WHERE league_id = ? AND user_id = ?
         GROUP BY card_type`,
        [leagueId, userId],
        (err, usage) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json({ usage });
        }
    );
});

// ══════════════════════════════════════════════
//  HELPER: تحقق إن اللاعب في الدوري
// ══════════════════════════════════════════════
function checkMember(leagueId, userId, db, cb) {
    db.query(
        `SELECT role FROM private_league_members WHERE league_id = ? AND user_id = ?`,
        [leagueId, userId],
        (err, rows) => {
            if (err) return cb(err);
            if (rows.length === 0) return cb(new Error('لست عضواً في هذا الدوري'));
            cb(null, rows[0].role);
        }
    );
}

// HELPER: تحقق إن الخاصية مفعّلة وكم باقي للاعب
function checkCardLimit(leagueId, userId, cardType, db, cb) {
    db.query(
        `SELECT * FROM private_league_features WHERE league_id = ?`,
        [leagueId],
        (err, rows) => {
            if (err) return cb(err);
            if (rows.length === 0) return cb(new Error('لا توجد إعدادات للدوري'));

            const f = rows[0];
            const enabledCol = cardType + '_enabled';
            const limitCol   = cardType + '_limit';

            if (!f[enabledCol]) return cb(new Error('هذه الخاصية غير مفعّلة في الدوري'));

            const limit = f[limitCol] || 0;

            db.query(
                `SELECT COUNT(*) AS used FROM private_league_card_usage
                 WHERE league_id = ? AND user_id = ? AND card_type = ?`,
                [leagueId, userId, cardType],
                (err2, usageRows) => {
                    if (err2) return cb(err2);
                    const used = usageRows[0].used;
                    if (used >= limit) return cb(new Error('استنفدت عدد استخدامات هذه الخاصية'));
                    cb(null, { used, limit });
                }
            );
        }
    );
}

// ══════════════════════════════════════════════
//  1. المباراة الذهبية — المشرف يحددها
//     (بدون تغيير — تكتب فقط بـ private_league_golden_match)
// ══════════════════════════════════════════════
app.post('/api/private-leagues/:id/golden-match', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId = getUserId(req);
    const { match_id } = req.body;

    if (!match_id) {
        return res.json({ success: false, message: 'حدد المباراة' });
    }

    checkMember(leagueId, userId, db, (err, role) => {
        if (err) return res.json({ success: false, message: err.message });

        if (role !== 'owner') {
            return res.json({
                success: false,
                message: 'فقط منشئ الدوري يقدر يحدد المباراة الذهبية'
            });
        }

        checkCardLimit(leagueId, userId, 'golden_match', db, (err2) => {
            if (err2) {
                return res.json({
                    success: false,
                    message: err2.message
                });
            }

            db.query(
                `SELECT m.Mid, m.round_id, m.match_date
                 FROM matches m
                 JOIN private_league_tournaments plt
                    ON plt.tournament_id = m.tournament_id
                 WHERE m.Mid = ?
                 AND plt.league_id = ?
                 AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')`,
                [match_id, leagueId],
                (err3, matchRows) => {
                    if (err3) {
                        return res.status(500).json({
                            success: false,
                            message: err3.message
                        });
                    }

                    if (matchRows.length === 0) {
                        return res.json({
                            success: false,
                            message: 'المباراة غير موجودة في هذا الدوري أو بدأت'
                        });
                    }

                    const match = matchRows[0];

                    db.query(
                        `SELECT id
                         FROM private_league_golden_match
                         WHERE league_id = ?
                         AND round_id = ?`,
                        [leagueId, match.round_id],
                        (err4, existing) => {
                            if (err4) {
                                return res.status(500).json({
                                    success: false,
                                    message: err4.message
                                });
                            }

                            if (existing.length > 0) {
                                return res.json({
                                    success: false,
                                    message: 'تم تحديد مباراة ذهبية لهذه الجولة مسبقاً'
                                });
                            }

                            db.query(
                                `INSERT INTO private_league_golden_match
                                 (league_id, match_id, round_id, created_by)
                                 VALUES (?, ?, ?, ?)`,
                                [leagueId, match_id, match.round_id, userId],
                                (err5) => {
                                    if (err5) {
                                        return res.status(500).json({
                                            success: false,
                                            message: err5.message
                                        });
                                    }

                                    db.query(
                                        `INSERT INTO private_league_card_usage
                                         (league_id, user_id, card_type, match_id, round_id)
                                         VALUES (?, ?, 'golden_match', ?, ?)`,
                                        [leagueId, userId, match_id, match.round_id],
                                        (err6) => {
                                            if (err6) {
                                                return res.status(500).json({
                                                    success: false,
                                                    message: err6.message
                                                });
                                            }

                                            res.json({
                                                success: true,
                                                message: '⭐ تم تحديد المباراة الذهبية بنجاح'
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});


// جلب المباراة الذهبية للجولة الحالية
app.get('/api/private-leagues/:id/golden-match', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const { round_id } = req.query;

    db.query(
        `SELECT plg.*, m.home_team, m.away_team, m.match_date
         FROM private_league_golden_match plg
         JOIN matches m ON plg.match_id = m.Mid
         WHERE plg.league_id = ? AND plg.round_id = ?`,
        [leagueId, round_id],
        (err, rows) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json(rows[0] || null);
        }
    );
});

// ══════════════════════════════════════════════
//  2. الدرع — اللاعب يحمي نفسه جولة كاملة
//     (بدون تغيير)
// ══════════════════════════════════════════════
app.post('/api/private-leagues/:id/shield', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId   = getUserId(req);
    const { round_id } = req.body;

    if (!round_id) return res.json({ success: false, message: 'حدد الجولة' });

    checkMember(leagueId, userId, db, (err) => {
        if (err) return res.json({ success: false, message: err.message });

        checkCardLimit(leagueId, userId, 'shield', db, (err2) => {
            if (err2) return res.json({ success: false, message: err2.message });

            // تحقق ما عنده درع في نفس الجولة
            db.query(
                `SELECT id FROM private_league_shields WHERE league_id = ? AND user_id = ? AND round_id = ?`,
                [leagueId, userId, round_id],
                (err3, existing) => {
                    if (err3) return res.status(500).json(err3);
                    if (existing.length > 0) return res.json({ success: false, message: 'فعّلت الدرع في هذه الجولة مسبقاً' });

                    db.query(
                        `INSERT INTO private_league_shields (league_id, user_id, round_id) VALUES (?, ?, ?)`,
                        [leagueId, userId, round_id],
                        (err4) => {
                            if (err4) return res.status(500).json(err4);

                            // سجل الاستخدام
                            db.query(
                                `INSERT INTO private_league_card_usage (league_id, user_id, card_type, round_id)
                                 VALUES (?, ?, 'shield', ?)`,
                                [leagueId, userId, round_id],
                                (err5) => {
                                    if (err5) return res.status(500).json(err5);
                                    res.json({ success: true, message: 'تم تفعيل الدرع 🛡️ أنت محمي هذه الجولة' });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});

// ══════════════════════════════════════════════
//  3. السرقة — يسرق توقع من لاعب آخر
//  ✅ معدّل بالكامل: يقرأ من predictions العام مباشرة
//     ويسجل فقط بـ private_league_card_usage — بدون
//     أي لمس أو تعديل لجدول predictions نفسه
// ══════════════════════════════════════════════
app.get('/api/private-leagues/:id/stealable', requireLogin, (req, res) => {
    const leagueId            = req.params.id;
    const { target_user_id }  = req.query;

    if (!target_user_id) return res.json({ success: false, message: 'حدد اللاعب' });

    // توقعات المستهدف الحقيقية (من predictions العام)، على مباريات بطولات هذا
    // الدوري بالذات، ولسا ما بدأت، وما سُرقت من قبل بنفس الدوري
    db.query(
        `SELECT pr.Pid AS id, pr.match_id, pr.predicted_home_score, pr.predicted_away_score,
                m.home_team, m.away_team, m.match_date, m.round_id
         FROM predictions pr
         JOIN matches m ON pr.match_id = m.Mid
         JOIN private_league_tournaments plt 
             ON plt.tournament_id = m.tournament_id AND plt.league_id = ?
         WHERE pr.user_id = ?
           AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')
           AND NOT EXISTS (
               SELECT 1 FROM private_league_card_usage cu
               WHERE cu.league_id = ? AND cu.card_type = 'steal'
                 AND cu.target_user_id = ? AND cu.match_id = pr.match_id
           )`,
        [leagueId, target_user_id, leagueId, target_user_id],
        (err, rows) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json(rows);
        }
    );
});

app.post('/api/private-leagues/:id/steal', requireLogin, (req, res) => {
    const leagueId    = req.params.id;
    const userId      = getUserId(req);
    const { target_user_id, prediction_id } = req.body;

    if (!target_user_id || !prediction_id) {
        return res.json({ success: false, message: 'بيانات ناقصة' });
    }
    if (String(target_user_id) === String(userId)) {
        return res.json({ success: false, message: 'ما تقدر تسرق من نفسك' });
    }

    checkMember(leagueId, userId, db, (err) => {
        if (err) return res.json({ success: false, message: err.message });

        checkCardLimit(leagueId, userId, 'steal', db, (err2) => {
            if (err2) return res.json({ success: false, message: err2.message });

            // تحقق إن التوقع المستهدف موجود وحقيقي بـ predictions العام
            db.query(
                `SELECT pr.match_id, m.round_id, m.match_date
                 FROM predictions pr
                 JOIN matches m ON pr.match_id = m.Mid
                 WHERE pr.Pid = ? AND pr.user_id = ?
                   AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')`,
                [prediction_id, target_user_id],
                (err3, predRows) => {
                    if (err3) return res.status(500).json(err3);
                    if (predRows.length === 0) {
                        return res.json({ success: false, message: 'التوقع غير موجود أو انتهى وقته' });
                    }

                    const matchId = predRows[0].match_id;
                    const roundId = predRows[0].round_id;

                    // تحقق المستهدف ما عنده درع بهذي الجولة بهذا الدوري
                    db.query(
                        `SELECT id FROM private_league_shields
                         WHERE league_id = ? AND user_id = ? AND round_id = ?`,
                        [leagueId, target_user_id, roundId],
                        (err4, shieldRows) => {
                            if (err4) return res.status(500).json(err4);
                            if (shieldRows.length > 0) {
                                return res.json({ success: false, message: '🛡️ هذا اللاعب محمي بالدرع هذه الجولة' });
                            }

                            // تحقق ما سرق نفس التوقع من نفس الشخص بنفس الدوري من قبل
                            db.query(
                                `SELECT id FROM private_league_card_usage
                                 WHERE league_id = ? AND user_id = ? AND card_type = 'steal'
                                   AND target_user_id = ? AND match_id = ?`,
                                [leagueId, userId, target_user_id, matchId],
                                (err5, prevSteal) => {
                                    if (err5) return res.status(500).json(err5);
                                    if (prevSteal.length > 0) {
                                        return res.json({ success: false, message: 'سرقت هذا التوقع من قبل' });
                                    }

                                    // تحقق ما سُرق هذا التوقع من شخص ثاني بنفس الدوري من قبل
                                    db.query(
                                        `SELECT id FROM private_league_card_usage
                                         WHERE league_id = ? AND card_type = 'steal'
                                           AND target_user_id = ? AND match_id = ?`,
                                        [leagueId, target_user_id, matchId],
                                        (err6, alreadyStolen) => {
                                            if (err6) return res.status(500).json(err6);
                                            if (alreadyStolen.length > 0) {
                                                return res.json({ success: false, message: 'هذا التوقع انسرق من قبل' });
                                            }

                                            // تسجيل السرقة — بدون أي لمس لـ predictions العام
                                            db.query(
                                                `INSERT INTO private_league_card_usage
                                                 (league_id, user_id, card_type, target_user_id, match_id, round_id)
                                                 VALUES (?, ?, 'steal', ?, ?, ?)`,
                                                [leagueId, userId, target_user_id, matchId, roundId],
                                                (err7) => {
                                                    if (err7) return res.status(500).json(err7);
                                                    res.json({ success: true, message: '🕵️ تمت السرقة بنجاح' });
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});

// ══════════════════════════════════════════════
//  4. بطاقة الإنقاذ — تفعيل على مباراة معينة
//  ✅ معدّل: تسجيل استخدام فقط بـ private_league_card_usage
//     بدون أي تعديل على predictions العام. الحساب يصير
//     وقت عرض الترتيب
// ══════════════════════════════════════════════
app.post('/api/private-leagues/:id/rescue', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId   = getUserId(req);
    const { match_id } = req.body;

    if (!match_id) return res.json({ success: false, message: 'حدد المباراة' });

    checkMember(leagueId, userId, db, (err) => {
        if (err) return res.json({ success: false, message: err.message });

        checkCardLimit(leagueId, userId, 'rescue', db, (err2) => {
            if (err2) return res.json({ success: false, message: err2.message });

            // تحقق إن عنده توقع حقيقي على هذه المباراة بـ predictions العام والمباراة لسا ما بدأت
            db.query(
                `SELECT pr.Pid, m.match_date, m.round_id 
                 FROM predictions pr
                 JOIN matches m ON pr.match_id = m.Mid
                 WHERE pr.user_id = ? AND pr.match_id = ?
                   AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')`,
                [userId, match_id],
                (err3, predRows) => {
                    if (err3) return res.status(500).json(err3);
                    if (predRows.length === 0) {
                        return res.json({ success: false, message: 'ما عندك توقع على هذه المباراة أو بدأت' });
                    }

                    const roundId = predRows[0].round_id;

                    // تحقق ما استخدمها على نفس المباراة بنفس الدوري من قبل
                    db.query(
                        `SELECT id FROM private_league_card_usage
                         WHERE league_id = ? AND user_id = ? AND card_type = 'rescue' AND match_id = ?`,
                        [leagueId, userId, match_id],
                        (err4, existing) => {
                            if (err4) return res.status(500).json(err4);
                            if (existing.length > 0) {
                                return res.json({ success: false, message: 'فعّلت الإنقاذ على هذه المباراة مسبقاً' });
                            }

                            // تسجيل الاستخدام فقط — بدون أي تعديل على predictions
                            db.query(
                                `INSERT INTO private_league_card_usage
                                 (league_id, user_id, card_type, match_id, round_id)
                                 VALUES (?, ?, 'rescue', ?, ?)`,
                                [leagueId, userId, match_id, roundId],
                                (err5) => {
                                    if (err5) return res.status(500).json(err5);
                                    res.json({ success: true, message: '🆘 تم تفعيل بطاقة الإنقاذ' });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});

// ══════════════════════════════════════════════
//  ❌ تم حذف الدالة calcPrivateLeaguePoints بالكامل.
//  السبب: النقاط تُحسب الآن وقت عرض الترتيب مباشرة من
//  predictions العام (انظر استعلام الـ leaderboard فوق)،
//  ولا حاجة لأي حساب أو تخزين مسبق عند انتهاء المباراة.
//  لا تستدعِ هذه الدالة من أي مكان بالسيرفر — احذف أي
//  استدعاء قديم لها لو وجدته بمكان ثاني بالكود.
// ══════════════════════════════════════════════

// ── مباريات الدوري القادمة ──
// (بدون تغيير — تجيب من matches مباشرة أصلاً)
app.get('/api/private-leagues/:id/upcoming-matches', requireLogin, (req, res) => {
    const leagueId = req.params.id;

    db.query(
        `SELECT DISTINCT m.Mid, m.home_team, m.away_team, m.match_date, m.underdog_team, m.round_id
         FROM matches m
         JOIN private_league_tournaments plt ON plt.tournament_id = m.tournament_id
         WHERE plt.league_id = ?
           AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')
           AND (m.home_score IS NULL OR m.home_score = -1)
         ORDER BY m.match_date ASC`,
        [leagueId],
        (err, rows) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json(rows);
        }
    );
});

// ── توقعاتي في الدوري الخاص (للإنقاذ) ──
//  ✅ معدّل: تجيب من predictions العام بدل private_league_predictions
app.get('/api/private-leagues/:id/my-predictions', requireLogin, (req, res) => {
    const leagueId = req.params.id;
    const userId   = getUserId(req);

    db.query(
        `SELECT pr.match_id, pr.predicted_home_score, pr.predicted_away_score,
                m.home_team, m.away_team, m.match_date
         FROM predictions pr
         JOIN matches m ON pr.match_id = m.Mid
         JOIN private_league_tournaments plt 
             ON plt.tournament_id = m.tournament_id AND plt.league_id = ?
         WHERE pr.user_id = ?
           AND m.match_date > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')
           AND NOT EXISTS (
               SELECT 1 FROM private_league_card_usage cu
               WHERE cu.league_id = ? AND cu.user_id = ? 
                 AND cu.card_type = 'rescue' AND cu.match_id = pr.match_id
           )
         ORDER BY m.match_date ASC`,
        [leagueId, userId, leagueId, userId],
        (err, rows) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json(rows);
        }
    );
});

// ── سجل الأحداث ──
// (بدون تغيير)
app.get('/api/private-leagues/:id/events', requireLogin, (req, res) => {
    const leagueId = req.params.id;

    db.query(
        `SELECT 
            cu.card_type,
            cu.created_at,
            actor.Username AS actor_name,
            target.Username AS target_name,
            m.home_team,
            m.away_team
         FROM private_league_card_usage cu
         JOIN person actor ON cu.user_id = actor.Uid
         LEFT JOIN person target ON cu.target_user_id = target.Uid
         LEFT JOIN matches m ON cu.match_id = m.Mid
         WHERE cu.league_id = ?
         ORDER BY cu.created_at DESC
         LIMIT 50`,
        [leagueId],
        (err, rows) => {
            if (err) {
    return res.status(500).json({
        success: false,
        message: err.message
    });
}
            res.json(rows);
        }
    );
});

app.listen(3000, () => {
    console.log('Server Running');
})