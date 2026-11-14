document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('heroTSwarm');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const magneticButton = document.getElementById('downloadBtn');
    const pointer = { x: -1000, y: -1000, active: false };
    const particles = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let previousTime = 0;

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = bounds.width;
        height = bounds.height;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const particleCount = 2400;
        const armCount = 3;
        const particlesPerArm = 680;
        const shapeScale = Math.min(width, height);
        particles.length = 0;
        for (let index = 0; index < particleCount; index++) {
            let targetX;
            let targetY;
            let hueOffset;

            if (index < armCount * particlesPerArm) {
                const arm = Math.floor(index / particlesPerArm);
                const progress = (index % particlesPerArm) / (particlesPerArm - 1);
                const angle = progress * Math.PI * 2.25 + arm * (Math.PI * 2 / armCount);
                const radius = (0.055 + progress * 0.39) * shapeScale;
                const spread = (Math.random() - 0.5) * (2 + progress * shapeScale * 0.045);
                const radialJitter = (Math.random() - 0.5) * shapeScale * 0.018;
                targetX = width / 2 + Math.cos(angle) * (radius + radialJitter) - Math.sin(angle) * spread;
                targetY = height / 2 + Math.sin(angle) * (radius + radialJitter) + Math.cos(angle) * spread;
                hueOffset = arm * 120 + progress * 80;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.sqrt(Math.random()) * shapeScale * 0.11;
                targetX = width / 2 + Math.cos(angle) * radius;
                targetY = height / 2 + Math.sin(angle) * radius;
                hueOffset = Math.random() * 360;
            }

            particles.push({
                targetX,
                targetY,
                x: targetX,
                y: targetY,
                vx: 0,
                vy: 0,
                phase: Math.random() * Math.PI * 2,
                hueOffset,
                size: 0.7 + Math.random() * 0.55
            });
        }

        draw(0);
    }

    function draw(time) {
        context.clearRect(0, 0, width, height);
        context.save();

        const delta = Math.min((time - previousTime) / 16.67 || 1, 2);
        previousTime = time;
        const pointerX = pointer.x;
        const pointerY = pointer.y;
        const radius = Math.max(64, width * 0.19);
        let nearestDistanceSquared = Infinity;

        for (const particle of particles) {
            const floatX = reducedMotion ? 0 : Math.sin(time * 0.0007 + particle.phase) * 3;
            const floatY = reducedMotion ? 0 : Math.cos(time * 0.00055 + particle.phase) * 4;
            const targetX = particle.targetX + floatX;
            const targetY = particle.targetY + floatY;

            particle.vx += (targetX - particle.x) * 0.018 * delta;
            particle.vy += (targetY - particle.y) * 0.018 * delta;

            if (pointer.active && !reducedMotion) {
                const dx = particle.x - pointerX;
                const dy = particle.y - pointerY;
                const distance = Math.hypot(dx, dy);
                if (distance > 0 && distance < radius) {
                    const force = (1 - distance / radius) * 1.8;
                    particle.vx += (dx / distance) * force * delta;
                    particle.vy += (dy / distance) * force * delta;
                }
            }

            particle.vx *= 0.86;
            particle.vy *= 0.86;
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            if (pointer.active) {
                const dx = particle.x - pointerX;
                const dy = particle.y - pointerY;
                nearestDistanceSquared = Math.min(nearestDistanceSquared, dx * dx + dy * dy);
            }
        }

        const glowRadius = Math.max(70, width * 0.22);
        const proximity = pointer.active
            ? Math.max(0, 1 - Math.sqrt(nearestDistanceSquared) / glowRadius)
            : 0;
        const colorShift = reducedMotion ? 0 : time * 0.025;
        context.shadowColor = proximity > 0.05 ? '#ff102a' : 'rgba(86, 126, 255, 0.9)';
        context.shadowBlur = 7 + proximity * 12;

        for (const particle of particles) {
            const dx = particle.x - pointerX;
            const dy = particle.y - pointerY;
            const distance = pointer.active ? Math.hypot(dx, dy) : Infinity;
            const redBlend = pointer.active ? Math.max(0, 1 - distance / glowRadius) : 0;
            const hue = ((colorShift + particle.hueOffset) % 360) * (1 - redBlend);
            const pulse = reducedMotion ? 0.95 : 0.82 + (Math.sin(time * 0.0015 + particle.phase) + 1) * 0.09;
            context.globalAlpha = Math.min(1, pulse + redBlend * 0.1);
            context.fillStyle = `hsl(${hue}, 100%, 66%)`;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            context.fill();
        }

        context.restore();
    }

    function animate(time) {
        if (!visible || reducedMotion) {
            frame = 0;
            draw(0);
            return;
        }
        draw(time);
        frame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (reducedMotion || !visible || frame) return;
        previousTime = 0;
        frame = window.requestAnimationFrame(animate);
    }

    function updatePointer(event) {
        const bounds = canvas.getBoundingClientRect();
        const margin = Math.max(70, width * 0.22);
        pointer.active = event.clientX >= bounds.left - margin && event.clientX <= bounds.right + margin &&
            event.clientY >= bounds.top - margin && event.clientY <= bounds.bottom + margin;
        pointer.x = event.clientX - bounds.left;
        pointer.y = event.clientY - bounds.top;

        if (magneticButton && pointerFine && !reducedMotion) {
            updateMagneticButton(event);
        }
        if (!reducedMotion && visible) startAnimation();
        if (reducedMotion) draw(0);
    }

    function updateMagneticButton(event) {
        const bounds = magneticButton.getBoundingClientRect();
        const closestX = Math.max(bounds.left, Math.min(event.clientX, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(event.clientY, bounds.bottom));
        const distance = Math.hypot(event.clientX - closestX, event.clientY - closestY);
        const range = 110;

        if (distance >= range) {
            magneticButton.classList.remove('is-magnetic');
            return;
        }

        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const strength = 1 - distance / range;
        const easedStrength = strength * strength * (3 - 2 * strength);
        const horizontalDirection = Math.max(-1, Math.min(1, dx / (bounds.width / 2)));
        const verticalDirection = Math.max(-1, Math.min(1, dy / (bounds.height / 2)));

        magneticButton.style.setProperty('--mag-x', `${horizontalDirection * 7 * easedStrength}px`);
        magneticButton.style.setProperty('--mag-y', `${verticalDirection * 4 * easedStrength}px`);
        magneticButton.style.setProperty('--mag-scale', `${1 + 0.2 * easedStrength}`);
        magneticButton.style.setProperty('--mag-origin', dx >= 0 ? '0%' : '100%');
        magneticButton.classList.add('is-magnetic');
    }

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', updatePointer, { passive: true });
    window.addEventListener('pointerout', event => {
        if (!event.relatedTarget) {
            pointer.active = false;
            if (magneticButton) magneticButton.classList.remove('is-magnetic');
            if (reducedMotion) draw(0);
        }
    });
    window.addEventListener('resize', resize, { passive: true });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) {
                startAnimation();
            } else if (frame) {
                window.cancelAnimationFrame(frame);
                frame = 0;
            }
        });
        observer.observe(canvas);
    }

    resize();
    startAnimation();
});
