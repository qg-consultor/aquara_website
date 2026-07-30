import waterSoundPath from './SECCIONES/HERO/water_sound_effect.mp3';

function init() {
    // --- ENTER EXPERIENCE OVERLAY ---
    const enterOverlay = document.getElementById('enter-overlay');
    const enterBtn = document.getElementById('enter-btn');
    const enterLoader = document.getElementById('enter-loader');
    
    // Fake loading delay to show loader then reveal button
    setTimeout(() => {
        if (enterLoader) enterLoader.classList.add('hide');
        if (enterBtn) enterBtn.classList.add('show');
    }, 2000); // 2 second loading animation
    
    // --- HOVER SOUND EFFECT (Global to this scope so it can be unlocked) ---
    const hoverSound = new Audio(waterSoundPath);
    hoverSound.volume = 0.4;

    if (enterBtn && enterOverlay) {
        enterBtn.addEventListener('click', () => {
            // Unlock audio on trusted click event
            hoverSound.play().then(() => {
                hoverSound.pause();
                hoverSound.currentTime = 0;
            }).catch(e => console.log('Silent audio unlock error:', e));

            // Fade out overlay
            enterOverlay.classList.add('fade-out');
            
            // Remove from DOM after transition
            setTimeout(() => {
                enterOverlay.remove();
            }, 1200);
        });
    }

    // --- MOBILE MENU TOGGLE ---
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('.navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when link is clicked
        const links = navMenu.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // --- NAVBAR SCROLL EFFECT ---
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(7, 11, 19, 0.85)';
                navbar.style.borderBottom = '1px solid rgba(0, 242, 254, 0.2)';
                navbar.style.padding = '0.75rem 2rem';
            } else {
                navbar.style.background = 'var(--bg-card)';
                navbar.style.borderBottom = '1px solid var(--border-glass)';
                navbar.style.padding = '1rem 2rem';
            }
        });
    }

    // --- INTERSECTION OBSERVER ANIMATIONS ---
    const featureCards = document.querySelectorAll('.feature-card');
    if (featureCards.length > 0) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Animating once
                }
            });
        }, observerOptions);

        featureCards.forEach(card => {
            observer.observe(card);
        });
    }

    // --- ABOUT SECTION ANIMATIONS ON SCROLL ---
    const aboutText = document.querySelector('.about-section__text');
    const aboutImage = document.querySelector('.about-section__image');

    if (aboutText && aboutImage) {
        const aboutObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        aboutObserver.observe(aboutText);
        aboutObserver.observe(aboutImage);
    }

    // --- BOOKING FORM HANDLER ---
    const bookingForm = document.getElementById('booking-form');
    const successBanner = document.getElementById('success-banner');

    if (bookingForm && successBanner) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Simulate form submission animation
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Enviando...';
                submitBtn.disabled = true;

                setTimeout(() => {
                    // Hide form, show success banner with animation
                    bookingForm.style.display = 'none';
                    successBanner.style.display = 'block';
                    
                    // Optional log
                    console.log(`Reserva de: ${document.getElementById('name')?.value} (${document.getElementById('email')?.value}) para ${document.getElementById('plan')?.value}`);
                }, 1000);
            }
        });
    }

    // --- SERVICES CARDS STAGGERED ANIMATION ---
    const serviceCards = document.querySelectorAll('.service-card');
    if (serviceCards.length > 0) {
        const servicesObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Get the index to stagger the animation delay
                    const index = Array.from(serviceCards).indexOf(entry.target);
                    // Add delay (e.g. 150ms per card)
                    entry.target.style.transitionDelay = `${index * 0.15}s`;
                    
                    // Small timeout to allow transition delay to apply before adding class
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }, 50);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        serviceCards.forEach(card => {
            servicesObserver.observe(card);
        });
    }

    const menuLinks = document.querySelectorAll('.navMenu a');
    if (menuLinks.length > 0) {
        menuLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                // Reset to 0 to allow rapid re-playing
                hoverSound.currentTime = 0;
                hoverSound.play().catch(e => {
                    console.error('Audio play error:', e);
                });
            });
        });
    }

    // --- UI SOUND SYNTHESIZER ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playUiClick = () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        // A very high, short blip (futuristic click)
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    };

    // --- SOLUTIONS INTERACTIVE PANEL ---
    const solutionItems = document.querySelectorAll('.solution-item');
    const solutionContents = document.querySelectorAll('.solution-content');
    const solutionsDisplay = document.querySelector('.solutions-display');

    if (solutionItems.length > 0 && solutionContents.length > 0) {
        solutionItems.forEach(item => {
            // Play subtle digital UI click on hover
            item.addEventListener('mouseenter', () => {
                playUiClick();
            });

            item.addEventListener('click', () => {
                // Remove active class from all items and contents
                solutionItems.forEach(i => i.classList.remove('active'));
                solutionContents.forEach(c => c.classList.remove('active'));

                // Add active to clicked item
                item.classList.add('active');

                // Add active to matching content
                const targetId = item.getAttribute('data-target');
                if (solutionsDisplay && targetId) {
                    solutionsDisplay.setAttribute('data-solution', targetId);
                }

                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    // Force reflow to restart CSS animation (fadeInTab)
                    targetContent.style.animation = 'none';
                    targetContent.offsetHeight; /* trigger reflow */
                    targetContent.style.animation = null; 
                    
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // --- STATS COUNTER ANIMATION ---
    const counters = document.querySelectorAll('.counter');
    if (counters.length > 0) {
        const speed = 100; // The lower the slower
        
        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = +counter.getAttribute('data-target');
                    
                    const updateCount = () => {
                        const count = +counter.innerText;
                        const inc = target / speed;
                        
                        if (count < target) {
                            counter.innerText = Math.ceil(count + inc);
                            setTimeout(updateCount, 15);
                        } else {
                            counter.innerText = target;
                        }
                    };
                    updateCount();
                    observer.unobserve(counter); // Only animate once
                }
            });
        }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });
        
        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }

    // --- INNOVATION SECTION: SIDEBAR NAV + AUTO-ROTATE ---
    const innoNavItems = document.querySelectorAll('.inno-nav__item');
    const innoPanels = document.querySelectorAll('.inno-panel__content');
    const INNO_DURATION = 5000; // ms per slide

    if (innoNavItems.length && innoPanels.length) {
        let currentIndex = 0;
        let autoTimer = null;
        let isPaused = false;

        // Set CSS variable for progress bar duration
        document.querySelectorAll('.inno-nav__item').forEach(btn => {
            btn.style.setProperty('--inno-duration', INNO_DURATION + 'ms');
        });

        function activateTech(index) {
            const items = [...innoNavItems];
            const panels = [...innoPanels];

            // Deactivate all
            items.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Activate target
            items[index].classList.add('active');
            panels[index].classList.add('active');
            currentIndex = index;

            // Restart progress bar animation by forcing reflow
            const activeItem = items[index];
            activeItem.style.animation = 'none';
            activeItem.offsetHeight; // trigger reflow
            activeItem.style.animation = '';
        }

        function startAutoRotate() {
            clearInterval(autoTimer);
            autoTimer = setInterval(() => {
                if (!isPaused) {
                    const next = (currentIndex + 1) % innoNavItems.length;
                    activateTech(next);
                }
            }, INNO_DURATION);
        }

        // Click handler
        innoNavItems.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                activateTech(index);
                // Restart timer so it doesn't immediately advance
                startAutoRotate();
            });
        });

        // Pause on hover over the entire section
        const innoSection = document.getElementById('innovacion');
        if (innoSection) {
            innoSection.addEventListener('mouseenter', () => { isPaused = true; });
            innoSection.addEventListener('mouseleave', () => { isPaused = false; });
        }

        // Start
        startAutoRotate();
    }

    // --- CONTACT MODAL INTERACTION ---
    function initContactModal() {
        const backdrop = document.getElementById('contact-backdrop');
        const modal = document.getElementById('contact-modal');
        const closeBtn = document.getElementById('contact-modal-close');
        const contactForm = document.getElementById('aquara-contact-form');
        const formContainer = document.getElementById('contact-form-container');
        const successContainer = document.getElementById('contact-success-container');
        const successCloseBtn = document.getElementById('contact-success-close');
        const formStatus = document.getElementById('contact-form-status');
        let contactStartedAt = Date.now();

        if (!backdrop || !modal) return;

        function openModal(service = 'general') {
            if (contactForm) contactForm.reset();
            contactStartedAt = Date.now();
            if (formStatus) {
                formStatus.textContent = '';
                formStatus.classList.remove('is-error');
            }
            if (formContainer) formContainer.style.display = 'block';
            if (successContainer) successContainer.style.display = 'none';

            const serviceSelect = document.getElementById('contact-service');
            if (serviceSelect && service) {
                const optionExists = Array.from(serviceSelect.options).some(opt => opt.value === service);
                if (optionExists) {
                    serviceSelect.value = service;
                } else {
                    serviceSelect.value = 'general';
                }
            }

            backdrop.classList.add('active');
            backdrop.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            backdrop.classList.remove('active');
            backdrop.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // Event listener delegation for all CTA triggers
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-open-contact]');
            if (trigger) {
                e.preventDefault();
                const service = trigger.getAttribute('data-service') || 'general';
                openModal(service);
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (successCloseBtn) successCloseBtn.addEventListener('click', closeModal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && backdrop.classList.contains('active')) {
                closeModal();
            }
        });

        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!contactForm.checkValidity()) {
                    contactForm.reportValidity();
                    return;
                }

                const submitButton = contactForm.querySelector('button[type="submit"]');
                const submitLabel = submitButton?.querySelector('span');
                const originalLabel = submitLabel?.textContent || 'ENVIAR MENSAJE';

                if (submitButton) submitButton.disabled = true;
                if (submitLabel) submitLabel.textContent = 'ENVIANDO...';
                if (formStatus) {
                    formStatus.textContent = '';
                    formStatus.classList.remove('is-error');
                }

                const formData = new FormData(contactForm);
                const payload = Object.fromEntries(formData.entries());
                payload.startedAt = contactStartedAt;

                try {
                    const response = await fetch('/send-contact.php', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json().catch(() => ({
                        ok: false,
                        message: 'No pudimos procesar la respuesta del servidor.'
                    }));

                    if (!response.ok || !result.ok) {
                        throw new Error(result.message || 'No pudimos enviar tu mensaje.');
                    }

                    if (formContainer && successContainer) {
                        formContainer.style.display = 'none';
                        successContainer.style.display = 'block';
                    }
                } catch (error) {
                    if (formStatus) {
                        formStatus.textContent = error.message || 'No pudimos enviar tu mensaje. Escríbenos a hola@aquaraws.com.';
                        formStatus.classList.add('is-error');
                    }
                } finally {
                    if (submitButton) submitButton.disabled = false;
                    if (submitLabel) submitLabel.textContent = originalLabel;
                }
            });
        }
    }

    initContactModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/* =======================================================
   KURITA - VIDEO MODAL, FILTERS & CAROUSEL
   ======================================================= */
