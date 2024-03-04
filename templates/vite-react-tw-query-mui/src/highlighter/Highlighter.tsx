import clsx from "clsx";
import { Fragment, useState } from "react";
import { useEventListener, useWindowSize } from "usehooks-ts";
import { applyMarginWithinWindowBounds } from "./applyMarginToAbsolutePosition";
import { getElementAbsolutePosition } from "./getElementAbsolutePosition";
import { useWindowScroll } from "./useWindowScroll";
import { getXPath } from "./getXPath";

// const DEFAULT_MARGIN = 0;
// const DEFAULT_MARGIN = 1;
const DEFAULT_MARGIN = 3;

// TODO: use shared constant from shared
export const TOGGLE_HIGHLIGHTING = "toggle-highlighting";
const DEFAULT_HIGHLIGHTING_ENABLED =
	window.location.search.includes("highlighting");
// const DEFAULT_HIGHLIGHTING_ENABLED = true;

// KEEP IN SYNC WITH web/src/schemas/selectedElements.ts until we make shared folder
type DebugSource = {
	columnNumber: number;
	fileName: string;
	lineNumber: number;
};
type SelectedElement = {
	xpath: string;
	debugSource: DebugSource;
	rect: {
		height: number;
		width: number;
		x: number;
		y: number;
	};
};

