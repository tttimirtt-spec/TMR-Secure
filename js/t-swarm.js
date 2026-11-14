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

        const mask = document.createElement('canvas');
        mask.width = Math.max(1, Math.round(width));
        mask.height = Math.max(1, Math.round(height));
        const maskContext = mask.getContext('2d', { willReadFrequently: true });
        if (!maskContext) return;

        const fontSize = Math.min(height * 0.94, width * 0.96);
        maskContext.fillStyle = '#fff';
        maskContext.font = `900 ${fontSize}px Arial, sans-serif`;
        maskContext.textAlign = 'center';
        maskContext.textBaseline = 'middle';
        maskContext.fillText('T', width / 2, height / 2);

        const image = maskContext.getImageData(0, 0, mask.width, mask.height).data;
        const targets = [];
        const step = Math.max(2, Math.round(width / 150));
        for (let y = 0; y < mask.height; y += step) {
            for (let x = 0; x < mask.width; x += step) {
                if (image[(y * mask.width + x) * 4 + 3] > 100) {
                    targets.push({ x, y });
                }
            }
        }

        const maxParticles = 2200;
        const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
        particles.length = 0;
        for (let index = 0; index < targets.length; index += stride) {
            const target = targets[index];
            particles.push({
                targetX: target.x,
                targetY: target.y,
                x: target.x,
                y: target.y,
                vx: 0,
                vy: 0,
                phase: Math.random() * Math.PI * 2,
                size: 1.8 + Math.random() * 1.2
            });
        }

        draw(0);
    }

    function draw(time) {
        context.clearRect(0, 0, width, height);
        context.save();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = '#39ff14';
        context.shadowBlur = 10;

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
        const red = Math.round(164 + (255 - 164) * proximity);
        const green = Math.round(255 + (48 - 255) * proximity);
        const blue = Math.round(138 + (48 - 138) * proximity);
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        context.shadowColor = proximity > 0.05 ? '#ff3030' : '#39ff14';
        context.shadowBlur = 6 + proximity * 22;

        for (const particle of particles) {
            const pulse = reducedMotion ? 0.72 : 0.5 + (Math.sin(time * 0.0015 + particle.phase) + 1) * 0.22;
            context.globalAlpha = Math.min(1, pulse + proximity * 0.28);
            context.font = `700 ${particle.size}px Arial, sans-serif`;
            context.fillText('T', particle.x, particle.y);
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
