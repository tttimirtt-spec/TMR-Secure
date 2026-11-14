document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('heroTSwarm');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

        const fontSize = Math.min(height * 0.79, width * 0.82);
        maskContext.fillStyle = '#fff';
        maskContext.font = `900 ${fontSize}px Arial, sans-serif`;
        maskContext.textAlign = 'center';
        maskContext.textBaseline = 'middle';
        maskContext.fillText('T', width / 2, height / 2);

        const image = maskContext.getImageData(0, 0, mask.width, mask.height).data;
        const targets = [];
        const step = Math.max(4, Math.round(width / 90));
        for (let y = 0; y < mask.height; y += step) {
            for (let x = 0; x < mask.width; x += step) {
                if (image[(y * mask.width + x) * 4 + 3] > 100) {
                    targets.push({ x, y });
                }
            }
        }

        const maxParticles = 460;
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
                size: 2 + Math.random() * 1.5
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

        for (const particle of particles) {
            const floatX = Math.sin(time * 0.0007 + particle.phase) * 3;
            const floatY = Math.cos(time * 0.00055 + particle.phase) * 4;
            const targetX = particle.targetX + floatX;
            const targetY = particle.targetY + floatY;

            particle.vx += (targetX - particle.x) * 0.018 * delta;
            particle.vy += (targetY - particle.y) * 0.018 * delta;

            if (pointer.active) {
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

            context.globalAlpha = 0.5 + (Math.sin(time * 0.0015 + particle.phase) + 1) * 0.22;
            context.font = `700 ${particle.size}px Arial, sans-serif`;
            context.fillStyle = '#a4ff8a';
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
        pointer.active = event.clientX >= bounds.left && event.clientX <= bounds.right &&
            event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        pointer.x = event.clientX - bounds.left;
        pointer.y = event.clientY - bounds.top;
        if (!reducedMotion && visible) startAnimation();
    }

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', updatePointer, { passive: true });
    window.addEventListener('pointerout', event => {
        if (!event.relatedTarget) pointer.active = false;
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
