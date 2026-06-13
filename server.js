const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./db');

const app = express();

app.use(session({
    secret: 'king_predictions_secret',
    resave: false,
    saveUninitialized: false
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
                <span>🥇 ترتيب البطولة الحالية</span>
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
            document.getElementById('currentRank').innerText = data.currentTournamentRank;
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
        'انجلترا':'gb','المانيا':'de','إيطاليا':'it','هولندا':'nl','بلجيكا':'be',
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

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>لوحة الأدمن</title>
            <link rel="stylesheet" href="/style.css">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>

        <body>

        <div class="container mt-5">

            <h1 class="text-center text-warning mb-4">
                لوحة الأدمن
            </h1>
            <div class="admin-grid">

            <div class="card mb-4 p-4">

                <h3>إضافة بطولة</h3>

                <form action="/admin/add-tournament" method="POST">

                    <input
                        type="text"
                        name="name"
                        class="form-control mb-3"
                        placeholder="اسم البطولة"
                        required>

                    <input
                        type="date"
                        name="start_date"
                        class="form-control mb-3"
                        required>

                    <input
                        type="date"
                        name="end_date"
                        class="form-control mb-3"
                        required>

                    <button class="btn btn-warning w-100">
                        إضافة البطولة
                    </button>

                </form>

            </div>
            <div class="card mb-4 p-4">

    <h3>إضافة جولة</h3>

    <form action="/admin/add-round" method="POST">

        <select
            name="tournament_id"
            class="form-control mb-3 admin-tournament-select"
            required>
            <option value="">اختر البطولة</option>
        </select>

        <input
            type="text"
            name="round_name"
            class="form-control mb-3"
            placeholder="اسم الجولة"
            required>

        <input
            type="date"
            name="start_date"
            class="form-control mb-3"
            required>

        <input
            type="date"
            name="end_date"
            class="form-control mb-3"
            required>

        <button class="btn btn-warning w-100">
            إضافة الجولة
        </button>

    </form>

</div>


<div class="card p-4">

    <h3>إضافة مباراة</h3>

    <form action="/admin/add-match" method="POST">

        <select
            name="tournament_id"
            id="matchTournamentSelect"
            class="form-control mb-3"
            required>
            <option value="">اختر البطولة</option>
        </select>

        <select
            name="round_id"
            id="matchRoundSelect"
            class="form-control mb-3"
            required>
            <option value="">اختر الجولة</option>
        </select>

        <input
            type="text"
            name="home_team"
            class="form-control mb-3"
            placeholder="الفريق الأول"
            required>

        <input
            type="text"
            name="away_team"
            class="form-control mb-3"
            placeholder="الفريق الثاني"
            required>

        <input
            type="datetime-local"
            name="match_date"
            class="form-control mb-3"
            required>

        <input
            type="number"
            name="home_win_percent"
            class="form-control mb-3"
            placeholder="نسبة فوز الفريق الأول"
            min="0"
            max="100"
            required>

        <input
            type="number"
            name="away_win_percent"
            class="form-control mb-3"
            placeholder="نسبة فوز الفريق الثاني"
            min="0"
            max="100"
            required>

        <div class="form-check mb-3">

            <input
                class="form-check-input"
                type="checkbox"
                name="is_golden"
                value="1"
                id="goldenMatch">

            <label class="form-check-label" for="goldenMatch">
                مباراة ذهبية ⭐
            </label>

        </div>

        <button class="btn btn-warning w-100">
            إضافة المباراة
        </button>

    </form>

</div>

<div class="card p-4">

    <h3>تعديل مباراة</h3>

    <form action="/admin/update-match" method="POST">

        <select name="match_id" class="form-control mb-3 admin-match-select" required>
        <option value="">اختر المباراة</option>
        </select>

        <input
            type="number"
            name="round_id"
            class="form-control mb-3"
            placeholder="رقم الجولة الجديد - اختياري">

        <input
            type="text"
            name="home_team"
            class="form-control mb-3"
            placeholder="اسم الفريق الأول الجديد - اختياري">

        <input
            type="text"
            name="away_team"
            class="form-control mb-3"
            placeholder="اسم الفريق الثاني الجديد - اختياري">

        <input
            type="datetime-local"
            name="match_date"
            class="form-control mb-3">

        <input
            type="number"
            name="home_win_percent"
            class="form-control mb-3"
            placeholder="نسبة فوز الفريق الأول - اختياري"
            min="0"
            max="100">

        <input
            type="number"
            name="away_win_percent"
            class="form-control mb-3"
            placeholder="نسبة فوز الفريق الثاني - اختياري"
            min="0"
            max="100">

        <button class="btn btn-warning w-100">
            تعديل المباراة
        </button>

    </form>

</div>

<div class="card p-4">

    <h3>إضافة نتيجة مباراة</h3>

    <form action="/admin/update-result" method="POST">

        <select name="match_id" class="form-control mb-3 admin-match-select" required>
        <option value="">اختر المباراة</option>
        </select>

        <input
            type="number"
            name="home_score"
            class="form-control mb-3"
            placeholder="نتيجة الفريق الأول"
            min="0"
            required>

        <input
            type="number"
            name="away_score"
            class="form-control mb-3"
            placeholder="نتيجة الفريق الثاني"
            min="0"
            required>

        <button class="btn btn-success w-100">
            حفظ النتيجة
        </button>

    </form>

</div>

<div class="card p-4">

    <h3>تحديد بطل وهداف البطولة</h3>

    <form action="/admin/finalize-tournament" method="POST">

        <input type="number" name="tournament_id" class="form-control mb-3" placeholder="رقم البطولة" required>

        <input type="text" name="champion_winner" class="form-control mb-3" placeholder="بطل البطولة" required>

        <input type="text" name="top_scorer_winner" class="form-control mb-3" placeholder="هداف البطولة" required>

        <button class="btn btn-warning w-100">
            حفظ واحتساب النقاط
        </button>

    </form>

</div>

    </form>

</div>

<div class="card p-4">

    <h3>الحذف والإزالة</h3>

    <form action="/admin/delete-prediction" method="POST">
        <input type="number" name="prediction_id" class="form-control mb-3" placeholder="رقم التوقع Pid">
        <button class="btn btn-danger w-100 mb-3">حذف التوقع</button>
    </form>

    <form action="/admin/delete-match" method="POST">
        <input type="number" name="match_id" class="form-control mb-3" placeholder="رقم المباراة Mid">
        <button class="btn btn-danger w-100 mb-3">حذف المباراة</button>
    </form>

    <form action="/admin/delete-tournament" method="POST">
        <input type="number" name="tournament_id" class="form-control mb-3" placeholder="رقم البطولة">
        <button class="btn btn-danger w-100 mb-3">حذف البطولة</button>
    </form>

    <form action="/admin/delete-result" method="POST">
        <input type="number" name="match_id" class="form-control mb-3" placeholder="رقم المباراة لحذف نتيجتها">
        <button class="btn btn-warning w-100">حذف نتيجة المباراة</button>
    </form>

</div>

<div class="card p-4">

    <h3>تحديد فائز الجولة</h3>

    <form action="/admin/calculate-round-winner" method="POST">

        <select
            name="round_id"
            id="winnerRoundSelect"
            class="form-control mb-3"
            required>
            <option value="">اختر الجولة</option>
        </select>

        <button class="btn btn-warning w-100">
            احتساب فائز الجولة
        </button>

    </form>

</div>

            </div>
            <div class="text-center mt-4">
                <a href="/dashboard" class="btn btn-light">
                    الرجوع للرئيسية
                </a>
            </div>

        </div>

        <script>
fetch('/api/admin/tournaments')
    .then(res => res.json())
    .then(tournaments => {

        document
            .querySelectorAll('.admin-tournament-select, #matchTournamentSelect')
            .forEach(select => {

                tournaments.forEach(tournament => {
                    const option = document.createElement('option');
                    option.value = tournament.id;
                    option.textContent = tournament.Tname;
                    select.appendChild(option);
                });

            });

    });

document.getElementById('matchTournamentSelect').addEventListener('change', function () {

    const tournamentId = this.value;
    const roundSelect = document.getElementById('matchRoundSelect');

    roundSelect.innerHTML = '<option value="">اختر الجولة</option>';

    if (!tournamentId) {
        return;
    }

    fetch('/api/admin/rounds/' + tournamentId)
        .then(res => res.json())
        .then(rounds => {

            rounds.forEach(round => {
                const option = document.createElement('option');
                option.value = round.Rid;
                option.textContent = round.round_name;
                roundSelect.appendChild(option);
            });

        });

});

fetch('/api/admin/matches')
    .then(res => res.json())
    .then(matches => {

        const matchSelects = document.querySelectorAll('.admin-match-select');

        matchSelects.forEach(select => {

            matches.forEach(match => {

                const option = document.createElement('option');

                option.value = match.Mid;

                option.textContent =
                    match.Mid + ' - ' +
                    match.home_team + ' ضد ' +
                    match.away_team + ' | ' +
                    (match.Tname || '') + ' | ' +
                    (match.round_name || '');

                select.appendChild(option);

            });

        });

    });
    fetch('/api/admin/all-rounds')
    .then(res => res.json())
    .then(rounds => {

        const select = document.getElementById('winnerRoundSelect');

        rounds.forEach(round => {
            const option = document.createElement('option');
            option.value = round.Rid;
            option.textContent = round.round_name + ' | ' + round.Tname;
            select.appendChild(option);
        });

    });

</script>

        </body>
        </html>
    `);

});

app.post('/admin/add-tournament', isAdmin, (req, res) => {

    const { name, start_date, end_date } = req.body;

    db.query(
        `INSERT INTO tournaments
        (Tname, start_date, end_date)
        VALUES (?, ?, ?)`,
        [name, start_date, end_date],
        (err) => {

            if (err) {
                return res.send(err);
            }

            res.redirect('/admin');

        }
    );

});

app.post('/admin/add-round', isAdmin, (req, res) => {

    const { tournament_id, round_name, start_date, end_date } = req.body;

    db.query(
        `INSERT INTO rounds
        (tournament_id, round_name, start_date, end_date)
        VALUES (?, ?, ?, ?)`,
        [tournament_id, round_name, start_date, end_date],
        (err) => {

            if (err) {
                return res.send(err);
            }

            res.redirect('/admin');

        }
    );

});

app.post('/admin/add-match', isAdmin, (req, res) => {

    const {
        tournament_id,
        round_id,
        home_team,
        away_team,
        match_date,
        home_win_percent,
        away_win_percent,
        is_golden
    } = req.body;

    const homePercent = Number(home_win_percent);
    const awayPercent = Number(away_win_percent);

    const underdog_team =
        homePercent < awayPercent ? home_team : away_team;

    const goldenValue = is_golden ? 1 : 0;

    if (goldenValue === 1) {

        db.query(
            `SELECT Mid
             FROM matches
             WHERE round_id = ?
             AND is_golden = 1`,
            [round_id],
            (err, result) => {

                if (err) {
                    return res.send(err);
                }

                if (result.length > 0) {
                    return res.send('يوجد مباراة ذهبية مسبقًا في هذه الجولة');
                }

                insertMatch();

            }
        );

    } else {

        insertMatch();

    }

    function insertMatch() {

        db.query(
            `INSERT INTO matches
            (
                tournament_id,
                round_id,
                home_team,
                away_team,
                match_date,
                home_win_percent,
                away_win_percent,
                underdog_team,
                is_golden
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tournament_id,
                round_id,
                home_team,
                away_team,
                match_date,
                homePercent,
                awayPercent,
                underdog_team,
                goldenValue
            ],
            (err) => {

                if (err) {
                    return res.send(err);
                }

                res.redirect('/admin');

            }
        );

    }

});

