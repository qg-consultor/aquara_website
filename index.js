document.addEventListener('DOMContentLoaded', () => {
    // --- MOBILE MENU TOGGLE ---
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
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
});
