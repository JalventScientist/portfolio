let rotationModifier = 1.1; //Modifies rotation speed that is used to make the rotation async
let rotationOffset = 4937; //Creates an offset that is used to make the rotation async

(function () {
    const SHUTDOWN_EVENT = 'eye:shutdown';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        return;
    }

    const elements = Array.from(document.querySelectorAll('.breathing')).map((el, index) => {
        const style = getComputedStyle(el);
        const read = (name, fallback) => {
            const value = parseFloat(style.getPropertyValue(name));
            return Number.isFinite(value) ? value : fallback;
        };

        return {
            el,
            duration: Math.max(2200, read('--breath-duration', 4300)),
            distance: read('--breath-distance', 6),
            tilt: read('--breath-tilt', 0.55),
            baseY: read('--breath-y', 0),
            baseRot: read('--breath-base-rot', 0),
            baseScale: read('--breath-scale', 1),
            scalePulse: read('--breath-scale-pulse', 0.016),
            jitter: Math.max(0, read('--breath-jitter', 0.08)),
            seed: read('--breath-seed', (index + 1) * 1.37)
        };
    });

    if (!elements.length) {
        return;
    }

    const twoPi = Math.PI * 2;
    const smoothTan = (x) => Math.atan(Math.tan(x)) / (Math.PI / 2);
    let isBreathingActive = true;
    let animationFrameId = 0;

    const stopBreathing = () => {
        if (!isBreathingActive) {
            return;
        }

        isBreathingActive = false;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        for (const item of elements) {
            item.el.style.setProperty('--breath-anim-y', item.baseY.toFixed(3) + 'px');
            item.el.style.setProperty('--breath-anim-rot', item.baseRot.toFixed(3) + 'deg');
            item.el.style.setProperty('--breath-anim-scale', item.baseScale.toFixed(4));
        }
    };

    window.addEventListener(SHUTDOWN_EVENT, stopBreathing, { once: true });

    // Layered noise (EZCameraShake/Milkshake style)
    let lastTime = 0;
    let drift = 0;
    const animate = (time) => {
        if (!isBreathingActive) {
            return;
        }

        // Add a little random drift for extra organic feel
        if (time - lastTime > 80) {
            drift += (Math.random() - 0.5) * 0.04;
            drift = Math.max(-1, Math.min(1, drift));
            lastTime = time;
        }
        for (const item of elements) {
            // Layered sine waves for smooth, non-repetitive motion
            const t = (time / item.duration) + item.seed;
            const n1 = Math.sin(t * twoPi);
            const n2 = Math.sin(t * twoPi * 0.47 + item.seed * 0.83);
            const n3 = Math.sin(t * twoPi * 0.23 - item.seed * 0.35);
            const n4 = Math.sin(t * twoPi * 0.11 + item.seed * 1.77);
            const n5 = Math.sin(t * twoPi * 0.07 - item.seed * 2.11);
            // Blend for vertical (breath)
            const breath = (0.55 * n1) + (0.22 * n2) + (0.13 * n3) + (0.07 * n4) + (0.03 * n5) + (0.04 * drift);
            // Rotation: use a different blend and speed, plus offset
            const rotT = (time * 0.001 * rotationModifier) + (rotationOffset * 0.0001) + item.seed * 1.11;
            const r1 = Math.sin(rotT);
            const r2 = Math.sin(rotT * 0.62 + item.seed * 0.53);
            const r3 = Math.sin(rotT * 0.29 - item.seed * 0.17);
            const rotWave = (0.66 * r1) + (0.24 * r2) + (0.1 * r3);
            // Scale: subtle, tied to breath
            const scale = item.baseScale * (1 + (item.scalePulse * ((0.62 * n1) + (0.38 * n2))));
            // Jitter: subtle, non-repetitive
            const jitterWave = n3 * item.jitter;
            // Final values
            const y = item.baseY + (item.distance * breath) + (item.distance * 0.18 * jitterWave);
            const rot = item.baseRot + (item.tilt * rotWave);
            item.el.style.setProperty('--breath-anim-y', y.toFixed(3) + 'px');
            item.el.style.setProperty('--breath-anim-rot', rot.toFixed(3) + 'deg');
            item.el.style.setProperty('--breath-anim-scale', scale.toFixed(4));
        }
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
})();
