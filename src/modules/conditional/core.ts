/**
 * Conditional Module - Core Logic
 * Main condition evaluation and visibility toggling functionality
 */

import {
  getUrlParams,
  getDayOfWeek,
  parseDate,
  parseTime,
  isDateInRange,
  isTimeInRange,
  normalizeDate,
} from "./utils";

/**
 * Parses and evaluates a date condition
 * @param condition - The date condition string
 * @returns True if condition passes, false otherwise
 */
export function parseDateCondition(condition: string): boolean {
  const now = new Date();

  // Handle before: conditions
  if (condition.startsWith("before:")) {
    const value = condition.substring(7);
    const targetDate = parseDate(value);
    if (!targetDate) return false;
    // If targetDate includes time, compare with full datetime, otherwise compare dates only
    // Check for space-separated time (YYYY-MM-DD HH:MM) or ISO format (YYYY-MM-DDTHH:MM)
    const hasTime = /\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(value);
    if (hasTime) {
      return now < targetDate;
    }
    return normalizeDate(now) < normalizeDate(targetDate);
  }

  // Handle after: conditions
  if (condition.startsWith("after:")) {
    const value = condition.substring(6);
    const targetDate = parseDate(value);
    if (!targetDate) return false;
    // If targetDate includes time, compare with full datetime, otherwise compare dates only
    const hasTime = /\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(value);
    if (hasTime) {
      return now > targetDate;
    }
    return normalizeDate(now) > normalizeDate(targetDate);
  }

  // Handle between: conditions
  if (condition.startsWith("between:")) {
    const value = condition.substring(8);
    // Use comma as separator to avoid conflicts with time colons
    const parts = value.split(",");
    if (parts.length !== 2) return false;

    const startDate = parseDate(parts[0].trim());
    const endDate = parseDate(parts[1].trim());

    if (!startDate || !endDate) return false;

    // Check if either date includes time
    const startHasTime = /\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(parts[0]);
    const endHasTime = /\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(parts[1]);

    if (startHasTime || endHasTime) {
      // Use full datetime comparison
      return isDateInRange(now, startDate, endDate);
    }
    // Use date-only comparison
    return isDateInRange(normalizeDate(now), normalizeDate(startDate), normalizeDate(endDate));
  }

  // Handle on: conditions
  if (condition.startsWith("on:")) {
    const value = condition.substring(3);
    const targetDate = parseDate(value);
    if (!targetDate) return false;
    // If targetDate includes time, compare with full datetime, otherwise compare dates only
    const hasTime = /\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(value);
    if (hasTime) {
      // For datetime, compare within the same minute
      const nowMinutes = now.getTime() - (now.getTime() % 60000);
      const targetMinutes = targetDate.getTime() - (targetDate.getTime() % 60000);
      return nowMinutes === targetMinutes;
    }
    return normalizeDate(now).getTime() === normalizeDate(targetDate).getTime();
  }

  return false;
}

/**
 * Parses and evaluates a time condition
 * @param condition - The time condition string
 * @returns True if condition passes, false otherwise
 */
export function parseTimeCondition(condition: string): boolean {
  const now = new Date();

  // Handle before: conditions
  if (condition.startsWith("before:")) {
    const value = condition.substring(7);
    const targetTime = parseTime(value);
    if (!targetTime) return false;
    return isTimeInRange(now, undefined, targetTime);
  }

  // Handle after: conditions
  if (condition.startsWith("after:")) {
    const value = condition.substring(6);
    const targetTime = parseTime(value);
    if (!targetTime) return false;
    return isTimeInRange(now, targetTime, undefined);
  }

  // Handle between: conditions
  if (condition.startsWith("between:")) {
    const value = condition.substring(8);
    // Use comma as separator to avoid conflicts with time colons
    const parts = value.split(",");
    if (parts.length !== 2) return false;

    const startTime = parseTime(parts[0].trim());
    const endTime = parseTime(parts[1].trim());

    if (!startTime || !endTime) return false;
    return isTimeInRange(now, startTime, endTime);
  }

  // Handle day: conditions
  if (condition.startsWith("day:")) {
    const value = condition.substring(4);
    const currentDay = getDayOfWeek();

    // Handle weekday/weekend
    if (value === "weekday") {
      return ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(currentDay);
    }
    if (value === "weekend") {
      return ["saturday", "sunday"].includes(currentDay);
    }

    // Handle specific days (pipe-separated)
    const days = value.split("|").map((d) => d.trim().toLowerCase());
    return days.includes(currentDay);
  }

  return false;
}

/**
 * Parses and evaluates a URL parameter condition
 * @param condition - The URL condition string
 * @returns True if condition passes, false otherwise
 */
export function parseUrlCondition(condition: string): boolean {
  if (!condition.startsWith("param:")) {
    return false;
  }

  const value = condition.substring(6);
  const params = getUrlParams();

  // Handle negation (!key)
  if (value.startsWith("!")) {
    const key = value.substring(1);
    return !params.has(key);
  }

  // Handle key!=value
  if (value.includes("!=")) {
    const [key, expectedValue] = value.split("!=");
    const paramValue = params.get(key);
    return paramValue !== expectedValue;
  }

  // Handle key=value
  if (value.includes("=")) {
    const [key, expectedValue] = value.split("=");
    const paramValue = params.get(key);
    return paramValue === expectedValue;
  }

  // Handle key (exists check)
  return params.has(value);
}

