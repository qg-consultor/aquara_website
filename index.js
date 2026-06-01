import waterSoundPath from './SECCIONES/HERO/water_sound_effect.mp3';

document.addEventListener('DOMContentLoaded', () => {
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

    // --- INTERSECTION OBSERVER ANIMATIONS ---
    const featureCards = document.querySelectorAll('.feature-card');
    
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

    // --- BOOKING FORM HANDLER ---
    const bookingForm = document.getElementById('booking-form');
    const successBanner = document.getElementById('success-banner');

    if (bookingForm && successBanner) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Simulate form submission animation
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;

            setTimeout(() => {
                // Hide form, show success banner with animation
                bookingForm.style.display = 'none';
                successBanner.style.display = 'block';
                
                // Optional log
                console.log(`Reserva de: ${document.getElementById('name').value} (${document.getElementById('email').value}) para ${document.getElementById('plan').value}`);
            }, 1000);
        });
    }
    const menuLinks = document.querySelectorAll('.navMenu a');
    menuLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            // Reset to 0 to allow rapid re-playing
            hoverSound.currentTime = 0;
            hoverSound.play().catch(e => {
                console.error('Audio play error:', e);
            });
        });
    });
});
