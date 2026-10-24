// Grab-and-drag panning for a scrolling area (the bracket): dragging scrolls the area itself and
// never the page around it. Mouse only — touch already pans natively. Starts anywhere,
// cards included: a press that moves more than a few pixels becomes a pan and the click it would
// have ended in is swallowed, so a plain click still opens a match. Elements that are draggable
// themselves (the bracket editor's slots) keep their own drag and drop.
const THRESHOLD = 4;

export function dragScroll(node: HTMLElement) {
	let startX = 0;
	let startY = 0;
	let startLeft = 0;
	let startTop = 0;
	let panning = false;

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType !== "mouse" || e.button !== 0) return;
		if ((e.target as Element).closest('[draggable="true"]') || onResizeHandle(e)) return;

		startX = e.clientX;
		startY = e.clientY;
		startLeft = node.scrollLeft;
		startTop = node.scrollTop;
		panning = false;
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp, { once: true });
	}

	// The bottom-right corner of a CSS-resizable area is the browser's resize grip.
	function onResizeHandle(e: PointerEvent) {
		if (getComputedStyle(node).resize === "none") return false;
		const rect = node.getBoundingClientRect();
		return rect.right - e.clientX < 20 && rect.bottom - e.clientY < 20;
	}

	function onPointerMove(e: PointerEvent) {
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (!panning) {
			if (Math.hypot(dx, dy) < THRESHOLD) return;
			panning = true;
			node.classList.add("panning");
			window.getSelection()?.removeAllRanges();
		}

		node.scrollLeft = startLeft - dx;
		node.scrollTop = startTop - dy;
	}

	function onPointerUp() {
		window.removeEventListener("pointermove", onPointerMove);
		if (!panning) return;
		panning = false;
		node.classList.remove("panning");
		// The release after a pan still fires a click on whatever is under the cursor.
		node.addEventListener("click", swallowClick, { capture: true, once: true });
		setTimeout(() => node.removeEventListener("click", swallowClick, { capture: true }), 0);
	}

	function swallowClick(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
	}

	node.addEventListener("pointerdown", onPointerDown);

	return {
		destroy() {
			node.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		},
	};
}
