document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ЛОКАЛИЗАЦИЯ (i18n) ---
    window.currentLang = localStorage.getItem('tmr_lang') || 'en';
    window.translations = {};

    async function loadLanguage(lang) {
        try {
            const response = await fetch(`js/lang/${lang}.json`);
            if (!response.ok) throw new Error('Network response was not ok');
            window.translations = await response.json();

            // Обычный текст
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (window.translations[key]) el.textContent = window.translations[key];
            });

            // Плейсхолдеры в инпутах (для формы отзывов)
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (window.translations[key]) el.setAttribute('placeholder', window.translations[key]);
            });

            document.getElementById('langCurrent').textContent = lang.toUpperCase();
            document.querySelectorAll('.lang-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-lang') === lang);
            });

            initTypewriter();
            document.dispatchEvent(new Event('languageChanged'));

        } catch (error) {
            console.error('Ошибка загрузки перевода:', error);
        }
    }

    const langBtn = document.getElementById('langBtn');
    const langPicker = document.getElementById('langPicker');
    const langList = document.getElementById('langList');

    if (langBtn) {
        langBtn.addEventListener('click', () => langPicker.classList.toggle('open'));
        langList.addEventListener('click', (e) => {
            if (e.target.classList.contains('lang-item')) {
                const newLang = e.target.getAttribute('data-lang');
                localStorage.setItem('tmr_lang', newLang);
                window.currentLang = newLang;
                loadLanguage(newLang);
                langPicker.classList.remove('open');
            }
        });
        document.addEventListener('click', (e) => {
            if (!langPicker.contains(e.target)) langPicker.classList.remove('open');
        });
    }

    loadLanguage(window.currentLang);

    // --- 2. ОСТАЛЬНЫЕ СКРИПТЫ (Preloader, Скролл, Анимации) ---
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('hide');
    }, 1000);

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const header = document.getElementById('siteHeader');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // --- 3. ПЕЧАТНАЯ МАШИНКА ---
    let typewriterTimeout;
    function initTypewriter() {
        clearTimeout(typewriterTimeout);
        const textElement = document.getElementById('typewriter');
        if (!textElement) return;

        const phrases = [
            window.translations['tw_1'], window.translations['tw_2'],
            window.translations['tw_3'], window.translations['tw_4']
        ].filter(Boolean);

        if (phrases.length === 0) return;

        let phraseIndex = 0, charIndex = 0, isDeleting = false;

        function type() {
            const currentPhrase = phrases[phraseIndex];
            if (isDeleting) {
                textElement.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                textElement.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
            }

            let typeSpeed = isDeleting ? 30 : 80;

            if (!isDeleting && charIndex === currentPhrase.length) {
                typeSpeed = 2000; isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                typeSpeed = 500;
            }
            typewriterTimeout = setTimeout(type, typeSpeed);
        }
        textElement.textContent = "";
        setTimeout(type, 500);
    }

    // --- 4. FAQ АККОРДЕОН ---
    document.querySelectorAll('.faq-item').forEach(item => {
        const btn = item.querySelector('.faq-q');
        const answer = item.querySelector('.faq-a');
        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(other => {
                other.classList.remove('open');
                other.querySelector('.faq-a').style.maxHeight = null;
            });
            if (!isOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
});