/** Tag names of elements that are not visible and should not count as "children" */
const INVISIBLE_CHILD_TAGS = new Set(["script", "style", "template", "link", "noscript"]);

/**
 * Returns true if the element is visible (computed style).
 * Used when the conditional element is already visible so we respect CSS/class visibility.
 */
function isElementVisible(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (INVISIBLE_CHILD_TAGS.has(tag)) return false;
  if (el.getAttribute("hidden") !== null) return false;
  try {
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0
    ) {
      return false;
    }
  } catch {
    return true;
  }
  return true;
}

/**
 * Returns true if the element counts as present using only its own state (no getComputedStyle).
 * Used when the conditional element is hidden so we can still count children and re-show it.
 */
function isElementCountedAsChild(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (INVISIBLE_CHILD_TAGS.has(tag)) return false;
  if (el.getAttribute("hidden") !== null) return false;
  const htmlEl = el as HTMLElement;
  if (htmlEl.style?.display === "none") return false;
  return true;
}

/**
 * Returns the number of visible children. When the conditional element is hidden we use
 * own-state-only so children still count and the parent can be shown again (avoids
 * getComputedStyle returning 'none' for descendants). When visible we use computed
 * visibility for accurate behavior. No extra layout cost when conditional is hidden.
 */
function getVisibleChildCount(el: Element, conditionalElement: HTMLElement | null): number {
  const useOwnStateOnly =
    conditionalElement?.classList.contains("conditional-hidden") &&
    (el === conditionalElement || conditionalElement.contains(el));

  const countAsVisible = useOwnStateOnly ? isElementCountedAsChild : isElementVisible;
  let count = 0;
  for (let i = 0; i < el.children.length; i++) {
    if (countAsVisible(el.children[i])) count++;
  }
  return count;
}

/**
 * Parses and evaluates a "has children" condition
 * @param element - The element the condition is on
 * @param condition - The condition string: empty/"self" = current element has children, "selector" = target has children, "self selector" = descendant has children
 * @returns True if condition passes, false otherwise
 */
export function parseChildrenCondition(element: HTMLElement, condition: string): boolean {
  const value = condition.trim();

  // Empty or "self": check if current element has visible children
  if (!value || value.toLowerCase() === "self") {
    return getVisibleChildCount(element, element) > 0;
  }

  // "self selector": check if a descendant of current element matches and has visible children
  const selfPrefix = "self ";
  if (value.toLowerCase().startsWith(selfPrefix)) {
    const selector = value.slice(selfPrefix.length).trim();
    if (!selector) return false;
    const target = element.querySelector(selector);
    return target !== null && getVisibleChildCount(target, element) > 0;
  }

  // Otherwise: selector relative to document (like data-required-children)
  const target = document.querySelector(value);
  return target !== null && getVisibleChildCount(target, element) > 0;
}

/**
 * Evaluates all conditions for an element
 * @param element - The element to evaluate conditions for
 * @returns True if all conditions pass, false otherwise
 */
export function evaluateConditions(element: HTMLElement): boolean {
  const dateAttr = element.dataset.conditionalDate?.trim();
  const urlAttr = element.dataset.conditionalUrl?.trim();
  const childrenAttr = element.dataset.conditionalChildren?.trim();

  const dateConditions = dateAttr
    ? dateAttr
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];
  const urlConditions = urlAttr
    ? urlAttr
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];
  const childrenConditions = childrenAttr
    ? childrenAttr
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];

  // Evaluate date/time conditions (date and time conditions mixed together)
  if (dateConditions.length > 0) {
    const dateResults = dateConditions.map((cond) => {
      // Determine if condition is date or time based on patterns
      // Date patterns: before:/after:/between:/on: with dates (YYYY-MM-DD)
      // Time patterns: before:/after:/between: with times (HH:MM), or day:

      // Check for time-specific patterns first (day: or HH:MM format)
      const isTimePattern =
        cond.startsWith("day:") || cond.match(/^(before|after|between):\d{1,2}:\d{2}/); // HH:MM format

      if (isTimePattern) {
        return parseTimeCondition(cond);
      }

      // Otherwise try as date condition
      return parseDateCondition(cond);
    });
    if (!dateResults.some((result) => result)) {
      return false;
    }
  }

  // Evaluate URL conditions (OR logic between pipes)
  if (urlConditions.length > 0) {
    const urlResults = urlConditions.map((cond) => parseUrlCondition(cond));
    if (!urlResults.some((result) => result)) {
      return false;
    }
  }

  // Evaluate children conditions (OR logic between pipes)
  if (childrenConditions.length > 0) {
    const childrenResults = childrenConditions.map((cond) => parseChildrenCondition(element, cond));
    if (!childrenResults.some((result) => result)) {
      return false;
    }
  }

  // All condition types must pass (AND logic between types)
  return true;
}

/**
 * Applies visibility to an element based on condition evaluation
 * @param element - The element to show/hide
 */
export function applyConditionalVisibility(element: HTMLElement): void {
  const conditionsPass = evaluateConditions(element);
  const mode = element.dataset.conditionalMode || "show";
  const shouldShow = mode === "show" ? conditionsPass : !conditionsPass;

  if (shouldShow) {
    element.style.removeProperty("display");
    element.classList.add("conditional-active");
    element.classList.remove("conditional-hidden");
  } else {
    element.style.display = "none";
    element.classList.add("conditional-hidden");
    element.classList.remove("conditional-active");
  }
}
