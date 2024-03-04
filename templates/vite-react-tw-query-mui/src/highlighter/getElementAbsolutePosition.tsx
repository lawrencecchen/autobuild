export function getElementAbsolutePosition(element: HTMLElement) {
  return element.getBoundingClientRect();
  // let x = 0;
  // let y = 0;

  // while (element) {
  //   x += element.offsetLeft - element.scrollLeft + element.clientLeft;
  //   y += element.offsetTop - element.scrollTop + element.clientTop;
  //   element = element.offsetParent as HTMLElement;
  // }

  // return { x, y };
}
