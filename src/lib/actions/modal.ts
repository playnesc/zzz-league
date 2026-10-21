// Turns a popup card into an accessible modal dialog. Put it on the element inside the
// `.popup` backdrop: `<div class="popup"><div class="card" use:modal={close}>…</div></div>`.
//
// - role="dialog" + aria-modal, named by the first h1/h2 inside (or `label`)
// - Escape closes, Tab stays inside, focus moves in on open and back to the opener on close
// - the backdrop closes only when both press and release land on it, so a text selection
//   that ends outside the card doesn't throw the form away
// - the page behind is scroll-locked while any modal is open

type ModalParams = (() => void) | { onclose: () => void; label?: string };

const stack: HTMLElement[] = [];

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function normalize(params: ModalParams) {
	return typeof params === "function" ? { onclose: params, label: undefined } : params;
}

export function modal(node: HTMLElement, params: ModalParams) {
	let { onclose, label } = normalize(params);
	const backdrop = node.parentElement;
	const previouslyFocused = document.activeElement as HTMLElement | null;
	let pressStartedOnBackdrop = false;

	node.setAttribute("role", "dialog");
	node.setAttribute("aria-modal", "true");
	if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");

	function applyLabel() {
		if (label) {
			node.setAttribute("aria-label", label);
			node.removeAttribute("aria-labelledby");
			return;
		}
		node.removeAttribute("aria-label");
		const heading = node.querySelector<HTMLElement>("h1, h2");
		if (heading) {
			heading.id ||= `modal-title-${Math.random().toString(36).slice(2, 9)}`;
			node.setAttribute("aria-labelledby", heading.id);
		}
	}
	applyLabel();

	stack.push(node);
	if (stack.length === 1) document.body.style.overflow = "hidden";

	const autofocusEl = node.querySelector<HTMLElement>("[autofocus]");
	(autofocusEl ?? node).focus({ preventScroll: true });

	function handleKeydown(e: KeyboardEvent) {
		if (stack[stack.length - 1] !== node) return;
		if (e.key === "Escape") {
			e.preventDefault();
			onclose();
			return;
		}
		if (e.key !== "Tab") return;
		const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
		if (items.length === 0) {
			e.preventDefault();
			node.focus();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		if (!node.contains(active)) {
			e.preventDefault();
			(e.shiftKey ? last : first).focus();
		} else if (e.shiftKey && (active === first || active === node)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function handlePointerDown(e: PointerEvent) {
		pressStartedOnBackdrop = e.target === backdrop;
	}

	function handleClick(e: MouseEvent) {
		if (pressStartedOnBackdrop && e.target === backdrop) onclose();
		pressStartedOnBackdrop = false;
	}

	window.addEventListener("keydown", handleKeydown);
	backdrop?.addEventListener("pointerdown", handlePointerDown);
	backdrop?.addEventListener("click", handleClick);

	return {
		update(next: ModalParams) {
			({ onclose, label } = normalize(next));
			applyLabel();
		},
		destroy() {
			window.removeEventListener("keydown", handleKeydown);
			backdrop?.removeEventListener("pointerdown", handlePointerDown);
			backdrop?.removeEventListener("click", handleClick);
			const i = stack.indexOf(node);
			if (i !== -1) stack.splice(i, 1);
			if (stack.length === 0) document.body.style.overflow = "";
			if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
		},
	};
}
