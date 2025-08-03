
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('nav').classList.add('scrolled');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('overlay');
    const menuIcon = hamburger.querySelector('.material-icons');
    
    hamburger.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
        if (navLinks.classList.contains('active')) {
            menuIcon.textContent = 'close';
        } else {
            menuIcon.textContent = 'menu';
        }
    });
    
    overlay.addEventListener('click', function() {
        navLinks.classList.remove('active');
        overlay.classList.remove('active');
        menuIcon.textContent = 'menu';
    });
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            menuIcon.textContent = 'menu';
        });
    });
});