app.get('/api/tournaments', (req, res) => {

    db.query(
        'SELECT * FROM tournaments',
        (err, result) => {

            if (err) {
                return res.send(err);
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

app.get('/api/matches/:tournamentId', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: 'لازم تسجل دخول' });
    }

    const tournamentId = req.params.tournamentId;
    const userId = req.session.user.id;

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
            matches.underdog_team,
            matches.home_win_percent,
            matches.away_win_percent,

            rounds.round_name,

            predictions.predicted_home_score,
            predictions.predicted_away_score,
            predictions.points,
            predictions.used_loser_card

        FROM matches

        LEFT JOIN rounds 
            ON matches.round_id = rounds.Rid

        LEFT JOIN predictions
            ON predictions.match_id = matches.Mid
            AND predictions.user_id = ?

        WHERE matches.tournament_id = ?

        ORDER BY matches.match_date ASC`,
        [userId, tournamentId],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }
            console.log(result[0]);

            res.json(result);

        }
    );

});

app.get('/predict', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

    res.sendFile(__dirname + '/public/predict.html');

});


app.post('/api/predictions', (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            error: 'لازم تسجل دخول'
        });
    }

    const {
        match_id,
        predicted_home_score,
        predicted_away_score,
        used_loser_card
    } = req.body;

    const wantsLoserCard =
        used_loser_card === true || used_loser_card === 1 || used_loser_card === '1';

    db.query(
        `SELECT match_date, tournament_id, home_team, away_team, underdog_team
FROM matches
WHERE Mid = ?`,
        [match_id],
        (err, matchResult) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (matchResult.length === 0) {
                return res.status(404).json({
                    error: 'المباراة غير موجودة'
                });
            }

            const matchDate = new Date(matchResult[0].match_date);
            const tournamentId = matchResult[0].tournament_id;
            const homeTeam = matchResult[0].home_team;
            const awayTeam = matchResult[0].away_team;
            const underdogTeam = matchResult[0].underdog_team;

            if (matchDate <= new Date()) {
                return res.status(400).json({
                    error: '❌ انتهى وقت التوقع لهذه المباراة'
                });
            }
            if (wantsLoserCard) {

    const predictedHome = Number(predicted_home_score);
    const predictedAway = Number(predicted_away_score);

    let predictedWinner = '';

    if (predictedHome > predictedAway) {
        predictedWinner = homeTeam;
    } else if (predictedAway > predictedHome) {
        predictedWinner = awayTeam;
    } else {
        predictedWinner = 'draw';
    }

    if (predictedWinner !== underdogTeam) {
        return res.status(400).json({
            error: '🐎 بطاقة الحصان الأسود تُستخدم فقط إذا توقعت فوز الفريق غير المرشح'
        });
    }

}

            db.query(
                `SELECT *
                 FROM predictions
                 WHERE user_id = ?
                 AND match_id = ?`,
                [req.session.user.id, match_id],
                (err, existingPrediction) => {

                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    const oldUsedLoserCard =
                        existingPrediction.length > 0
                            ? existingPrediction[0].used_loser_card
                            : 0;

                    if (wantsLoserCard && oldUsedLoserCard != 1) {

                        db.query(
                            `SELECT COUNT(*) AS usedCards
                             FROM predictions
                             JOIN matches ON predictions.match_id = matches.Mid
                             WHERE predictions.user_id = ?
                             AND predictions.used_loser_card = 1
                             AND matches.tournament_id = ?`,
                            [req.session.user.id, tournamentId],
                            (err, cardResult) => {

                                if (err) {
                                    return res.status(500).json({ error: err.message });
                                }

                                if (cardResult[0].usedCards >= 2) {
                                    return res.status(400).json({
                                        error: '🐎 استخدمت بطاقتي الحصان الأسود المسموحة في هذه البطولة'
                                    });
                                }

                                saveOrUpdatePrediction(existingPrediction);

                            }
                        );

                    } else {
                        saveOrUpdatePrediction(existingPrediction);
                    }

                }
            );

        }
    );

    function saveOrUpdatePrediction(existingPrediction) {

        if (existingPrediction.length > 0) {

            db.query(
                `UPDATE predictions
                 SET
                    predicted_home_score = ?,
                    predicted_away_score = ?,
                    used_loser_card = ?
                 WHERE user_id = ?
                 AND match_id = ?`,
                [
                    predicted_home_score,
                    predicted_away_score,
                    wantsLoserCard ? 1 : 0,
                    req.session.user.id,
                    match_id
                ],
                (err) => {

                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        message: '✅ تم تحديث التوقع'
                    });

                }
            );

        } else {

            db.query(
                `INSERT INTO predictions
                (
                    user_id,
                    match_id,
                    predicted_home_score,
                    predicted_away_score,
                    used_loser_card,
                    points
                )
                VALUES (?, ?, ?, ?, ?, 0)`,
                [
                    req.session.user.id,
                    match_id,
                    predicted_home_score,
                    predicted_away_score,
                    wantsLoserCard ? 1 : 0
                ],
                (err) => {

                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        message: '✅ تم حفظ التوقع'
                    });

                }
            );

        }

    }

});

app.post('/admin/update-match', isAdmin, (req, res) => {

    const {
        match_id,
        round_id,
        home_team,
        away_team,
        match_date,
        home_win_percent,
        away_win_percent
    } = req.body;

    db.query(
        'SELECT * FROM matches WHERE Mid = ?',
        [match_id],
        (err, result) => {

            if (err) {
                return res.send(err);
            }

            if (result.length === 0) {
                return res.send('المباراة غير موجودة');
            }

            const old = result[0];

            const newRoundId = round_id || old.round_id;
            const newHomeTeam = home_team || old.home_team;
            const newAwayTeam = away_team || old.away_team;
            const newMatchDate = match_date || old.match_date;
            const newHomePercent = home_win_percent !== '' ? Number(home_win_percent) : old.home_win_percent;
            const newAwayPercent = away_win_percent !== '' ? Number(away_win_percent) : old.away_win_percent;

            const underdog_team =
                newHomePercent < newAwayPercent ? newHomeTeam : newAwayTeam;

            db.query(
                `UPDATE matches
                 SET
                    round_id = ?,
                    home_team = ?,
                    away_team = ?,
                    match_date = ?,
                    home_win_percent = ?,
                    away_win_percent = ?,
                    underdog_team = ?
                 WHERE Mid = ?`,
                [
                    newRoundId,
                    newHomeTeam,
                    newAwayTeam,
                    newMatchDate,
                    newHomePercent,
                    newAwayPercent,
                    underdog_team,
                    match_id
                ],
                (err) => {

                    if (err) {
                        return res.send(err);
                    }

                    res.redirect('/admin');

                }
            );

        }
    );

});

app.post('/admin/update-result', isAdmin, (req, res) => {

    const { match_id, home_score, away_score } = req.body;

    db.query(
        `UPDATE matches
         SET home_score = ?,
             away_score = ?
         WHERE Mid = ?`,
        [home_score, away_score, match_id],
        (err) => {

            if (err) {
                return res.send(err);
            }

            db.query(
                `SELECT *
                 FROM predictions
                 WHERE match_id = ?`,
                [match_id],
                (err, predictions) => {

                    if (err) {
                        return res.send(err);
                    }

                    db.query(
                        `SELECT *
                         FROM matches
                         WHERE Mid = ?`,
                        [match_id],
                        (err, matchResult) => {

                            if (err) {
                                return res.send(err);
                            }

                            const match = matchResult[0];

                            let actualWinner = '';

                            if (Number(home_score) > Number(away_score)) {
                                actualWinner = match.home_team;
                            } else if (Number(away_score) > Number(home_score)) {
                                actualWinner = match.away_team;
                            } else {
                                actualWinner = 'draw';
                            }

                            if (predictions.length === 0) {
                                return afterPointsCalculated(match.round_id);
                            }

                            let finished = 0;

                            predictions.forEach(prediction => {

                                let predictedWinner = '';

                                if (prediction.predicted_home_score > prediction.predicted_away_score) {
                                    predictedWinner = match.home_team;
                                } else if (prediction.predicted_away_score > prediction.predicted_home_score) {
                                    predictedWinner = match.away_team;
                                } else {
                                    predictedWinner = 'draw';
                                }

                                const exactScore =
                                    Number(prediction.predicted_home_score) === Number(home_score) &&
                                    Number(prediction.predicted_away_score) === Number(away_score);

                                let points = 0;

                                if (prediction.used_loser_card == 1) {

                                    if (
                                        actualWinner === match.underdog_team &&
                                        predictedWinner === actualWinner
                                    ) {
                                        if (exactScore) {
                                            points = 10;
                                        } else {
                                            points = 3;
                                        }
                                    }

                                } else {

                                    if (exactScore) {
                                        points = 3;
                                    } else if (predictedWinner === actualWinner) {
                                        points = 1;
                                    }

                                }

                                if (match.is_golden == 1) {
                                    points = points * 2;
                                }

                                db.query(
                                    `UPDATE predictions
                                     SET points = ?
                                     WHERE Pid = ?`,
                                    [points, prediction.Pid],
                                    (err) => {

                                        if (err) {
                                            return res.send(err);
                                        }

                                        finished++;

                                        if (finished === predictions.length) {
                                            afterPointsCalculated(match.round_id);
                                        }

                                    }
                                );

                            });

                        }
                    );

                }
            );

        }
    );

    function afterPointsCalculated(roundId) {

        db.query(
            `SELECT COUNT(*) AS unfinishedMatches
             FROM matches
             WHERE round_id = ?
             AND (home_score IS NULL OR away_score IS NULL)`,
            [roundId],
            (err, checkResult) => {

                if (err) {
                    return res.send(err);
                }

                if (checkResult[0].unfinishedMatches === 0) {
                    calculateRoundWinner(roundId);
                }

                updateUsersTotalPoints(res);

            }
        );

    }

});

function calculateMatchPoints(matchId, res) {

    db.query(
        `SELECT *
         FROM matches
         WHERE Mid = ?`,
        [matchId],
        (err, matchResult) => {

            if (err) {
                return res.send(err);
            }

            if (matchResult.length === 0) {
                return res.send('المباراة غير موجودة');
            }

            const match = matchResult[0];

            db.query(
                `SELECT *
                 FROM predictions
                 WHERE match_id = ?`,
                [matchId],
                (err, predictions) => {

                    if (err) {
                        return res.send(err);
                    }

                    predictions.forEach(prediction => {

                        let points = 0;

                        const predictedHome = Number(prediction.predicted_home_score);
                        const predictedAway = Number(prediction.predicted_away_score);

                        const actualHome = Number(match.home_score);
                        const actualAway = Number(match.away_score);

                        const exactScore =
                            predictedHome === actualHome &&
                            predictedAway === actualAway;

                        const predictedWinner =
                            predictedHome > predictedAway ? match.home_team :
                            predictedAway > predictedHome ? match.away_team :
                            'draw';

                        const actualWinner =
                            actualHome > actualAway ? match.home_team :
                            actualAway > actualHome ? match.away_team :
                            'draw';

                        if (exactScore) {
                            points = 3;
                        } else if (predictedWinner === actualWinner) {
                            points = 1;
                        }

                        if (match.is_golden == 1) {
                            points = points * 2;
                        }

                        if (
                            prediction.used_loser_card == 1 &&
                            actualWinner === match.underdog_team &&
                            predictedWinner === actualWinner
                        ) {
                            if (exactScore) {
                                points = 10;
                            } else {
                                points = 3;
                            }
                        }

                        db.query(
                            `UPDATE predictions
                             SET points = ?
                             WHERE Pid = ?`,
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
                SELECT COALESCE(SUM(points), 0)
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
    `SELECT round_id
     FROM matches
     WHERE match_date <= NOW()
     ORDER BY match_date DESC
     LIMIT 1`,
    (err, roundData) => {

        let weeklyRank = 'قريبًا';

        if (!err && roundData.length > 0) {

            const currentRound = roundData[0].round_id;

            db.query(
                `SELECT p.user_id,
                        SUM(IFNULL(p.points,0)) AS round_points
                 FROM predictions p
                 JOIN matches m ON p.match_id = m.Mid
                 WHERE m.round_id = ?
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
        <a href="/profile"><i class="bi bi-person-circle"></i> ملفي</a>
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
    if (i === 0) return { icon: '🥇', cls: 'rank-1' };
    if (i === 1) return { icon: '🥈', cls: 'rank-2' };
    if (i === 2) return { icon: '🥉', cls: 'rank-3' };
    return { icon: null, cls: '' };
}

function buildRows(data, pointsKey) {
    if (!data || data.length === 0) return '<div class="lb-loading">لا توجد بيانات بعد</div>';
    return data.map(function(user, i) {
        var isMe = Number(user.Uid) === Number(currentUserId);
        var m = medalOrNum(i);
        var rank = m.icon ? '<span class="lb-rank">' + m.icon + '</span>' : '<span class="lb-rank-num">' + (i+1) + '</span>';
        var safeName = user.Username.replace(/'/g, "");
        return '<div class="lb-row ' + m.cls + '">' +
            rank +
            '<div class="lb-avatar">👤</div>' +
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
    fetch('/api/leaderboard')
        .then(function(r) { return r.json(); })
        .then(function(d) { document.getElementById('lbList').innerHTML = buildRows(d, 'tota_point'); })
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

var teamFlags = {'السعودية':'sa','قطر':'qa','الإمارات':'ae','المغرب':'ma','تونس':'tn','الجزائر':'dz','مصر':'eg','البرازيل':'br','الأرجنتين':'ar','أوروغواي':'uy','كولومبيا':'co','الاكوادور':'ec','باراغواي':'py','التشيك':'cz','جنوب أفريقيا':'za','البوسنة والهرسك':'ba','هايتي':'ht','اسكتلندا':'gb-sct','كوراساو':'cw','السويد':'se','الرأس الأخضر':'cv','النرويج':'no','النمسا':'at','الكونغو الديمقراطية':'cd','فرنسا':'fr','اسبانيا':'es','البرتغال':'pt','انجلترا':'gb','المانيا':'de','إيطاليا':'it','هولندا':'nl','بلجيكا':'be','سويسرا':'ch','كرواتيا':'hr','الدنمارك':'dk','صربيا':'rs','بولندا':'pl','أوكرانيا':'ua','تركيا':'tr','الولايات المتحدة':'us','المكسيك':'mx','كندا':'ca','كوستاريكا':'cr','بنما':'pa','اليابان':'jp','كوريا الجنوبية':'kr','استراليا':'au','ايران':'ir','العراق':'iq','أوزبكستان':'uz','الأردن':'jo','السنغال':'sn','نيجيريا':'ng','الكاميرون':'cm','غانا':'gh','ساحل العاج':'ci','مالي':'ml','نيوزيلندا':'nz'};

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

app.post('/admin/delete-prediction', isAdmin, (req, res) => {
    const { prediction_id } = req.body;

    db.query(
        'DELETE FROM predictions WHERE Pid = ?',
        [prediction_id],
        (err) => {
            if (err) return res.send(err);
            res.redirect('/admin');
        }
    );
});

app.post('/admin/delete-match', isAdmin, (req, res) => {
    const { match_id } = req.body;

    db.query(
        'DELETE FROM predictions WHERE match_id = ?',
        [match_id],
        (err) => {
            if (err) return res.send(err);

            db.query(
                'DELETE FROM matches WHERE Mid = ?',
                [match_id],
                (err) => {
                    if (err) return res.send(err);
                    res.redirect('/admin');
                }
            );
        }
    );
});

app.post('/admin/delete-tournament', isAdmin, (req, res) => {
    const { tournament_id } = req.body;

    db.query(
        `DELETE predictions
         FROM predictions
         JOIN matches ON predictions.match_id = matches.Mid
         WHERE matches.tournament_id = ?`,
        [tournament_id],
        (err) => {
            if (err) return res.send(err);

            db.query(
                'DELETE FROM matches WHERE tournament_id = ?',
                [tournament_id],
                (err) => {
                    if (err) return res.send(err);

                    db.query(
                        'DELETE FROM rounds WHERE tournament_id = ?',
                        [tournament_id],
                        (err) => {
                            if (err) return res.send(err);

                            db.query(
                                'DELETE FROM tournaments WHERE id = ?',
                                [tournament_id],
                                (err) => {
                                    if (err) return res.send(err);
                                    res.redirect('/admin');
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

app.post('/admin/delete-result', isAdmin, (req, res) => {
    const { match_id } = req.body;

    db.query(
        `UPDATE matches
         SET home_score = NULL,
             away_score = NULL
         WHERE Mid = ?`,
        [match_id],
        (err) => {
            if (err) return res.send(err);

            db.query(
                'UPDATE predictions SET points = 0 WHERE match_id = ?',
                [match_id],
                (err) => {
                    if (err) return res.send(err);

                    updateUsersTotalPoints(res);
                }
            );
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
            /*
            if (new Date() >= firstMatch) {
                return res.status(400).json({
                    error: '🔒 بدأت البطولة، تم إغلاق توقعات البطل والهداف'
                });
            }
            */
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
        `SELECT Uid, Username, email, tota_point, role
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
                        currentTournamentRank: 'قريبًا'
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

app.post('/api/set-tournament-winners', (req, res) => {

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

            res.json({
                message: 'تم حفظ بطل وهداف البطولة'
            });

        }
    );

});

app.post('/admin/finalize-tournament', isAdmin, (req, res) => {

    const {
        tournament_id,
        champion_winner,
        top_scorer_winner
    } = req.body;

    db.query(
        `UPDATE tournaments
         SET champion_winner = ?,
             top_scorer_winner = ?
         WHERE id = ?`,
        [
            champion_winner,
            top_scorer_winner,
            tournament_id
        ],
        (err) => {

            if (err) return res.send(err);

            db.query(
                `SELECT *
                 FROM tournament_predictions
                 WHERE tournament_id = ?`,
                [tournament_id],
                (err, predictions) => {

                    if (err) return res.send(err);

                    if (predictions.length === 0) {
                        return res.send('لا توجد توقعات لهذه البطولة');
                    }

                    let finished = 0;

                    predictions.forEach(prediction => {

                        let points = 0;

                        if (
                            normalizeText(prediction.champion_prediction) ===
                            normalizeText(champion_winner)
                        ) {
                            points += 15;
                        }

                        if (
                            normalizeText(prediction.top_scorer_prediction) ===
                            normalizeText(top_scorer_winner)
                        ) {
                            points += 10;
                        }

                        db.query(
                            `UPDATE tournament_predictions
                             SET points = ?
                             WHERE id = ?`,
                            [points, prediction.id],
                            (err) => {

                                if (err) return res.send(err);

                                finished++;

                                if (finished === predictions.length) {
                                    updateUsersTotalPoints(res);
                                }

                            }
                        );

                    });

                }
            );

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

app.post('/admin/calculate-round-winner', isAdmin, (req, res) => {

    const { round_id } = req.body;

    db.query(
        `SELECT 
            person.Uid,
            person.Username,
            SUM(predictions.points) AS round_points
         FROM predictions
         JOIN person ON predictions.user_id = person.Uid
         JOIN matches ON predictions.match_id = matches.Mid
         WHERE matches.round_id = ?
         GROUP BY person.Uid, person.Username
         ORDER BY round_points DESC
         LIMIT 1`,
        [round_id],
        (err, result) => {

            if (err) return res.send(err);

            if (result.length === 0) {
                return res.send('لا توجد توقعات في هذه الجولة');
            }

            const winner = result[0];

            db.query(
                `DELETE FROM round_winners
                 WHERE round_id = ?`,
                [round_id],
                (err) => {

                    if (err) return res.send(err);

                    db.query(
                        `INSERT INTO round_winners
                         (round_id, user_id, points)
                         VALUES (?, ?, ?)`,
                        [
                            round_id,
                            winner.Uid,
                            winner.round_points
                        ],
                        (err) => {

                            if (err) return res.send(err);

                            res.redirect('/admin');

                        }
                    );

                }
            );

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

app.get('/api/leaderboard', (req, res) => {
    db.query(
        `SELECT Uid, Username, tota_point
         FROM person
         ORDER BY tota_point DESC
         LIMIT 30`,
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        }
    );
});

app.get('/api/round-leaderboard/:roundId', (req, res) => {

    const roundId = req.params.roundId;

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

app.get('/api/current-round', (req, res) => {
    db.query(
        `SELECT *
         FROM rounds
         WHERE CURDATE() BETWEEN start_date AND end_date
         ORDER BY Rid DESC
         LIMIT 1`,
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.length === 0) return res.json(null);
            res.json(result[0]);
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

app.listen(3000, () => {
    console.log('Server Running');
})


