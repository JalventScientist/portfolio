(() => {
	const eyeStack = document.getElementById("eye-stack");
	const eyeBase = document.getElementById("eye-base");
	const eyePupil = document.getElementById("eye-pupil");
	const pupilImage = eyePupil ? eyePupil.querySelector(".pupil-image") : null;
	const SHUTDOWN_EVENT = "eye:shutdown";
	const REDIRECT_DELAY_MS = 1700;
	const RECENTER_DURATION_MS = 100;
	const PANIC_DURATION_MS = 920;
	const PANIC_START_SCALE = 1;
	const PANIC_END_SCALE = 0.32;
	const PANIC_BASE_AMPLITUDE = 0.9;
	const PANIC_MAX_AMPLITUDE = 12;

	if (!eyeStack || !eyeBase || !eyePupil) {
		return;
	}

	const state = {
		eyeX: 0,
		eyeY: 0,
		pupilX: 0,
		pupilY: 0,
		targetX: 0,
		targetY: 0
	};

	const movement = {
		eyeMax: 8,
		pupilMax: 35,
		smoothness: 0.17
	};

	let isTrackingActive = true;
	let animationFrameId = 0;

	const applyLookOffsets = (eyeX, eyeY, pupilX, pupilY) => {
		eyeBase.style.setProperty("--look-x", `${eyeX.toFixed(2)}px`);
		eyeBase.style.setProperty("--look-y", `${eyeY.toFixed(2)}px`);
		eyePupil.style.setProperty("--look-x", `${pupilX.toFixed(2)}px`);
		eyePupil.style.setProperty("--look-y", `${pupilY.toFixed(2)}px`);
	};

	const setTargetFromPoint = (x, y) => {
		const rect = eyeStack.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;

		const dx = x - cx;
		const dy = y - cy;
		const radius = Math.max(rect.width, rect.height) * 0.5;

		if (radius <= 0) {
			state.targetX = 0;
			state.targetY = 0;
			return;
		}

		let nx = dx / radius;
		let ny = dy / radius;
		const magnitude = Math.hypot(nx, ny);
		if (magnitude > 1) {
			nx /= magnitude;
			ny /= magnitude;
		}

		state.targetX = nx;
		state.targetY = ny;
	};

	const animate = () => {
		if (!isTrackingActive) {
			return;
		}

		state.eyeX += ((state.targetX * movement.eyeMax) - state.eyeX) * movement.smoothness;
		state.eyeY += ((state.targetY * movement.eyeMax) - state.eyeY) * movement.smoothness;
		state.pupilX += ((state.targetX * movement.pupilMax) - state.pupilX) * movement.smoothness;
		state.pupilY += ((state.targetY * movement.pupilMax) - state.pupilY) * movement.smoothness;

		applyLookOffsets(state.eyeX, state.eyeY, state.pupilX, state.pupilY);

		animationFrameId = requestAnimationFrame(animate);
	};

	const onMouseMove = (event) => {
		if (!isTrackingActive) {
			return;
		}
		setTargetFromPoint(event.clientX, event.clientY);
	};

	const onTouchMove = (event) => {
		if (!isTrackingActive) {
			return;
		}

		const touch = event.touches[0];
		if (!touch) {
			return;
		}
		setTargetFromPoint(touch.clientX, touch.clientY);
	};

	const onMouseLeave = () => {
		state.targetX = 0;
		state.targetY = 0;
	};

	const stopTracking = () => {
		if (!isTrackingActive) {
			return;
		}

		isTrackingActive = false;
		state.targetX = 0;
		state.targetY = 0;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}

		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("touchmove", onTouchMove);
		window.removeEventListener("mouseleave", onMouseLeave);
	};

	const tweenToCenter = (onComplete) => {
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReducedMotion) {
			state.eyeX = 0;
			state.eyeY = 0;
			state.pupilX = 0;
			state.pupilY = 0;
			applyLookOffsets(0, 0, 0, 0);
			onComplete();
			return;
		}

		const startEyeX = state.eyeX;
		const startEyeY = state.eyeY;
		const startPupilX = state.pupilX;
		const startPupilY = state.pupilY;
		const startTime = performance.now();

		const recenterStep = (now) => {
			const progress = Math.min((now - startTime) / RECENTER_DURATION_MS, 1);
			const eased = 1 - ((1 - progress) * (1 - progress));
			const blend = 1 - eased;

			state.eyeX = startEyeX * blend;
			state.eyeY = startEyeY * blend;
			state.pupilX = startPupilX * blend;
			state.pupilY = startPupilY * blend;
			applyLookOffsets(state.eyeX, state.eyeY, state.pupilX, state.pupilY);

			if (progress < 1) {
				requestAnimationFrame(recenterStep);
				return;
			}

			state.eyeX = 0;
			state.eyeY = 0;
			state.pupilX = 0;
			state.pupilY = 0;
			applyLookOffsets(0, 0, 0, 0);
			onComplete();
		};

		requestAnimationFrame(recenterStep);
	};

	const startShutdownEffects = () => {
		if (pupilImage) {
			const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

			if (prefersReducedMotion) {
				pupilImage.style.transform = `translate(0px, 0px) scale(${PANIC_END_SCALE})`;
			} else {
				const startTime = performance.now();
				const animatePanicShudder = (now) => {
					const progress = Math.min((now - startTime) / PANIC_DURATION_MS, 1);
					const eased = progress * progress;
					const amplitude = PANIC_BASE_AMPLITUDE + ((PANIC_MAX_AMPLITUDE - PANIC_BASE_AMPLITUDE) * eased);
					const jitterX = (Math.random() * 2 - 1) * amplitude;
					const jitterY = (Math.random() * 2 - 1) * amplitude;
					const scale = PANIC_START_SCALE + ((PANIC_END_SCALE - PANIC_START_SCALE) * eased);

					pupilImage.style.transform = `translate(${jitterX.toFixed(2)}px, ${jitterY.toFixed(2)}px) scale(${scale.toFixed(3)})`;

					if (progress < 1) {
						requestAnimationFrame(animatePanicShudder);
						return;
					}

					pupilImage.style.transform = `translate(0px, 0px) scale(${PANIC_END_SCALE})`;
				};

				requestAnimationFrame(animatePanicShudder);
			}
		}

		eyePupil.classList.add("eye-pupil-shutdown");
		document.body.classList.add("eye-shutdown");
		window.dispatchEvent(new CustomEvent(SHUTDOWN_EVENT));

		window.setTimeout(() => {
			document.body.classList.add("eye-fade-out");
		}, 60);

		window.setTimeout(() => {
			window.location.href = "../index.html";
		}, REDIRECT_DELAY_MS);
	};

	const triggerShutdown = () => {
		if (window.__eyeShutdownTriggered) {
			return;
		}

		window.__eyeShutdownTriggered = true;
		stopTracking();
		tweenToCenter(startShutdownEffects);
	};

	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("touchmove", onTouchMove, { passive: true });
	window.addEventListener("mouseleave", onMouseLeave);
	window.addEventListener("pointerdown", triggerShutdown, { capture: true, once: true });

	animate();
})();
