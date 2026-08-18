// ============================================================
//  SMART MUTHALA'AH ID — MAIN.JS
//  Versi: 4.0 | Material 3 Design + Statistics + i18n
// ============================================================

const app = {
    currentUser: null,
    currentMateri: null,
    currentLang: 'ar',
    stats: {},            // { materKey: { score, mcqRight, essayScore, mufRight, date } }
    mufradatAll: [],      // cache untuk filter

    // ──────────────────────────────────────────
    //  INISIALISASI
    // ──────────────────────────────────────────
    init() {
        this.mufradatAll = window.appData.mufradat || [];
        this.renderMufradat('all');
        this.applyLang('ar');
        // Tampilkan peringatan kuis jika belum pilih materi
        this._refreshQuizState();
        console.log("Smart Muthala'ah ID v4.0 siap.");
    },

    // ──────────────────────────────────────────
    //  INTERNASIONALISASI (i18n)
    // ──────────────────────────────────────────
    setLang(lang) {
        this.currentLang = lang;
        this.applyLang(lang);
    },

    applyLang(lang) {
        const dict = window.appData.i18n[lang];
        if (!dict) return;

        const root = document.getElementById('html-root');
        root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        root.setAttribute('lang', lang);

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) el.innerText = dict[key];
        });

        // Active state on lang buttons
        document.querySelectorAll('.btn-lang').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        const targetBtn = document.getElementById(`btn-lang-${lang}`);
        if (targetBtn) { targetBtn.classList.add('active'); targetBtn.setAttribute('aria-pressed', 'true'); }

        // Update header status if logged in
        if (this.currentUser) {
            document.getElementById('header-status').innerHTML =
                `<i class="fa-solid fa-user-check"></i> ${dict.statusLoggedIn || 'Masuk:'} ${this.currentUser.name}`;
        }
    },

    t(key) {
        const dict = window.appData.i18n[this.currentLang];
        return dict && dict[key] !== undefined ? dict[key] : key;
    },

    // ──────────────────────────────────────────
    //  AUTENTIKASI
    // ──────────────────────────────────────────
    switchAuthTab(tab) {
        document.querySelectorAll('.auth-toggle .btn-toggle').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById('form-login-card').style.display    = tab === 'login'    ? 'block' : 'none';
        document.getElementById('form-register-card').style.display = tab === 'register' ? 'block' : 'none';
    },

    doRegister() {
        const nim  = document.getElementById('reg-nim').value.trim();
        const name = document.getElementById('reg-name').value.trim();
        const pass = document.getElementById('reg-pass').value;
        const role = document.getElementById('reg-role').value;

        if (!nim || !name || !pass) {
            alert(this.t('alertFillAll') || 'Harap lengkapi semua data.');
            return;
        }
        if (pass.length < 6) {
            alert('Kata sandi minimal 6 karakter.');
            return;
        }

        let users = JSON.parse(localStorage.getItem('muthalaah_users') || '[]');
        if (users.find(u => u.nim === nim)) {
            alert(this.t('alertNimExists') || 'NIM/NIS sudah terdaftar!');
            return;
        }

        users.push({ nim, name, pass, role, stats: {} });
        localStorage.setItem('muthalaah_users', JSON.stringify(users));
        alert(this.t('alertRegSuccess') || 'Pendaftaran berhasil! Silakan login.');
        this.switchAuthTab('login');
        document.getElementById('login-nim').value  = nim;
        document.getElementById('login-pass').value = pass;
    },

    doLogin() {
        const nim  = document.getElementById('login-nim').value.trim();
        const pass = document.getElementById('login-pass').value;
        if (!nim || !pass) { alert(this.t('alertFillAll') || 'Isi NIM dan Password.'); return; }

        let users = JSON.parse(localStorage.getItem('muthalaah_users') || '[]');
        const user = users.find(u => u.nim === nim && u.pass === pass);
        if (!user) {
            alert(this.t('alertLoginFail') || 'NIM atau Password salah. Belum punya akun? Daftar dulu.');
            return;
        }

        this.currentUser = user;
        this.stats = user.stats || {};

        // Update UI
        document.getElementById('header-status').innerHTML =
            `<i class="fa-solid fa-user-check"></i> ${this.t('statusLoggedIn') || 'Masuk:'} ${user.name}`;
        document.getElementById('btn-header-login').style.display = 'none';
        document.getElementById('sidebar-name').innerText  = user.name.split(' ')[0];
        document.getElementById('sidebar-role').innerText  = user.role;
        document.getElementById('btn-logout').style.display = 'block';
        document.getElementById('sidebar-progress').style.display = 'block';
        document.getElementById('dash-name').innerText = user.name.split(' ')[0];

        // Enable nav
        ['dashboard','materi','mufradat','quiz','statistik'].forEach(id => {
            const el = document.getElementById(`nav-${id}`);
            if (el) el.classList.remove('disabled');
        });

        this._refreshSidebarProgress();
        this._resetQuiz();
        this.showPage('dashboard');
        this._refreshDashboardStats();
    },

    logout() {
        this.currentUser = null;
        this.currentMateri = null;
        this.stats = {};

        document.getElementById('header-status').innerHTML =
            `<i class="fa-solid fa-user-xmark"></i> <span data-i18n="statusLoggedOut">${this.t('statusLoggedOut') || 'Belum Login'}</span>`;
        document.getElementById('btn-header-login').style.display = 'block';
        document.getElementById('sidebar-name').innerText  = this.t('guestUser') || 'Tamu';
        document.getElementById('sidebar-role').innerText  = this.t('guestRole') || 'Silakan login';
        document.getElementById('btn-logout').style.display = 'none';
        document.getElementById('sidebar-progress').style.display = 'none';

        document.querySelectorAll('.nav-item').forEach(el => {
            if (el.id !== 'nav-login') el.classList.add('disabled');
        });

        this.showPage('login');
    },

    // ──────────────────────────────────────────
    //  NAVIGASI
    // ──────────────────────────────────────────
    showPage(pageId) {
        if (!this.currentUser && pageId !== 'login') {
            alert(this.currentLang === 'ar' ? 'الرَّجَاءُ تَسْجِيلُ الدُّخُولِ أَوَّلًا.' : 'Silakan login terlebih dahulu.');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
        const pg = document.getElementById(`page-${pageId}`);
        if (pg) pg.classList.add('active');

        // Update nav active
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navEl = document.getElementById(`nav-${pageId}`);
        if (navEl) navEl.classList.add('active');

        // Breadcrumb
        document.querySelectorAll('.bc-item').forEach(el => el.classList.remove('active'));
        const bcEl = document.getElementById(`bc-${pageId}`);
        if (bcEl) bcEl.classList.add('active');

        // Scroll to top
        const mc = document.getElementById('main-content');
        if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });

        // Page-specific init
        if (pageId === 'materi' && !document.getElementById('materi-list').hasChildNodes()) {
            this.renderMateriList('kelas2');
        }
        if (pageId === 'quiz') {
            this._refreshQuizState();
        }
        if (pageId === 'statistik') {
            this.renderStatistik();
        }
        if (pageId === 'dashboard') {
            this._refreshDashboardStats();
        }
    },

    // ──────────────────────────────────────────
    //  DAFTAR MATERI
    // ──────────────────────────────────────────
    renderMateriList(level) {
        document.querySelectorAll('.materi-tabs .btn-tab').forEach(btn => btn.classList.remove('active'));
        const tabEl = document.getElementById(level === 'kelas2' ? 'tab-k2' : 'tab-k3');
        if (tabEl) tabEl.classList.add('active');

        const listContainer = document.getElementById('materi-list');
        listContainer.innerHTML = '';

        const data = window.appData.materi[level] || [];
        const levelLabel = this.t(level === 'kelas2' ? 'btnKelas2' : 'btnKelas3');

        data.forEach((item, index) => {
            const userScore = this.stats[item.id] ? this.stats[item.id].score : null;
            const scoreHtml = userScore !== null
                ? `<span class="prog-score" style="font-size:0.76rem; padding:2px 8px;">${userScore}</span>`
                : '';
            const div = document.createElement('div');
            div.className = 'materi-item';
            div.innerHTML = `
                <div class="materi-num">${index + 1}</div>
                <div class="materi-info">
                    <span class="materi-class-badge">${levelLabel}</span>
                    <h4 dir="rtl">${item.title}</h4>
                    <span class="materi-sub" dir="ltr">${item.titleTrans.id} / ${item.titleTrans.en}</span>
                </div>
                ${scoreHtml}
                <i class="fa-solid fa-chevron-${this.currentLang === 'ar' ? 'left' : 'right'} materi-arrow"></i>
            `;
            div.onclick = () => this.openBelajar(item);
            listContainer.appendChild(div);
        });
    },

    // ──────────────────────────────────────────
    //  RUANG BELAJAR
    // ──────────────────────────────────────────
    openBelajar(item) {
        this.currentMateri = item;
        document.getElementById('read-title').innerText = item.title;
        document.getElementById('read-translation').innerText = item.translation || '';

        this._renderInteractiveText(item.text, item.kosakataPenting || []);
        this._renderKosakataPanel(item.kosakataPenting || []);

        // Set quiz for this materi
        document.getElementById('quiz-materi-title').innerText = item.title;
        document.getElementById('quiz-materi-title').setAttribute('dir', 'rtl');
        this.renderQuiz(item);

        // Enable nav
        ['belajar', 'quiz'].forEach(id => {
            const el = document.getElementById(`nav-${id}`);
            if (el) el.classList.remove('disabled');
        });

        this.showPage('belajar');
    },

    _renderInteractiveText(text, kosakataPenting) {
        const container = document.getElementById('read-text');
        container.innerHTML = '';

        // Build lookup dict (with/without diacritics)
        const dictLookup = {};
        kosakataPenting.forEach(k => {
            const stripped = k.kata.replace(/[\u0610-\u061A\u064B-\u065F]/g, '');
            dictLookup[k.kata]    = k;
            dictLookup[stripped]  = k;
        });

        const tokens = text.split(/(\s+)/);
        tokens.forEach(token => {
            if (!token.trim()) {
                container.appendChild(document.createTextNode(token));
                return;
            }
            const span = document.createElement('span');
            span.className = 'word-span';
            span.innerText = token;

            const stripped = token.replace(/[\u0610-\u061A\u064B-\u065F\u060C\u061B\u061F!.،؟]/g, '');
            const entry = dictLookup[token] || dictLookup[stripped];
            if (entry) {
                span.classList.add('has-dict');
                span.title = entry.id;
                span.onclick = () => this.openWordModal(entry);
            } else {
                span.onclick = () => this.speakWord(token);
            }
            container.appendChild(span);
        });
    },

    _renderKosakataPanel(kosakata) {
        const panel = document.getElementById('kosakata-panel');
        const grid  = document.getElementById('kosakata-grid');
        grid.innerHTML = '';
        if (!kosakata.length) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        kosakata.forEach(k => {
            const card = document.createElement('div');
            card.className = 'kosakata-card';
            card.innerHTML = `
                <div class="kosakata-arab" dir="rtl">${k.kata}</div>
                <div class="kosakata-trans">${k.id}</div>
                <div class="kosakata-trans" style="color:var(--outline); font-size:0.74rem;">${k.en}</div>
            `;
            card.onclick = () => this.openWordModal(k);
            grid.appendChild(card);
        });
    },

    // ──────────────────────────────────────────
    //  MODAL KAMUS
    // ──────────────────────────────────────────
    openWordModal(entry) {
        document.getElementById('modal-word-title').innerText = entry.kata || entry.arab || '';
        document.getElementById('modal-def-ar').innerText = entry.ar  || '—';
        document.getElementById('modal-def-id').innerText = entry.id  || entry.indo || '—';
        document.getElementById('modal-def-en').innerText = entry.en  || '—';
        document.getElementById('word-modal').classList.add('active');
        this.speakWord(entry.kata || entry.arab || '');
    },

    closeWordModal(event, force = false) {
        if (force || (event && event.target === document.getElementById('word-modal'))) {
            document.getElementById('word-modal').classList.remove('active');
        }
    },

    speakWord(word) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(word);
        utt.lang = 'ar-SA';
        utt.rate = 0.75;
        window.speechSynthesis.speak(utt);
    },

    // ──────────────────────────────────────────
    //  AUDIO READ-ALONG
    // ──────────────────────────────────────────
    playAudio() {
        if (!this.currentMateri) return;
        if (!('speechSynthesis' in window)) { alert('Browser tidak mendukung Web Speech API.'); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(this.currentMateri.text);
        utt.lang = 'ar-SA';
        utt.rate = 0.72;
        const btn = document.getElementById('btn-play-audio');
        btn.innerHTML = `<i class="fa-solid fa-circle-stop fa-beat"></i> <span data-i18n="btnPlaying">${this.t('btnPlaying') || 'Memutar...'}</span>`;
        btn.style.opacity = '0.75';
        utt.onend = () => {
            btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> <span>${this.t('btnPlayAudio') || 'Dengar Bacaan'}</span>`;
            btn.style.opacity = '1';
        };
        window.speechSynthesis.speak(utt);
    },

    // ──────────────────────────────────────────
    //  MUFRADAT FLASHCARDS
    // ──────────────────────────────────────────
    filterMufradat(level) {
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        const filterBtn = document.getElementById(`filter-${level}`);
        if (filterBtn) filterBtn.classList.add('active');
        this.renderMufradat(level);
    },

    renderMufradat(level) {
        const container = document.getElementById('flashcards-container');
        if (!container) return;
        container.innerHTML = '';

        let items = this.mufradatAll;
        if (level && level !== 'all') {
            items = items.filter(m => m.level === level || m.kelas === level);
        }
        if (!items.length) items = this.mufradatAll; // fallback

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'flashcard';
            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <span class="fc-arab">${item.arab || item.kata || ''}</span>
                        <span class="fc-sub">${this.t('fcFlipHint') || 'Ketuk untuk arti'}</span>
                    </div>
                    <div class="flashcard-back">
                        <span class="fc-trans">${item.indo || item.id || ''}</span>
                        <span class="fc-trans-en">${item.en || ''}</span>
                        <span class="fc-arab-back">${item.arab || item.kata || ''}</span>
                    </div>
                </div>
            `;
            card.onclick = () => card.classList.toggle('is-flipped');
            container.appendChild(card);
        });
    },

    // ──────────────────────────────────────────
    //  QUIZ
    // ──────────────────────────────────────────
    _refreshQuizState() {
        const noMateri  = document.getElementById('quiz-no-materi');
        const form      = document.getElementById('quiz-form');
        const submitArea = document.getElementById('quiz-submit-area');
        if (!this.currentMateri) {
            if (noMateri)   noMateri.style.display   = 'block';
            if (submitArea) submitArea.style.display = 'none';
            if (form) {
                const qContainer = document.getElementById('quiz-questions');
                if (qContainer) qContainer.innerHTML = '';
            }
        } else {
            if (noMateri) noMateri.style.display = 'none';
            if (submitArea) submitArea.style.display = 'block';
        }
    },

    _resetQuiz() {
        const form = document.getElementById('quiz-form');
        if (form) form.reset();
        const q = document.getElementById('quiz-questions');
        if (q) q.innerHTML = '';
        const pfill = document.getElementById('quiz-progress-fill');
        if (pfill) pfill.style.width = '0%';
        document.getElementById('quiz-materi-title').innerText = '—';
    },

    renderQuiz(item) {
        const container  = document.getElementById('quiz-questions');
        const submitArea = document.getElementById('quiz-submit-area');
        const noMateri   = document.getElementById('quiz-no-materi');
        if (!container) return;
        container.innerHTML = '';
        document.getElementById('quiz-form').reset();

        if (!item || !item.kuis || !item.kuis.length) {
            container.innerHTML = `<p style="text-align:center; color:var(--on-surface-variant); padding:30px 0;" data-i18n="quizNoQuestion">${this.t('quizNoQuestion') || 'Belum ada soal untuk materi ini.'}</p>`;
            if (submitArea) submitArea.style.display = 'none';
            return;
        }
        if (noMateri)   noMateri.style.display   = 'none';
        if (submitArea) submitArea.style.display = 'block';

        const total = item.kuis.length;
        let qIndex = 1;
        item.kuis.forEach(q => {
            const div = document.createElement('div');
            div.className = 'quiz-item';

            // Update progress bar as user scrolls through items
            const pct = Math.round(((qIndex - 1) / total) * 100);

            if (q.type === 'mcq') {
                div.innerHTML = `
                    <div class="quiz-question" dir="rtl">
                        <span class="q-num">${qIndex}</span>
                        <span class="q-type-badge">MCQ</span>
                        ${q.question}
                    </div>
                    <div class="quiz-options" dir="rtl">
                        ${q.options.map((opt, i) => `
                            <label>
                                <input type="radio" name="${q.id}" value="${i}" required>
                                ${opt}
                            </label>
                        `).join('')}
                    </div>
                `;
            } else if (q.type === 'essay') {
                div.innerHTML = `
                    <div class="quiz-question" dir="rtl">
                        <span class="q-num">${qIndex}</span>
                        <span class="q-type-badge">Uraian</span>
                        ✍ ${q.question}
                    </div>
                    <div class="form-group">
                        <textarea class="quiz-textarea" name="${q.id}" rows="3" dir="auto" placeholder="${this.t('essayPlaceholder') || 'Tuliskan jawabanmu di sini...'}"></textarea>
                    </div>
                `;
            } else if (q.type === 'mufradat') {
                div.innerHTML = `
                    <div class="quiz-question" dir="rtl">
                        <span class="q-num">${qIndex}</span>
                        <span class="q-type-badge">Mufradat</span>
                        ${q.question}
                    </div>
                    <div class="quiz-options mufradat-quiz-options" dir="rtl">
                        ${q.options.map((opt, i) => `
                            <label>
                                <input type="radio" name="${q.id}" value="${i}" required>
                                ${opt}
                            </label>
                        `).join('')}
                    </div>
                `;
            }

            // Update progress bar when any input in this question changes
            const progressFill = document.getElementById('quiz-progress-fill');
            container.appendChild(div);
            qIndex++;
        });

        // Live progress bar update
        document.getElementById('quiz-form').addEventListener('change', () => {
            const answered = item.kuis.filter(q =>
                q.type === 'essay'
                    ? (document.querySelector(`textarea[name="${q.id}"]`) || {value:''}).value.trim()
                    : document.querySelector(`input[name="${q.id}"]:checked`)
            ).length;
            const pct = Math.round((answered / total) * 100);
            const pfill = document.getElementById('quiz-progress-fill');
            if (pfill) pfill.style.width = pct + '%';
        }, { once: false });
    },

    submitQuiz() {
        if (!this.currentMateri) {
            alert(this.t('alertChooseMateri') || 'Pilih materi terlebih dahulu sebelum submit kuis.');
            return;
        }

        const formData = new FormData(document.getElementById('quiz-form'));
        const kuis     = this.currentMateri.kuis;

        const mcqs      = kuis.filter(q => q.type === 'mcq');
        const essays    = kuis.filter(q => q.type === 'essay');
        const mufradats = kuis.filter(q => q.type === 'mufradat');

        const totalParts = (mcqs.length ? 1 : 0) + (essays.length ? 1 : 0) + (mufradats.length ? 1 : 0) || 1;
        const ptMcq  = mcqs.length      ? Math.floor(60 / totalParts * (mcqs.length > 0 ? 1 : 0)) / mcqs.length * mcqs.length : 0;
        const ptEss  = essays.length    ? Math.floor(20 / totalParts * (essays.length > 0 ? 1 : 0)) : 0;
        const ptMuf  = mufradats.length ? Math.floor(20 / totalParts * (mufradats.length > 0 ? 1 : 0)) : 0;

        // Recalculate with simple split
        const pointPerMcq  = mcqs.length      ? Math.round(70 / mcqs.length) : 0;
        const pointPerEss  = essays.length     ? Math.round(15 / essays.length) : 0;
        const pointPerMuf  = mufradats.length  ? Math.round(15 / mufradats.length) : 0;

        let score = 0;
        let mcqRight = 0, essayScore = 0, mufRight = 0;

        mcqs.forEach(q => {
            const ans = formData.get(q.id);
            if (parseInt(ans) === q.answer) { score += pointPerMcq; mcqRight++; }
        });

        essays.forEach(q => {
            const ans = (formData.get(q.id) || '').toLowerCase();
            const matched = q.keywords.filter(kw => ans.includes(kw.toLowerCase())).length;
            const pts = matched >= 2 ? pointPerEss : matched === 1 ? Math.round(pointPerEss / 2) : 0;
            score += pts;
            essayScore += pts;
        });

        mufradats.forEach(q => {
            const ans = formData.get(q.id);
            if (parseInt(ans) === q.answer) { score += pointPerMuf; mufRight++; }
        });

        score = Math.min(Math.round(score), 100);

        // Save stats
        this._saveStats({
            score,
            mcqRight, mcqTotal: mcqs.length,
            essayScore, essayTotal: essays.length,
            mufRight, mufTotal: mufradats.length
        });

        this._generateCertificate(score, mcqRight, mcqs.length, essayScore, essays.length, mufRight, mufradats.length);
        const navSkor = document.getElementById('nav-skor');
        if (navSkor) navSkor.classList.remove('disabled');
        this._refreshSidebarProgress();
        this._refreshDashboardStats();
        this.showPage('skor');
    },

    _saveStats({ score, mcqRight, mcqTotal, essayScore, essayTotal, mufRight, mufTotal }) {
        if (!this.currentUser || !this.currentMateri) return;
        const key = this.currentMateri.id;
        this.stats[key] = { score, mcqRight, mcqTotal, essayScore, essayTotal, mufRight, mufTotal, date: new Date().toLocaleDateString('id-ID') };

        // Persist to localStorage
        let users = JSON.parse(localStorage.getItem('muthalaah_users') || '[]');
        const idx = users.findIndex(u => u.nim === this.currentUser.nim);
        if (idx >= 0) {
            users[idx].stats = this.stats;
            localStorage.setItem('muthalaah_users', JSON.stringify(users));
        }
        this.currentUser.stats = this.stats;
    },

    // ──────────────────────────────────────────
    //  SERTIFIKAT & EVALUASI
    // ──────────────────────────────────────────
    _generateCertificate(score, mcqRight, mcqTotal, essayScore, essayTotal, mufRight, mufTotal) {
        // Score ring animation
        const circumference = 2 * Math.PI * 60; // ≈ 377
        const offset = circumference - (score / 100) * circumference;
        const ring = document.getElementById('score-ring-fill');
        if (ring) {
            ring.style.strokeDasharray  = circumference;
            ring.style.strokeDashoffset = circumference;
            setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
        }

        document.getElementById('cert-score').innerText    = score;
        document.getElementById('cert-name').innerText     = this.currentUser.name;
        document.getElementById('cert-nim').innerText      = this.currentUser.nim;
        document.getElementById('cert-role').innerText     = this.currentUser.role;
        const matTag = document.getElementById('cert-materi-name');
        if (matTag) matTag.innerText = this.currentMateri ? this.currentMateri.title : '—';

        // Breakdown numbers
        document.getElementById('bd-mcq').innerText      = `${mcqRight}/${mcqTotal}`;
        document.getElementById('bd-essay').innerText    = `${essayScore}`;
        document.getElementById('bd-mufradat').innerText = `${mufRight}/${mufTotal}`;

        // Change ring color based on score
        if (ring) {
            ring.style.stroke = score >= 75 ? 'var(--gold)' : score >= 50 ? '#FFB300' : '#FF7043';
        }

        // Evaluation HTML
        const title = this.currentMateri ? this.currentMateri.title : '';
        let html = '';

        if (score >= 80) {
            html += `<li>🌟 <strong>Luar Biasa! (مُتَمَيِّز)</strong> Pemahaman qira'ah Anda sangat baik.</li>`;
            html += `<li>✅ Anda siap melanjutkan ke materi berikutnya.</li>`;
            if (mcqTotal > 0 && mcqRight < mcqTotal) html += `<li>📖 Coba cermati kembali <strong>${mcqTotal - mcqRight} soal</strong> MCQ yang salah agar pemahaman semakin sempurna.</li>`;
        } else if (score >= 60) {
            html += `<li>✅ <strong>Cukup Baik (مَقْبُول)</strong> Anda sudah memahami alur cerita, namun perlu latihan lebih.</li>`;
            if (mcqTotal > 0 && mcqRight < mcqTotal) html += `<li>📖 Ada <strong>${mcqTotal - mcqRight} soal pilihan ganda</strong> yang perlu diperbaiki. Saran: putar audio read-along sambil mengikuti teks.</li>`;
            if (essayTotal > 0) html += `<li>✍ Jawaban uraian masih bisa ditingkatkan. Gunakan kosakata Arab dari materi saat menjawab.</li>`;
            if (mufTotal > 0 && mufRight < mufTotal) html += `<li>🃏 Latih kosakata mufradat dengan flashcard hingga hafal.</li>`;
        } else {
            html += `<li>❗ <strong>Perlu Peningkatan (ضَعِيف)</strong> Hasil kuis menunjukkan perlu pengulangan materi secara intensif.</li>`;
            html += `<li>📚 <strong>Langkah 1:</strong> Buka materi "<span dir="rtl">${title}</span>" dan baca teks perlahan, kata per kata.</li>`;
            html += `<li>🔊 <strong>Langkah 2:</strong> Gunakan tombol "Dengar Bacaan" dan ikuti pengucapannya.</li>`;
            html += `<li>🃏 <strong>Langkah 3:</strong> Latih semua kosakata di halaman Latihan Mufradat.</li>`;
            html += `<li>🖊 <strong>Langkah 4:</strong> Kerjakan kuis kembali setelah menyelesaikan langkah di atas.</li>`;
        }

        const evalEl = document.getElementById('eval-recommendation');
        if (evalEl) evalEl.innerHTML = `<ul>${html}</ul>`;
    },

    // ──────────────────────────────────────────
    //  STATISTIK KEMAJUAN
    // ──────────────────────────────────────────
    switchStatTab(tab) {
        document.querySelectorAll('.stat-tab').forEach(t => t.classList.remove('active'));
        const tabEl = document.getElementById(`stab-${tab}`);
        if (tabEl) tabEl.classList.add('active');

        document.querySelectorAll('.stat-panel').forEach(p => p.classList.remove('active'));
        const panelEl = document.getElementById(`stat-${tab}`);
        if (panelEl) panelEl.classList.add('active');

        if (tab === 'grafik') this._renderBarChart();
    },

    renderStatistik() {
        const statKeys  = Object.keys(this.stats);
        const totalDone = statKeys.length;
        const scores    = statKeys.map(k => this.stats[k].score);
        const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        // Overview numbers
        document.getElementById('stat-total-materi').innerText = totalDone;
        document.getElementById('stat-total-quiz').innerText   = totalDone;
        document.getElementById('stat-avg-score').innerText    = avgScore !== null ? avgScore : '—';
        document.getElementById('stat-total-mufradat').innerText = this.mufradatAll.length;

        // Progress list
        const progressList = document.getElementById('progress-list');
        progressList.innerHTML = '';
        if (!totalDone) {
            progressList.innerHTML = `
                <div class="stat-empty">
                    <i class="fa-solid fa-inbox"></i>
                    <p>${this.t('statEmpty') || 'Belum ada data. Selesaikan kuis untuk melihat progres.'}</p>
                </div>`;
        } else {
            // Combine all materi from both kelas
            const allMateri = [
                ...(window.appData.materi.kelas2 || []),
                ...(window.appData.materi.kelas3 || [])
            ];
            statKeys.forEach(key => {
                const entry   = this.stats[key];
                const matInfo = allMateri.find(m => m.id === key);
                const title   = matInfo ? matInfo.title : key;
                const s       = entry.score;
                const cls     = s >= 75 ? 'high' : s >= 50 ? 'medium' : 'low';
                const item = document.createElement('div');
                item.className = 'progress-list-item';
                item.innerHTML = `
                    <div class="prog-header">
                        <span class="prog-title" dir="rtl">${title}</span>
                        <span class="prog-score">${s}</span>
                    </div>
                    <div class="prog-bar-track">
                        <div class="prog-bar-fill ${cls}" style="width:0%;" data-target="${s}%"></div>
                    </div>
                    <div style="font-size:0.72rem; color:var(--outline); margin-top:5px;">${entry.date || ''}</div>
                `;
                progressList.appendChild(item);
            });
            // Animate bars
            setTimeout(() => {
                progressList.querySelectorAll('.prog-bar-fill[data-target]').forEach(el => {
                    el.style.width = el.getAttribute('data-target');
                });
            }, 80);
        }

        // Category tab data
        this._renderKategori();

        // Bar chart if on that tab
        const grafikPanel = document.getElementById('stat-grafik');
        if (grafikPanel && grafikPanel.classList.contains('active')) this._renderBarChart();
    },

    _renderKategori() {
        const statKeys = Object.keys(this.stats);
        if (!statKeys.length) {
            document.getElementById('cat-eval-content').innerText = this.t('statEmpty') || 'Selesaikan kuis terlebih dahulu.';
            ['mcq','essay','muf','total'].forEach(k => {
                const sc = document.getElementById(`cat-score-${k}`);
                const br = document.getElementById(`cat-bar-${k}`);
                if (sc) sc.innerText = '—';
                if (br) br.style.width = '0%';
            });
            return;
        }

        // Averages
        const avg = arr => arr.length ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length) : null;

        const mcqAvgArr = statKeys.map(k => {
            const s = this.stats[k];
            return s.mcqTotal > 0 ? Math.round((s.mcqRight / s.mcqTotal) * 100) : null;
        }).filter(v => v !== null);

        const essayAvgArr = statKeys.map(k => {
            const s = this.stats[k];
            return s.essayTotal > 0 ? Math.round((s.essayScore / (s.essayTotal * 10)) * 100) : null;
        }).filter(v => v !== null);

        const mufAvgArr = statKeys.map(k => {
            const s = this.stats[k];
            return s.mufTotal > 0 ? Math.round((s.mufRight / s.mufTotal) * 100) : null;
        }).filter(v => v !== null);

        const totalAvg = avg(statKeys.map(k => this.stats[k].score));

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val !== null ? val : '—';
        };
        const bar = (id, val) => {
            const el = document.getElementById(id);
            if (el) setTimeout(() => { el.style.width = (val !== null ? val : 0) + '%'; }, 80);
        };

        const mcqAvg   = avg(mcqAvgArr);
        const essayAvg = avg(essayAvgArr);
        const mufAvg   = avg(mufAvgArr);

        set('cat-score-mcq',   mcqAvg   !== null ? mcqAvg   + '%' : '—');
        set('cat-score-essay', essayAvg !== null ? essayAvg + '%' : '—');
        set('cat-score-muf',   mufAvg   !== null ? mufAvg   + '%' : '—');
        set('cat-score-total', totalAvg !== null ? totalAvg : '—');
        bar('cat-bar-mcq',   mcqAvg);
        bar('cat-bar-essay', essayAvg);
        bar('cat-bar-muf',   mufAvg);
        bar('cat-bar-total', totalAvg);

        // Rekomendasi kategori
        let recHtml = '<ul>';
        const weakest = [
            { label: 'Pemahaman Teks (MCQ)', val: mcqAvg },
            { label: 'Kemampuan Uraian', val: essayAvg },
            { label: 'Kosakata Mufradat', val: mufAvg }
        ].filter(x => x.val !== null).sort((a,b) => (a.val ?? 100) - (b.val ?? 100));

        if (weakest.length) {
            const w = weakest[0];
            if (w.val < 60) {
                recHtml += `<li>⚠️ <strong>${w.label}</strong> adalah aspek yang paling perlu ditingkatkan (${w.val}%). Fokuslah pada latihan di bagian ini.</li>`;
            } else {
                recHtml += `<li>✅ Semua aspek sudah cukup baik! Pertahankan dan terus tingkatkan.</li>`;
            }
        }
        if (mcqAvg !== null && mcqAvg < 70) recHtml += `<li>📖 Baca ulang teks bacaan secara perlahan dan gunakan fitur audio read-along untuk meningkatkan pemahaman teks.</li>`;
        if (essayAvg !== null && essayAvg < 70) recHtml += `<li>✍ Latih menulis kalimat dalam bahasa Arab menggunakan kosakata dari materi yang dipelajari.</li>`;
        if (mufAvg !== null && mufAvg < 70) recHtml += `<li>🃏 Luangkan waktu 10 menit per hari untuk berlatih flashcard Mufradat hingga semua kosakata dikuasai.</li>`;
        recHtml += '</ul>';

        const catEval = document.getElementById('cat-eval-content');
        if (catEval) catEval.innerHTML = recHtml;
    },

    _renderBarChart() {
        const chart = document.getElementById('bar-chart');
        if (!chart) return;
        chart.innerHTML = '';

        const statKeys = Object.keys(this.stats);
        if (!statKeys.length) {
            chart.innerHTML = `<div class="stat-empty" style="width:100%;">
                <i class="fa-solid fa-chart-bar"></i>
                <p>${this.t('grafikEmpty') || 'Belum ada data kuis untuk ditampilkan.'}</p>
            </div>`;
            const trend = document.getElementById('trend-panel');
            if (trend) trend.style.display = 'none';
            return;
        }

        const allMateri = [
            ...(window.appData.materi.kelas2 || []),
            ...(window.appData.materi.kelas3 || [])
        ];

        const maxScore = Math.max(...statKeys.map(k => this.stats[k].score), 1);

        statKeys.forEach((key, i) => {
            const entry   = this.stats[key];
            const matInfo = allMateri.find(m => m.id === key);
            const label   = matInfo ? (matInfo.titleTrans?.id?.split(' ')[0] || `M${i+1}`) : `M${i+1}`;
            const heightPct = Math.round((entry.score / 100) * 130);
            const cls = entry.score >= 75 ? '' : 'gold-bar';

            const item = document.createElement('div');
            item.className = 'bar-item';
            item.innerHTML = `
                <div class="bar-fill ${cls}" style="height:0px;" data-target="${heightPct}">
                    <span class="bar-val">${entry.score}</span>
                </div>
                <span class="bar-label">${label}</span>
            `;
            chart.appendChild(item);
        });

        // Animate bars after DOM
        setTimeout(() => {
            chart.querySelectorAll('.bar-fill[data-target]').forEach(el => {
                el.style.height = el.getAttribute('data-target') + 'px';
            });
        }, 80);

        // Trend analysis
        const scores = statKeys.map(k => this.stats[k].score);
        const trendPanel   = document.getElementById('trend-panel');
        const trendContent = document.getElementById('trend-content');
        if (trendPanel && trendContent && scores.length > 1) {
            trendPanel.style.display = 'block';
            const first = scores[0], last = scores[scores.length - 1];
            const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
            const trend = last > first ? '📈 Meningkat' : last < first ? '📉 Menurun' : '➡ Stabil';
            trendContent.innerHTML = `
                <ul>
                    <li><strong>Tren:</strong> ${trend} (${first} → ${last})</li>
                    <li><strong>Nilai Tertinggi:</strong> ${Math.max(...scores)}</li>
                    <li><strong>Nilai Terendah:</strong> ${Math.min(...scores)}</li>
                    <li><strong>Rata-rata:</strong> ${avg}</li>
                </ul>
            `;
        } else if (trendPanel) {
            trendPanel.style.display = 'none';
        }
    },

    // ──────────────────────────────────────────
    //  SIDEBAR PROGRESS
    // ──────────────────────────────────────────
    _refreshSidebarProgress() {
        const allMateri = [
            ...(window.appData.materi.kelas2 || []),
            ...(window.appData.materi.kelas3 || [])
        ];
        const totalAvail = allMateri.length;
        const done  = Object.keys(this.stats).length;
        const pct   = totalAvail > 0 ? Math.round((done / totalAvail) * 100) : 0;
        const fill  = document.getElementById('sidebar-progress-fill');
        const label = document.getElementById('sidebar-progress-pct');
        if (fill)  fill.style.width = pct + '%';
        if (label) label.innerText  = pct + '%';
    },

    _refreshDashboardStats() {
        if (!this.currentUser) return;
        const done  = Object.keys(this.stats).length;
        const scores = Object.values(this.stats).map(s => s.score);
        const avg   = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : null;

        const matEl  = document.getElementById('chip-materi-num');
        const quizEl = document.getElementById('chip-quiz-num');
        const avgEl  = document.getElementById('chip-avg-num');
        if (matEl)  matEl.innerText  = done;
        if (quizEl) quizEl.innerText = done;
        if (avgEl)  avgEl.innerText  = avg !== null ? avg : '—';
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
