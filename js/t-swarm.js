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
    const hueBucketCount = 60;
    const alphaBucketCount = 3;
    const drawBuckets = Array.from(
        { length: hueBucketCount * alphaBucketCount },
        () => []
    );
    const hueStyles = Array.from(
        { length: hueBucketCount },
        (_, index) => `hsl(${index * 6}, 100%, 66%)`
    );
    const alphaLevels = [0.82, 0.91, 1];
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
        const step = Math.max(1, Math.round(width / 250));
        for (let y = 0; y < mask.height; y += step) {
            for (let x = 0; x < mask.width; x += step) {
                if (image[(y * mask.width + x) * 4 + 3] > 100) {
                    targets.push({ x, y });
                }
            }
        }

        const particleCount = 2000;
        if (targets.length === 0) return;
        particles.length = 0;
        for (let index = 0; index < particleCount; index++) {
            const target = targets[Math.floor(index * targets.length / particleCount) % targets.length];

            particles.push({
                targetX: target.x,
                targetY: target.y,
                x: target.x,
                y: target.y,
                vx: 0,
                vy: 0,
                phase: Math.random() * Math.PI * 2,
                hueOffset: Math.random() * 360,
                size: 0.7 + Math.random() * 0.55
            });
        }

        draw(0);
    }

    function draw(time) {
        context.clearRect(0, 0, width, height);
        context.save();
        for (const bucket of drawBuckets) bucket.length = 0;

        const delta = Math.min((time - previousTime) / 16.67 || 1, 2);
        previousTime = time;
        const pointerX = pointer.x;
        const pointerY = pointer.y;
        const radius = Math.max(64, width * 0.19);
        const radiusSquared = radius * radius;
        const glowRadius = Math.max(70, width * 0.22);
        const glowRadiusSquared = glowRadius * glowRadius;
        const colorShift = reducedMotion ? 0 : time * 0.025;
        let nearestDistanceSquared = Infinity;

        for (const particle of particles) {
            const floatX = reducedMotion ? 0 : Math.sin(time * 0.0007 + particle.phase) * 3;
            const floatY = reducedMotion ? 0 : Math.cos(time * 0.00055 + particle.phase) * 4;
            const targetX = particle.targetX + floatX;
            const targetY = particle.targetY + floatY;

            particle.vx += (targetX - particle.x) * 0.018 * delta;
            particle.vy += (targetY - particle.y) * 0.018 * delta;

            let distanceSquared = Infinity;
            if (pointer.active) {
                const dx = particle.x - pointerX;
                const dy = particle.y - pointerY;
                distanceSquared = dx * dx + dy * dy;
                if (!reducedMotion && distanceSquared > 0 && distanceSquared < radiusSquared) {
                    const distance = Math.sqrt(distanceSquared);
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
                distanceSquared = dx * dx + dy * dy;
                nearestDistanceSquared = Math.min(nearestDistanceSquared, distanceSquared);
            }

            const pointerBlend = pointer.active && distanceSquared < glowRadiusSquared
                ? 1 - Math.sqrt(distanceSquared / glowRadiusSquared)
                : 0;
            const baseHue = (colorShift + particle.hueOffset) % 360;
            const hue = baseHue * (1 - pointerBlend);
            const pulse = reducedMotion ? 0.95 : 0.82 + (Math.sin(time * 0.0015 + particle.phase) + 1) * 0.09;
            const alpha = Math.min(1, pulse + pointerBlend * 0.1);
            const alphaIndex = Math.min(
                alphaBucketCount - 1,
                Math.round(((alpha - 0.82) / 0.18) * (alphaBucketCount - 1))
            );
            const hueIndex = Math.round(hue / 6) % hueBucketCount;
            drawBuckets[hueIndex * alphaBucketCount + alphaIndex].push(
                particle.x,
                particle.y,
                particle.size
            );
        }

        const proximity = pointer.active && nearestDistanceSquared < glowRadiusSquared
            ? 1 - Math.sqrt(nearestDistanceSquared / glowRadiusSquared)
            : 0;
        context.shadowColor = proximity > 0.05 ? '#ff102a' : 'rgba(86, 126, 255, 0.9)';
        context.shadowBlur = 7 + proximity * 12;

        for (let hueIndex = 0; hueIndex < hueBucketCount; hueIndex++) {
            context.fillStyle = hueStyles[hueIndex];
            for (let alphaIndex = 0; alphaIndex < alphaBucketCount; alphaIndex++) {
                const bucket = drawBuckets[hueIndex * alphaBucketCount + alphaIndex];
                if (bucket.length === 0) continue;

                context.globalAlpha = alphaLevels[alphaIndex];
                context.beginPath();
                for (let index = 0; index < bucket.length; index += 3) {
                    context.moveTo(bucket[index] + bucket[index + 2], bucket[index + 1]);
                    context.arc(
                        bucket[index],
                        bucket[index + 1],
                        bucket[index + 2],
                        0,
                        Math.PI * 2
                    );
                }
                context.fill();
            }
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
