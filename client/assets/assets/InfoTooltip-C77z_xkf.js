import{r,j as e,a as c}from"./index-hG2jpHhE.js";function f({text:a}){const[n,o]=r.useState(null),s=r.useRef(null);function i(){var l;const t=(l=s.current)==null?void 0:l.getBoundingClientRect();t&&o({top:t.top,left:t.left+t.width/2})}function u(){o(null)}return e.jsxs(e.Fragment,{children:[e.jsx("span",{ref:s,onMouseEnter:i,onMouseLeave:u,className:`inline-flex items-center justify-center w-4 h-4 rounded-full
 bg-blue-900/60 text-blue-400 text-[10px] font-bold font-display cursor-help leading-none
 hover:bg-blue-800 transition-colors select-none
 align-middle ml-1.5`,children:"i"}),n&&c.createPortal(e.jsxs("div",{style:{position:"fixed",top:n.top-10,left:n.left,transform:"translate(-50%, -100%)",zIndex:2147483647,pointerEvents:"none"},className:`w-72 p-3 rounded-xl shadow-2xl
 bg-surface-container-lowest text-gray-200 text-xs leading-relaxed`,children:[e.jsx("span",{className:`absolute top-full left-1/2 -translate-x-1/2
 -4`}),a]}),document.body)]})}export{f as I};
