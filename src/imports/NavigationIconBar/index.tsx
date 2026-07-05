import svgPaths from "./svg-o89qfq2y3f";

function Group() {
  return (
    <div className="relative shrink-0 size-[100px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <g id="Group 37">
          <g id="Ellipse 1" />
          <path d={svgPaths.p35114900} fill="var(--fill-0, white)" id="Subtract" />
        </g>
      </svg>
    </div>
  );
}

function Linke() {
  return (
    <div className="flex items-center justify-center relative shrink-0">
      <div className="-scale-y-100 flex-none rotate-180">
        <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center relative rounded-[102.041px]" data-name="Linke">
          <div aria-hidden className="absolute border-[1.02px] border-[rgba(227,227,227,0.1)] border-solid inset-0 pointer-events-none rounded-[102.041px]" />
          <Group />
        </div>
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="relative shrink-0 size-[100px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <g id="Group 37">
          <g id="Ellipse 1" />
          <g id="appointment-reminders">
            <g id="Group">
              <path d={svgPaths.p1309e680} fill="var(--fill-0, white)" id="Vector" />
              <path d={svgPaths.p2d46c980} fill="url(#paint0_linear_5_214)" id="Vector_2" />
            </g>
            <path d={svgPaths.p372f7280} fill="var(--fill-0, white)" id="Vector_3" />
          </g>
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_5_214" x1="65.459" x2="34.6448" y1="38.5846" y2="69.3987">
            <stop stopColor="white" stopOpacity="0.6" />
            <stop offset="0.4927" stopColor="white" stopOpacity="0" />
            <stop offset="0.9971" stopColor="white" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Linke1() {
  return (
    <div className="flex items-center justify-center relative shrink-0">
      <div className="-scale-y-100 flex-none rotate-180">
        <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center relative rounded-[102.041px]" data-name="Linke">
          <div aria-hidden className="absolute border-[1.02px] border-[rgba(227,227,227,0.1)] border-solid inset-0 pointer-events-none rounded-[102.041px]" />
          <Group1 />
        </div>
      </div>
    </div>
  );
}

function Group2() {
  return (
    <div className="relative shrink-0 size-[100px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <g id="Group 37">
          <g id="Ellipse 1" />
          <g id="settings">
            <path d={svgPaths.p192c1350} fill="var(--fill-0, white)" id="Subtract" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Linke2() {
  return (
    <div className="flex items-center justify-center relative shrink-0">
      <div className="-scale-y-100 flex-none rotate-180">
        <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center relative rounded-[102.041px]" data-name="Linke">
          <div aria-hidden className="absolute border-[1.02px] border-[rgba(227,227,227,0.1)] border-solid inset-0 pointer-events-none rounded-[102.041px]" />
          <Group2 />
        </div>
      </div>
    </div>
  );
}

function Group3() {
  return (
    <div className="relative shrink-0 size-[100px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <g id="Group 37">
          <g id="Ellipse 1" />
          <path d={svgPaths.p11307380} fill="var(--fill-0, white)" id="Subtract" />
        </g>
      </svg>
    </div>
  );
}

function Linke3() {
  return (
    <div className="flex items-center justify-center relative shrink-0">
      <div className="-scale-y-100 flex-none rotate-180">
        <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center relative rounded-[102.041px]" data-name="Linke">
          <div aria-hidden className="absolute border-[1.02px] border-[rgba(227,227,227,0.1)] border-solid inset-0 pointer-events-none rounded-[102.041px]" />
          <Group3 />
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-center flex flex-wrap gap-[30px] items-center relative shrink-0 w-full">
      <Linke />
      <Linke1 />
      <Linke2 />
      <Linke3 />
    </div>
  );
}

export default function NavigationIconBar() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col items-center justify-center p-[30px] relative rounded-[100px] size-full" data-name="Navigation/IconBar">
      <Frame />
    </div>
  );
}