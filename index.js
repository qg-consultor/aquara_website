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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
