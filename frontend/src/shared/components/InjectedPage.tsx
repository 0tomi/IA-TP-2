import { useEffect, useLayoutEffect, useRef } from "react";

type InjectedPageProps = {
  styleText: string;
  bodyHtml: string;
  bodyClassName: string;
};

export function InjectedPage({ styleText, bodyHtml, bodyClassName }: InjectedPageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-injected-page-style", bodyClassName);
    styleEl.textContent = styleText;
    document.head.appendChild(styleEl);

    const previousClassName = document.body.className;
    document.body.className = bodyClassName;

    const host = hostRef.current;
    const root = host?.parentElement;
    const injectedNodes: ChildNode[] = [];

    if (root && host) {
      const template = document.createElement("template");
      template.innerHTML = bodyHtml;
      injectedNodes.push(...Array.from(template.content.childNodes));
      injectedNodes.forEach((node) => root.insertBefore(node, host));
    }

    return () => {
      injectedNodes.forEach((node) => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
      styleEl.remove();
      document.body.className = previousClassName;
    };
  }, [bodyClassName, bodyHtml, styleText]);

  return <div ref={hostRef} data-injected-page-host="" hidden />;
}