(function initKurita() {
    // -- Modal logic
    const modal    = document.getElementById('video-modal');
    const iframe   = document.getElementById('vmodal-iframe');
    const closeBtn = document.getElementById('vmodal-close');

    function openModal(videoUrl, videoId) {
        if (!modal || !iframe) return;
        if (videoUrl) {
            iframe.src = videoUrl;
        } else if (videoId) {
            iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
        }
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal || !iframe) return;
        modal.classList.remove('open');
        iframe.src = '';
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

    // -- Featured triggers
    var featuredTrigger = document.getElementById('featured-video-trigger');
    if (featuredTrigger) featuredTrigger.addEventListener('click', function() { openModal(featuredTrigger.dataset.videoUrl, featuredTrigger.dataset.videoId); });

    var featuredCta = document.getElementById('featured-play-cta');
    if (featuredCta) featuredCta.addEventListener('click', function() { openModal(featuredCta.dataset.videoUrl, featuredCta.dataset.videoId); });

    // -- Card triggers
    document.querySelectorAll('.vlog-card').forEach(function(card) {
        card.addEventListener('click', function() { openModal(card.dataset.videoUrl, card.dataset.videoId); });
    });

    // -- Filter chips
    var filterBtns = document.querySelectorAll('.kfilter-btn');
    var vlogCards  = document.querySelectorAll('.vlog-card');

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var filter = btn.dataset.filter;
            vlogCards.forEach(function(card) {
                if (filter === 'all' || card.dataset.filter === filter) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
            currentIndex = 0;
            updateCarousel();
        });
    });

    // -- Carousel
    var track   = document.getElementById('kurita-track');
    var prevBtn = document.getElementById('kurita-prev');
    var nextBtn = document.getElementById('kurita-next');
    var CARD_W  = 300;
    var currentIndex = 0;

    function getVisibleCards() {
        return track ? Array.from(track.querySelectorAll('.vlog-card:not(.hidden)')) : [];
    }

    function updateCarousel() {
        if (!track) return;
        var wrapWidth = track.parentElement ? track.parentElement.offsetWidth : 0;
        var visibleCount = Math.floor(wrapWidth / CARD_W) || 1;
        var cards = getVisibleCards();
        var maxIndex = Math.max(0, cards.length - visibleCount);
        currentIndex = Math.min(Math.max(0, currentIndex), maxIndex);
        track.style.transform = 'translateX(-' + (currentIndex * CARD_W) + 'px)';
    }

    if (prevBtn) prevBtn.addEventListener('click', function() { currentIndex = Math.max(0, currentIndex - 1); updateCarousel(); });
    if (nextBtn) nextBtn.addEventListener('click', function() {
        var cards = getVisibleCards();
        var wrapWidth = track && track.parentElement ? track.parentElement.offsetWidth : 0;
        var visibleCount = Math.floor(wrapWidth / CARD_W) || 1;
        currentIndex = Math.min(currentIndex + 1, Math.max(0, cards.length - visibleCount));
        updateCarousel();
    });

    window.addEventListener('resize', updateCarousel);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCarousel);
    } else {
        updateCarousel();
    }
})();
