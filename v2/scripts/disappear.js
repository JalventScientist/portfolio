(() => {
    const welcomeText = document.getElementById('welcometext');
    if (!welcomeText) return;

    window.addEventListener('eye:shutdown', () => {
        welcomeText.style.transition = 'opacity 600ms ease-in, filter 600ms ease-in';
        welcomeText.style.opacity = '0';
        welcomeText.style.filter = 'blur(12px)';
    }, { once: true });
})();