function getDebugSource(element: HTMLElement): DebugSource | null {
	const reactFiberAttributeName = Object.keys(element).find((name) =>
		name.startsWith("__reactFiber")
	);
	if (!reactFiberAttributeName) {
		console.warn(
			"Could not find reactFiberAttributeName for element",
			element,
			Object.keys(element)
		);
		return null;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reactFiberAttributeValue = (element as any)[reactFiberAttributeName];
	if (!reactFiberAttributeValue) {
		console.warn(
			"Could not find reactFiberAttributeValue for element",
			element
		);
		return null;
	}
	const { columnNumber, fileName, lineNumber } =
		reactFiberAttributeValue._debugSource as unknown as {
			columnNumber: number;
			fileName: string;
			lineNumber: number;
		};
	return {
		columnNumber,
		fileName,
		lineNumber,
	};
}

const cache = new Map<HTMLElement, CSSStyleDeclaration>();
function getCachedComputedStyles(element: HTMLElement) {
	if (cache.has(element)) {
		return cache.get(element)!;
	}
	const computedStyle = window.getComputedStyle(element);
	cache.set(element, computedStyle);
	return computedStyle;
}

function HighlightButton({
	element,
	className,
}: {
	element: HTMLElement;
	scrollX: number;
	scrollY: number;
	className?: string;
}) {
	const { x, y, width, height } = getElementAbsolutePosition(element);
	const adjustedX = x + scrollX;
	const adjustedY = y + scrollY;
	const computedStyle = getCachedComputedStyles(element);
	let borderRadius = computedStyle.borderRadius;
	if (borderRadius === "0px") {
		const parentElement = element.parentElement;
		if (parentElement) {
			const parentComputedStyle = getCachedComputedStyles(parentElement);
			borderRadius = parentComputedStyle.borderRadius;
		}
	}
	const effectiveBorderRadius =
		borderRadius !== "0px"
			? `calc(${borderRadius} + ${DEFAULT_MARGIN - 1}px)`
			: `8px`;

	return (
		<button
			className={clsx(
				"absolute border border-dashed rounded-md border-blue-500 bg-blue-500/20 pointer-events-none cursor-default",
				className
			)}
			style={{
				borderRadius: effectiveBorderRadius,
				...applyMarginWithinWindowBounds(
					{
						x: adjustedX,
						y: adjustedY,
						width,
						height,
						// width: element.clientWidth || element.offsetWidth,
						// height: element.clientHeight || element.offsetHeight,
					},
					DEFAULT_MARGIN
				),
			}}
		></button>
	);
}

export function Highlighter() {
	const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(
		null
	);
	const [selectedElements, _setSelectedElements] = useState<Array<HTMLElement>>(
		[]
	);
	function setSelectedElements(newSelectedElements: Array<HTMLElement>) {
		_setSelectedElements(newSelectedElements);
		const selectedElements: SelectedElement[] = newSelectedElements.map(
			(el) => {
				const rect = el.getBoundingClientRect();
				const debugSource = getDebugSource(el);
				if (!debugSource) {
					throw new Error("Could not get debugSource for element");
				}
				return {
					xpath: getXPath(el),
					debugSource,
					rect: {
						height: rect.height,
						width: rect.width,
						x: rect.x,
						y: rect.y,
					},
				} satisfies SelectedElement;
			}
		);
		// emit to parent window
		if (!window.parent) {
			console.warn("no parent window");
			return;
		}
		window.parent.postMessage(
			{
				type: "set-selected-elements",
				data: {
					selectedElements,
				},
			},
			"*"
		);
	}
	const [highlightingEnabled, setHighlightingEnabled] = useState(
		DEFAULT_HIGHLIGHTING_ENABLED
	);
	const [isMouseInWindow, setIsMouseInWindow] = useState(true);
	useEventListener("mouseout", (e) => {
		if (!e.relatedTarget) {
			setIsMouseInWindow(false);
		}
	});
	useEventListener("mousemove", () => {
		setIsMouseInWindow(true);
	});

	useEventListener("message", (e) => {
		if (e.data === TOGGLE_HIGHLIGHTING) {
			setHighlightingEnabled(!highlightingEnabled);
		}
	});

	const windowScroll = useWindowScroll();
	const { width: windowWidth } = useWindowSize();
	function shouldEarlyReturn(e: Event) {
		const el = e.target as HTMLElement;
		if (!highlightingEnabled || el.getAttribute("data-scrapegpt-container")) {
			return true;
		}
		return false;
	}
	useEventListener("mousemove", (e) => {
		if (shouldEarlyReturn(e)) return;
		const el = e.target as HTMLElement;
		if (el) {
			setHoveredElement(el as HTMLElement);
		}
	});
	useEventListener("mousedown", (e) => {
		if (shouldEarlyReturn(e)) return;
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		document.body.style.userSelect = "none";
	});
	useEventListener("mouseup", (e) => {
		if (shouldEarlyReturn(e)) return;
		document.body.style.userSelect = "";
	});
	useEventListener(
		"click",
		(e) => {
			if (shouldEarlyReturn(e)) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			const alreadySelected = selectedElements.includes(
				e.target as HTMLElement
			);
			if (alreadySelected) {
				setSelectedElements(selectedElements.filter((el) => el !== e.target));
				return;
			}
			const el = e.target as HTMLElement;
			const selectedElementsContainedInEl = selectedElements.filter((el2) =>
				el.contains(el2)
			);
			const selectedElementsThatAreParentsOfEl = selectedElements.filter(
				(el2) => el2.contains(el)
			);
			const newSelectedElements = [...selectedElements, el].filter(
				(el) =>
					!selectedElementsContainedInEl.includes(el) &&
					!selectedElementsContainedInEl.some((el2) => el2.contains(el)) &&
					!selectedElementsThatAreParentsOfEl.includes(el) &&
					!selectedElementsThatAreParentsOfEl.some((el2) => el.contains(el2))
			);
			setSelectedElements(newSelectedElements);
		},
		undefined,
		{ capture: true }
	);
	useEventListener("click", (e) => {
		if (shouldEarlyReturn(e)) return;
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	});
	const isHoveredElementAlreadySelected =
		hoveredElement instanceof HTMLElement &&
		selectedElements.includes(hoveredElement);

	if (!highlightingEnabled) {
		return null;
	}

	return (
		// When user scrolls/resizes window, we need to reposition the highlighter. Height doesn't matter, but width does.
		<Fragment key={`${windowScroll.x}.${windowScroll.y}.${windowWidth}`}>
			{isMouseInWindow &&
				hoveredElement &&
				!isHoveredElementAlreadySelected && (
					<HighlightButton
						element={hoveredElement}
						scrollX={windowScroll.x}
						scrollY={windowScroll.y}
					/>
				)}

			{selectedElements.map((el, i) => (
				<HighlightButton
					key={i}
					element={el}
					className="border-2"
					scrollX={windowScroll.x}
					scrollY={windowScroll.y}
				/>
			))}
		</Fragment>
	);
}
